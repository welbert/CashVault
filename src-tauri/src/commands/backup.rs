use crate::AppState;
use rusqlite::{params, Connection, OpenFlags};
use tauri::State;

fn get_config_value(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM config WHERE key = ?1", params![key], |row| row.get(0)).ok()
}

fn set_config_value(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_backup_folder(state: State<AppState>) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    Ok(get_config_value(&conn, "backup_folder"))
}

#[tauri::command]
pub fn set_backup_folder(state: State<AppState>, path: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    set_config_value(&conn, "backup_folder", &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_backup_folder(state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM config WHERE key = 'backup_folder'", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn run_backup(state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let Some(folder) = get_config_value(&conn, "backup_folder") else {
        return Ok(());
    };
    let folder_path = std::path::PathBuf::from(&folder);
    if !folder_path.is_dir() {
        return Err(format!("Pasta de backup não encontrada: {folder}"));
    }
    let dest = folder_path.join("cashvault-backup.db");
    std::fs::copy(&state.db_path, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_backup(state: State<AppState>, path: String) -> Result<(), String> {
    let source = std::path::PathBuf::from(&path);
    if !source.is_file() {
        return Err("Arquivo de backup não encontrado.".to_string());
    }

    let check = Connection::open_with_flags(&source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Não foi possível abrir o arquivo como banco de dados: {e}"))?;
    let is_cashvault_db: bool = check
        .query_row("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'", [], |_| Ok(true))
        .unwrap_or(false);
    drop(check);
    if !is_cashvault_db {
        return Err("Esse arquivo não parece ser um backup do CashVault.".to_string());
    }

    // Fecha a conexão atual (troca por uma em memória) antes de sobrescrever o arquivo do banco,
    // já que o app vai reiniciar em seguida para reabrir o arquivo importado do zero.
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    *conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
    std::fs::copy(&source, &state.db_path).map_err(|e| e.to_string())?;
    Ok(())
}
