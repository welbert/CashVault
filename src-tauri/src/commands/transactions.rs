use crate::db;
use crate::models::{TagRef, Transaction};
use crate::AppState;
use chrono::{Datelike, NaiveDate};
use rusqlite::{params, Connection, ToSql};
use std::collections::HashMap;
use tauri::State;

const SELECT_COLUMNS: &str =
    "id, user_id, type, name, date, amount, installment_group_id, installment_index, installment_count";

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<Transaction> {
    Ok(Transaction {
        id: row.get(0)?,
        user_id: row.get(1)?,
        kind: row.get(2)?,
        name: row.get(3)?,
        date: row.get(4)?,
        amount: row.get(5)?,
        installment_group_id: row.get(6)?,
        installment_index: row.get(7)?,
        installment_count: row.get(8)?,
        tags: Vec::new(),
    })
}

/// Busca as tags de todas as transações informadas em uma única query e as
/// atribui ao campo `tags` de cada uma (evita N+1 quando a lista é grande).
fn attach_tags(conn: &Connection, mut txns: Vec<Transaction>) -> Result<Vec<Transaction>, String> {
    if txns.is_empty() {
        return Ok(txns);
    }
    let ids: Vec<i64> = txns.iter().map(|t| t.id).collect();
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
        "SELECT tt.transaction_id, t.id, t.name FROM transaction_tags tt
         JOIN tags t ON t.id = tt.tag_id
         WHERE tt.transaction_id IN ({placeholders})
         ORDER BY t.name"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let id_params: Vec<&dyn ToSql> = ids.iter().map(|id| id as &dyn ToSql).collect();

    let mut by_txn: HashMap<i64, Vec<TagRef>> = HashMap::new();
    let rows = stmt
        .query_map(id_params.as_slice(), |row| {
            Ok((row.get::<_, i64>(0)?, TagRef { id: row.get(1)?, name: row.get(2)? }))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (txn_id, tag) = row.map_err(|e| e.to_string())?;
        by_txn.entry(txn_id).or_default().push(tag);
    }

    for t in txns.iter_mut() {
        if let Some(tags) = by_txn.remove(&t.id) {
            t.tags = tags;
        }
    }
    Ok(txns)
}

fn replace_transaction_tags(conn: &Connection, transaction_id: i64, tag_ids: &[i64]) -> Result<(), String> {
    conn.execute("DELETE FROM transaction_tags WHERE transaction_id = ?1", params![transaction_id])
        .map_err(|e| e.to_string())?;
    for tag_id in tag_ids {
        conn.execute(
            "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?1, ?2)",
            params![transaction_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub(crate) fn resolve_date_range(
    year: Option<i64>,
    month: Option<i64>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> (String, String) {
    if let (Some(s), Some(e)) = (&start_date, &end_date) {
        return (s.clone(), e.clone());
    }
    match (year, month) {
        (Some(y), Some(m)) => (format!("{y:04}-{m:02}-01"), db::month_end_date(y, m)),
        (Some(y), None) => (format!("{y:04}-01-01"), format!("{y:04}-12-31")),
        _ => ("0001-01-01".to_string(), "9999-12-31".to_string()),
    }
}

fn validate_transaction_input(kind: &str, name: &str, amount: f64) -> Result<(), String> {
    if kind != "in" && kind != "out" {
        return Err("Tipo inválido".to_string());
    }
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    if amount <= 0.0 {
        return Err("Valor deve ser maior que zero".to_string());
    }
    Ok(())
}

fn days_in_month(year: i32, month: u32) -> u32 {
    let (ny, nm) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    NaiveDate::from_ymd_opt(ny, nm, 1)
        .expect("data válida")
        .pred_opt()
        .expect("data válida")
        .day()
}

fn add_months_clamped(date: NaiveDate, months: i32) -> NaiveDate {
    let total_months = date.month0() as i32 + months;
    let year = date.year() + total_months.div_euclid(12);
    let month = (total_months.rem_euclid(12) + 1) as u32;
    let day = date.day().min(days_in_month(year, month));
    NaiveDate::from_ymd_opt(year, month, day).expect("data válida")
}

#[tauri::command]
pub fn list_transactions(
    user_id: i64,
    year: Option<i64>,
    month: Option<i64>,
    start_date: Option<String>,
    end_date: Option<String>,
    tag_ids: Option<Vec<i64>>,
    state: State<AppState>,
) -> Result<Vec<Transaction>, String> {
    let conn = state.db.lock().unwrap();
    let (start, end) = resolve_date_range(year, month, start_date, end_date);

    let result: Result<Vec<Transaction>, rusqlite::Error> = match tag_ids.filter(|ids| !ids.is_empty()) {
        Some(ids) => {
            // filtro por tag casa QUALQUER uma das tags selecionadas (OR)
            let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!(
                "SELECT DISTINCT {SELECT_COLUMNS} FROM transactions
                 JOIN transaction_tags ON transaction_tags.transaction_id = transactions.id
                 WHERE user_id = ? AND date >= ? AND date <= ? AND transaction_tags.tag_id IN ({placeholders})
                 ORDER BY date DESC, id DESC"
            );
            let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let mut all_params: Vec<&dyn ToSql> = vec![&user_id, &start, &end];
            for id in &ids {
                all_params.push(id);
            }
            let rows = stmt.query_map(all_params.as_slice(), map_row).map_err(|e| e.to_string())?;
            rows.collect()
        }
        None => {
            let sql =
                format!("SELECT {SELECT_COLUMNS} FROM transactions WHERE user_id = ?1 AND date >= ?2 AND date <= ?3 ORDER BY date DESC, id DESC");
            let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![user_id, start, end], map_row).map_err(|e| e.to_string())?;
            rows.collect()
        }
    };
    let rows = result.map_err(|e| e.to_string())?;

    attach_tags(&conn, rows)
}

#[tauri::command]
pub fn create_transaction(
    user_id: i64,
    kind: String,
    name: String,
    date: String,
    amount: f64,
    tag_ids: Option<Vec<i64>>,
    state: State<AppState>,
) -> Result<i64, String> {
    validate_transaction_input(&kind, &name, amount)?;
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO transactions (user_id, type, name, date, amount) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![user_id, kind, name.trim(), date, amount],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    replace_transaction_tags(&conn, id, &tag_ids.unwrap_or_default())?;
    Ok(id)
}

#[tauri::command]
pub fn create_installment_purchase(
    user_id: i64,
    name: String,
    first_date: String,
    total_amount: f64,
    installment_count: i64,
    tag_ids: Option<Vec<i64>>,
    state: State<AppState>,
) -> Result<Vec<i64>, String> {
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    if total_amount <= 0.0 {
        return Err("Valor deve ser maior que zero".to_string());
    }
    if installment_count < 2 {
        return Err("Número de parcelas deve ser 2 ou mais".to_string());
    }
    let base_date = NaiveDate::parse_from_str(&first_date, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let per_installment = ((total_amount / installment_count as f64) * 100.0).round() / 100.0;
    let total_cents = (total_amount * 100.0).round();

    let mut conn = state.db.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut ids = Vec::new();
    let mut running_cents = 0.0;
    let mut group_id: Option<i64> = None;

    for i in 0..installment_count {
        // a última parcela absorve o resto do arredondamento pra soma bater exatamente com total_amount
        let value = if i == installment_count - 1 {
            (total_cents - running_cents) / 100.0
        } else {
            per_installment
        };
        running_cents += (value * 100.0).round();
        let inst_date = add_months_clamped(base_date, i as i32);

        let new_id = if i == 0 {
            // installment_group_id ainda não existe na primeira parcela (só nasce com o próprio id),
            // e a CHECK constraint exige as 3 colunas juntas nulas ou juntas preenchidas — insere
            // tudo NULL e completa com UPDATE depois de saber o id.
            tx.execute(
                "INSERT INTO transactions (user_id, type, name, date, amount)
                 VALUES (?1, 'out', ?2, ?3, ?4)",
                params![
                    user_id,
                    name.trim(),
                    inst_date.format("%Y-%m-%d").to_string(),
                    value
                ],
            )
            .map_err(|e| e.to_string())?;
            let id = tx.last_insert_rowid();
            group_id = Some(id);
            tx.execute(
                "UPDATE transactions SET installment_group_id = ?1, installment_index = 1, installment_count = ?2 WHERE id = ?1",
                params![id, installment_count],
            )
            .map_err(|e| e.to_string())?;
            id
        } else {
            tx.execute(
                "INSERT INTO transactions (user_id, type, name, date, amount, installment_group_id, installment_index, installment_count)
                 VALUES (?1, 'out', ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    user_id,
                    name.trim(),
                    inst_date.format("%Y-%m-%d").to_string(),
                    value,
                    group_id,
                    i + 1,
                    installment_count
                ],
            )
            .map_err(|e| e.to_string())?;
            tx.last_insert_rowid()
        };
        if let Some(tag_id_list) = &tag_ids {
            for tag_id in tag_id_list {
                tx.execute(
                    "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?1, ?2)",
                    params![new_id, tag_id],
                )
                .map_err(|e| e.to_string())?;
            }
        }
        ids.push(new_id);
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(ids)
}

#[tauri::command]
pub fn update_transaction(
    id: i64,
    name: String,
    date: String,
    amount: f64,
    tag_ids: Option<Vec<i64>>,
    state: State<AppState>,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    if amount <= 0.0 {
        return Err("Valor deve ser maior que zero".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE transactions SET name = ?1, date = ?2, amount = ?3, updated_at = datetime('now') WHERE id = ?4",
        params![name.trim(), date, amount, id],
    )
    .map_err(|e| e.to_string())?;
    if let Some(ids) = tag_ids {
        replace_transaction_tags(&conn, id, &ids)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_transaction(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM transactions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_installment_group(group_id: i64, state: State<AppState>) -> Result<usize, String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM transactions WHERE installment_group_id = ?1", params![group_id])
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_installment_group_name(group_id: i64, name: String, state: State<AppState>) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE transactions SET name = ?1, updated_at = datetime('now') WHERE installment_group_id = ?2",
        params![name.trim(), group_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_installment_group(group_id: i64, state: State<AppState>) -> Result<Vec<Transaction>, String> {
    let conn = state.db.lock().unwrap();
    let sql = format!("SELECT {SELECT_COLUMNS} FROM transactions WHERE installment_group_id = ?1 ORDER BY installment_index");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![group_id], map_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    attach_tags(&conn, rows)
}

#[tauri::command]
pub fn get_years_with_data(user_id: i64, state: State<AppState>) -> Result<Vec<i64>, String> {
    let conn = state.db.lock().unwrap();
    db::years_with_data(&conn, user_id)
}

#[tauri::command]
pub fn get_months_with_data(user_id: i64, year: i64, state: State<AppState>) -> Result<Vec<i64>, String> {
    let conn = state.db.lock().unwrap();
    db::months_with_data(&conn, user_id, year)
}
