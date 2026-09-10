use crate::db;
use crate::models::Target;
use crate::AppState;
use rusqlite::params;
use tauri::State;

type RawTarget = (i64, i64, String, String, f64, bool);

fn map_target_row(row: &rusqlite::Row) -> rusqlite::Result<RawTarget> {
    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
}

fn query_raw_targets(conn: &rusqlite::Connection, user_id: i64, kind: Option<&str>) -> Result<Vec<RawTarget>, String> {
    let result: Result<Vec<RawTarget>, rusqlite::Error> = if let Some(k) = kind {
        let mut stmt = conn
            .prepare("SELECT id, user_id, kind, name, target_value, is_primary FROM targets WHERE user_id = ?1 AND kind = ?2 ORDER BY id")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id, k], map_target_row).map_err(|e| e.to_string())?;
        rows.collect()
    } else {
        let mut stmt = conn
            .prepare("SELECT id, user_id, kind, name, target_value, is_primary FROM targets WHERE user_id = ?1 ORDER BY id")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![user_id], map_target_row).map_err(|e| e.to_string())?;
        rows.collect()
    };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_targets(user_id: i64, kind: Option<String>, state: State<AppState>) -> Result<Vec<Target>, String> {
    let conn = state.db.lock().unwrap();
    let saldo = db::current_saldo(&conn, user_id)?;
    let raw = query_raw_targets(&conn, user_id, kind.as_deref())?;

    Ok(raw
        .into_iter()
        .map(|(id, user_id, kind, name, target_value, is_primary)| {
            let pct = if target_value > 0.0 {
                (saldo / target_value * 100.0).clamp(0.0, 100.0)
            } else {
                0.0
            };
            Target {
                id,
                user_id,
                kind,
                name,
                target_value,
                current_saldo: saldo,
                pct,
                remaining: saldo - target_value,
                is_primary,
            }
        })
        .collect())
}

/// Marca `id` como a meta/compra principal do seu (perfil, tipo), desmarcando
/// qualquer outra do mesmo tipo — só pode haver uma principal por tipo por vez
/// (índice parcial `idx_targets_primary` garante isso a nível de banco também).
#[tauri::command]
pub fn set_primary_target(id: i64, state: State<AppState>) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    let (user_id, kind): (i64, String) = conn
        .query_row("SELECT user_id, kind FROM targets WHERE id = ?1", params![id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|_| "Meta/compra não encontrada".to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("UPDATE targets SET is_primary = 0 WHERE user_id = ?1 AND kind = ?2", params![user_id, kind])
        .map_err(|e| e.to_string())?;
    tx.execute("UPDATE targets SET is_primary = 1 WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_target(user_id: i64, kind: String, name: String, target_value: f64, state: State<AppState>) -> Result<i64, String> {
    if kind != "goal" && kind != "purchase" {
        return Err("Tipo de meta inválido".to_string());
    }
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    if target_value <= 0.0 {
        return Err("Valor deve ser maior que zero".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO targets (user_id, kind, name, target_value) VALUES (?1, ?2, ?3, ?4)",
        params![user_id, kind, name.trim(), target_value],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_target(id: i64, name: String, target_value: f64, state: State<AppState>) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    if target_value <= 0.0 {
        return Err("Valor deve ser maior que zero".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE targets SET name = ?1, target_value = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![name.trim(), target_value, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_target(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM targets WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
