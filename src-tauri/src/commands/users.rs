use crate::db;
use crate::models::UserSummary;
use crate::AppState;
use rusqlite::params;
use tauri::State;

fn map_user(row: &rusqlite::Row) -> rusqlite::Result<UserSummary> {
    Ok(UserSummary {
        id: row.get(0)?,
        name: row.get(1)?,
        base_balance: row.get(2)?,
        has_password: row.get(3)?,
    })
}

const SELECT_USER: &str = "SELECT id, name, base_balance, password_hash IS NOT NULL FROM users";

#[tauri::command]
pub fn list_users(state: State<AppState>) -> Result<Vec<UserSummary>, String> {
    let conn = state.db.lock().unwrap();
    let sql = format!("{SELECT_USER} ORDER BY id");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], map_user).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_user(name: String, base_balance: Option<f64>, state: State<AppState>) -> Result<i64, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO users (name, base_balance) VALUES (?1, ?2)",
        params![trimmed, base_balance.unwrap_or(0.0)],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES ('last_active_user_id', ?1)",
        params![id.to_string()],
    )
    .map_err(|e| e.to_string())?;
    db::seed_default_tags(&conn, id)?;
    drop(conn);
    *state.active_user_id.lock().unwrap() = Some(id);
    Ok(id)
}

#[tauri::command]
pub fn get_active_profile(state: State<AppState>) -> Result<Option<UserSummary>, String> {
    let Some(user_id) = *state.active_user_id.lock().unwrap() else {
        return Ok(None);
    };
    let conn = state.db.lock().unwrap();
    let sql = format!("{SELECT_USER} WHERE id = ?1");
    match conn.query_row(&sql, params![user_id], map_user) {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn switch_active_profile(user_id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.query_row("SELECT 1 FROM users WHERE id = ?1", params![user_id], |_| Ok(()))
        .map_err(|_| "Perfil não encontrado".to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES ('last_active_user_id', ?1)",
        params![user_id.to_string()],
    )
    .map_err(|e| e.to_string())?;
    drop(conn);
    *state.active_user_id.lock().unwrap() = Some(user_id);
    Ok(())
}

#[tauri::command]
pub fn rename_user(user_id: i64, name: String, state: State<AppState>) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute("UPDATE users SET name = ?1 WHERE id = ?2", params![trimmed, user_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_user_base_balance(user_id: i64, base_balance: f64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE users SET base_balance = ?1 WHERE id = ?2",
        params![base_balance, user_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_user(user_id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM users WHERE id = ?1", params![user_id])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM config WHERE key = 'last_active_user_id' AND value = ?1",
        params![user_id.to_string()],
    )
    .map_err(|e| e.to_string())?;
    drop(conn);
    let mut active = state.active_user_id.lock().unwrap();
    if *active == Some(user_id) {
        *active = None;
    }
    Ok(())
}
