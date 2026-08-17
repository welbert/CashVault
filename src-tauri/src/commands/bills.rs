use crate::models::BillStatus;
use crate::AppState;
use rusqlite::params;
use tauri::State;

fn map_bill(row: &rusqlite::Row) -> rusqlite::Result<BillStatus> {
    let paid_transaction_id: Option<i64> = row.get(6)?;
    Ok(BillStatus {
        id: row.get(0)?,
        user_id: row.get(1)?,
        name: row.get(2)?,
        frequency: row.get(3)?,
        due_month: row.get(4)?,
        estimated_value: row.get(5)?,
        paid: paid_transaction_id.is_some(),
        paid_transaction_id,
        paid_amount: row.get(7)?,
    })
}

fn validate_bill_input(name: &str, frequency: &str, due_month: Option<i64>, estimated_value: f64) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Nome não pode ser vazio".to_string());
    }
    if frequency != "monthly" && frequency != "yearly" {
        return Err("Frequência inválida".to_string());
    }
    if frequency == "yearly" && !matches!(due_month, Some(m) if (1..=12).contains(&m)) {
        return Err("Informe o mês de vencimento (1-12) para contas anuais".to_string());
    }
    if frequency == "monthly" && due_month.is_some() {
        return Err("Conta mensal não deve ter mês de vencimento".to_string());
    }
    if estimated_value <= 0.0 {
        return Err("Valor estimado deve ser maior que zero".to_string());
    }
    Ok(())
}

/// Retorna todas as contas do perfil junto com o status de pagamento no período
/// informado — mensal casa por (ano, mês); anual casa só por ano (um pagamento por ano).
#[tauri::command]
pub fn list_bills(user_id: i64, year: i64, month: i64, state: State<AppState>) -> Result<Vec<BillStatus>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.user_id, b.name, b.frequency, b.due_month, b.estimated_value,
                    (SELECT t.id FROM transactions t
                       WHERE t.bill_id = b.id AND t.bill_year = ?2
                         AND ((b.frequency = 'monthly' AND t.bill_month = ?3) OR (b.frequency = 'yearly' AND t.bill_month IS NULL))
                       ORDER BY t.id LIMIT 1) AS paid_transaction_id,
                    (SELECT t.amount FROM transactions t
                       WHERE t.bill_id = b.id AND t.bill_year = ?2
                         AND ((b.frequency = 'monthly' AND t.bill_month = ?3) OR (b.frequency = 'yearly' AND t.bill_month IS NULL))
                       ORDER BY t.id LIMIT 1) AS paid_amount
             FROM bills b
             WHERE b.user_id = ?1
             ORDER BY b.name",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![user_id, year, month], map_bill).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_bill(
    user_id: i64,
    name: String,
    frequency: String,
    due_month: Option<i64>,
    estimated_value: f64,
    state: State<AppState>,
) -> Result<i64, String> {
    validate_bill_input(&name, &frequency, due_month, estimated_value)?;
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO bills (user_id, name, frequency, due_month, estimated_value) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![user_id, name.trim(), frequency, due_month, estimated_value],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_bill(
    id: i64,
    name: String,
    frequency: String,
    due_month: Option<i64>,
    estimated_value: f64,
    state: State<AppState>,
) -> Result<(), String> {
    validate_bill_input(&name, &frequency, due_month, estimated_value)?;
    let conn = state.db.lock().unwrap();
    conn.execute(
        "UPDATE bills SET name = ?1, frequency = ?2, due_month = ?3, estimated_value = ?4, updated_at = datetime('now') WHERE id = ?5",
        params![name.trim(), frequency, due_month, estimated_value, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_bill(id: i64, state: State<AppState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM bills WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

/// Marca uma conta como paga no período: cria uma movimentação de saída normal
/// vinculada à conta. Desfazer o pagamento é só apagar essa movimentação
/// (delete_transaction) — não existe um campo "pago" separado pra dessincronizar.
#[tauri::command]
pub fn pay_bill(
    user_id: i64,
    bill_id: i64,
    year: i64,
    month: Option<i64>,
    amount: f64,
    date: String,
    state: State<AppState>,
) -> Result<i64, String> {
    if amount <= 0.0 {
        return Err("Valor deve ser maior que zero".to_string());
    }
    let conn = state.db.lock().unwrap();
    let (name, frequency): (String, String) = conn
        .query_row("SELECT name, frequency FROM bills WHERE id = ?1", params![bill_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|_| "Conta não encontrada".to_string())?;

    let bill_month = if frequency == "monthly" {
        Some(month.ok_or("Mês é obrigatório para conta mensal")?)
    } else {
        None
    };

    conn.execute(
        "INSERT INTO transactions (user_id, type, name, date, amount, bill_id, bill_year, bill_month)
         VALUES (?1, 'out', ?2, ?3, ?4, ?5, ?6, ?7)",
        params![user_id, name, date, amount, bill_id, year, bill_month],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}
