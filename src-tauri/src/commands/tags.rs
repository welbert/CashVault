use crate::models::TagWithUsage;
use crate::AppState;
use rusqlite::params;
use tauri::State;

fn map_tag(row: &rusqlite::Row) -> rusqlite::Result<TagWithUsage> {
    Ok(TagWithUsage {
        id: row.get(0)?,
        name: row.get(1)?,
        usage_count: row.get(2)?,
    })
}

fn unique_violation_message(e: rusqlite::Error) -> String {
    if e.to_string().contains("UNIQUE") {
        "Já existe uma tag com esse nome".to_string()
    } else {
        e.to_string()
    }
}

#[tauri::command]
pub fn list_tags(user_id: i64, state: State<AppState>) -> Result<Vec<TagWithUsage>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, COUNT(tt.transaction_id)
             FROM tags t
             LEFT JOIN transaction_tags tt ON tt.tag_id = t.id
             WHERE t.user_id = ?1
             GROUP BY t.id
             ORDER BY t.name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], map_tag).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_tag(user_id: i64, name: String, state: State<AppState>) -> Result<i64, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute("INSERT INTO tags (user_id, name) VALUES (?1, ?2)", params![user_id, trimmed])
        .map_err(unique_violation_message)?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn rename_tag(id: i64, name: String, state: State<AppState>) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute("UPDATE tags SET name = ?1 WHERE id = ?2", params![trimmed, id])
        .map_err(unique_violation_message)?;
    Ok(())
}

#[tauri::command]
pub fn delete_tag(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
