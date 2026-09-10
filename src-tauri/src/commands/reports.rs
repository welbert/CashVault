use crate::db;
use crate::models::{DashboardData, MonthSummary, SaldoPoint, TagAmount};
use crate::AppState;
use tauri::State;

/// Quantas fatias individuais o gráfico de pizza mostra antes de agrupar o
/// resto em "Outros" (evita pizza ilegível quando há muitas tags).
const TAG_CHART_LIMIT: usize = 5;

fn top_with_others(mut items: Vec<(String, f64)>) -> Vec<TagAmount> {
    items.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    if items.len() <= TAG_CHART_LIMIT {
        return items.into_iter().map(|(label, total)| TagAmount { label, total }).collect();
    }
    let mut result: Vec<TagAmount> = items[..TAG_CHART_LIMIT]
        .iter()
        .map(|(label, total)| TagAmount { label: label.clone(), total: *total })
        .collect();
    let others_total: f64 = items[TAG_CHART_LIMIT..].iter().map(|(_, total)| total).sum();
    if others_total > 0.0 {
        result.push(TagAmount { label: "Outros".to_string(), total: others_total });
    }
    result
}

fn pct_change(current: f64, previous: f64) -> Option<f64> {
    if previous == 0.0 {
        None
    } else {
        Some(((current - previous) / previous.abs()) * 100.0)
    }
}

fn month_summary(conn: &rusqlite::Connection, user_id: i64, year: i64, month: i64) -> Result<MonthSummary, String> {
    let (in_total, out_total) = db::month_totals(conn, user_id, year, month)?;
    let lucro = in_total - out_total;

    let (py, pm) = db::prev_year_month(year, month);
    let (prev_in, prev_out) = db::month_totals(conn, user_id, py, pm)?;
    let prev_lucro = prev_in - prev_out;

    Ok(MonthSummary {
        year,
        month,
        in_total,
        out_total,
        lucro,
        pct_change: pct_change(lucro, prev_lucro),
    })
}

#[tauri::command]
pub fn get_dashboard(user_id: i64, year: i64, month: i64, state: State<AppState>) -> Result<DashboardData, String> {
    let conn = state.db.lock().unwrap();

    let month_totals = month_summary(&conn, user_id, year, month)?;

    let mut month_history = Vec::new();
    for m in (1..month).rev() {
        month_history.push(month_summary(&conn, user_id, year, m)?);
    }

    let end_of_month = db::month_end_date(year, month);
    let saldo_atual = db::saldo_up_to(&conn, user_id, &end_of_month)?;

    let mut saldo_history = Vec::new();
    for m in 1..month {
        let saldo = db::saldo_up_to(&conn, user_id, &db::month_end_date(year, m))?;
        let (py, pm) = db::prev_year_month(year, m);
        let prev_saldo = db::saldo_up_to(&conn, user_id, &db::month_end_date(py, pm))?;
        saldo_history.push(SaldoPoint {
            month: m,
            saldo,
            pct_change: pct_change(saldo, prev_saldo),
        });
    }
    saldo_history.reverse(); // meses mais recentes primeiro, mesmo padrão do month_history

    let mut year_series = Vec::new();
    for m in 1..=12 {
        year_series.push(month_summary(&conn, user_id, year, m)?);
    }

    let year_balance_up_to_month: f64 = year_series.iter().take(month as usize).map(|m| m.lucro).sum();

    let years_with_data = db::years_with_data(&conn, user_id)?;
    let months_with_data = db::months_with_data(&conn, user_id, year)?;

    let month_start = format!("{year:04}-{month:02}-01");
    let in_by_tag = top_with_others(db::tag_breakdown(&conn, user_id, "in", &month_start, &end_of_month)?);
    let out_by_tag = top_with_others(db::tag_breakdown(&conn, user_id, "out", &month_start, &end_of_month)?);

    Ok(DashboardData {
        month_totals,
        month_history,
        saldo_atual,
        saldo_history,
        year_series,
        year_balance_up_to_month,
        years_with_data,
        months_with_data,
        in_by_tag,
        out_by_tag,
    })
}
