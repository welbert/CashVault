mod commands;
mod db;
mod models;

use rusqlite::{params, Connection};
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub active_user_id: Mutex<Option<i64>>,
}

fn resolve_active_user_id(conn: &Connection) -> Option<i64> {
    let stored: Option<String> = conn
        .query_row("SELECT value FROM config WHERE key = 'last_active_user_id'", [], |row| row.get(0))
        .ok();
    let id: i64 = stored?.parse().ok()?;
    conn.query_row("SELECT 1 FROM users WHERE id = ?1", params![id], |_| Ok(())).ok()?;
    Some(id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("sem diretório de dados do app");
            std::fs::create_dir_all(&data_dir).expect("falha ao criar diretório de dados");
            let conn = db::open_connection(data_dir.join("gerenciador.db")).expect("falha ao abrir o banco");
            let active_user_id = resolve_active_user_id(&conn);

            app.manage(AppState {
                db: Mutex::new(conn),
                active_user_id: Mutex::new(active_user_id),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::users::list_users,
            commands::users::create_user,
            commands::users::get_active_profile,
            commands::users::switch_active_profile,
            commands::users::rename_user,
            commands::users::update_user_base_balance,
            commands::users::delete_user,
            commands::transactions::list_transactions,
            commands::transactions::create_transaction,
            commands::transactions::create_installment_purchase,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
            commands::transactions::delete_installment_group,
            commands::transactions::update_installment_group_name,
            commands::transactions::list_installment_group,
            commands::transactions::get_years_with_data,
            commands::transactions::get_months_with_data,
            commands::targets::list_targets,
            commands::targets::create_target,
            commands::targets::update_target,
            commands::targets::delete_target,
            commands::tags::list_tags,
            commands::tags::create_tag,
            commands::tags::rename_tag,
            commands::tags::delete_tag,
            commands::bills::list_bills,
            commands::bills::create_bill,
            commands::bills::update_bill,
            commands::bills::delete_bill,
            commands::bills::pay_bill,
            commands::export::export_transactions_csv,
            commands::reports::get_dashboard,
            commands::logging::write_log,
            commands::logging::open_log_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
