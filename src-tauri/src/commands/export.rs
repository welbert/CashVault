use super::transactions::resolve_date_range;
use crate::AppState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn export_transactions_csv(
    path: String,
    user_id: i64,
    year: Option<i64>,
    month: Option<i64>,
    start_date: Option<String>,
    end_date: Option<String>,
    state: State<AppState>,
) -> Result<usize, String> {
    let conn = state.db.lock().unwrap();
    let (start, end) = resolve_date_range(year, month, start_date, end_date);

    let mut stmt = conn
        .prepare(
            "SELECT type, name, date, amount, installment_index, installment_count
             FROM transactions WHERE user_id = ?1 AND date >= ?2 AND date <= ?3
             ORDER BY date, id",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![user_id, start, end], |row| {
            let kind: String = row.get(0)?;
            let name: String = row.get(1)?;
            let date: String = row.get(2)?;
            let amount: f64 = row.get(3)?;
            let idx: Option<i64> = row.get(4)?;
            let count: Option<i64> = row.get(5)?;
            Ok((kind, name, date, amount, idx, count))
        })
        .map_err(|e| e.to_string())?;

    let mut wtr = csv::Writer::from_writer(vec![]);
    wtr.write_record(["tipo", "nome", "data", "valor", "parcela"])
        .map_err(|e| e.to_string())?;

    let mut written = 0usize;
    for row in rows {
        let (kind, name, date, amount, idx, count) = row.map_err(|e| e.to_string())?;
        let parcela = match (idx, count) {
            (Some(i), Some(c)) => format!("{i}/{c}"),
            _ => String::new(),
        };
        let tipo = if kind == "in" { "entrada" } else { "saida" };
        wtr.write_record([tipo, &name, &date, &format!("{amount:.2}"), &parcela])
            .map_err(|e| e.to_string())?;
        written += 1;
    }

    let bytes = wtr.into_inner().map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(written)
}
