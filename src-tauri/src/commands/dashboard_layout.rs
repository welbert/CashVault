use crate::db;
use crate::models::DashboardLayoutItem;
use crate::AppState;
use rusqlite::params;
use tauri::State;

fn map_item(row: &rusqlite::Row) -> rusqlite::Result<DashboardLayoutItem> {
    Ok(DashboardLayoutItem {
        card_key: row.get(0)?,
        x: row.get(1)?,
        y: row.get(2)?,
        size: row.get(3)?,
        visible: row.get(4)?,
    })
}

fn list_layout(conn: &rusqlite::Connection, user_id: i64) -> Result<Vec<DashboardLayoutItem>, String> {
    let mut stmt = conn
        .prepare("SELECT card_key, x, y, size, visible FROM dashboard_layout WHERE user_id = ?1 ORDER BY id")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id], map_item).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Layout do dashboard do perfil. Perfis que ainda não têm nenhuma linha
/// (perfil anterior a essa feature, cuja tabela nasceu vazia pra ele) recebem
/// o layout padrão nesse momento, em vez de aparecer com o dashboard vazio —
/// perfis criados depois disso já vêm semeados em `create_user`.
#[tauri::command]
pub fn get_dashboard_layout(user_id: i64, state: State<AppState>) -> Result<Vec<DashboardLayoutItem>, String> {
    let conn = state.db.lock().unwrap();
    let existing = list_layout(&conn, user_id)?;
    if !existing.is_empty() {
        return Ok(existing);
    }
    db::seed_default_dashboard_layout(&conn, user_id)?;
    list_layout(&conn, user_id)
}

/// Substitui o layout inteiro do perfil (autosave a cada mudança no modo
/// customizar — ver decisão 12 de dashboard-customizavel-plano.md).
#[tauri::command]
pub fn save_dashboard_layout(user_id: i64, items: Vec<DashboardLayoutItem>, state: State<AppState>) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM dashboard_layout WHERE user_id = ?1", params![user_id]).map_err(|e| e.to_string())?;
    for item in &items {
        tx.execute(
            "INSERT INTO dashboard_layout (user_id, card_key, x, y, size, visible) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![user_id, item.card_key, item.x, item.y, item.size, item.visible],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())
}
