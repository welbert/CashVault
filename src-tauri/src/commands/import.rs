use crate::AppState;
use chrono::NaiveDate;
use csv::ReaderBuilder;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct ImportResult {
    pub imported: usize,
    pub errors: Vec<String>,
}

fn parse_amount(raw: &str) -> Option<f64> {
    let s = raw.trim();
    if s.is_empty() {
        return None;
    }
    // Excel em pt-BR costuma salvar "1.234,56" (ponto = milhar, vírgula = decimal).
    let normalized = if s.contains(',') {
        s.replace('.', "").replace(',', ".")
    } else {
        s.to_string()
    };
    normalized.parse::<f64>().ok()
}

fn parse_date(raw: &str) -> Option<String> {
    let s = raw.trim();
    NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .or_else(|_| NaiveDate::parse_from_str(s, "%d/%m/%Y"))
        .ok()
        .map(|d| d.format("%Y-%m-%d").to_string())
}

fn parse_kind(raw: &str) -> Option<&'static str> {
    match raw.trim().to_lowercase().as_str() {
        "entrada" | "in" => Some("in"),
        "saida" | "saída" | "out" => Some("out"),
        _ => None,
    }
}

fn detect_delimiter(bytes: &[u8]) -> u8 {
    let first_line_end = bytes.iter().position(|&b| b == b'\n').unwrap_or(bytes.len());
    let first_line = String::from_utf8_lossy(&bytes[..first_line_end]);
    if first_line.matches(';').count() > first_line.matches(',').count() {
        b';'
    } else {
        b','
    }
}

#[tauri::command]
pub fn import_transactions_csv(path: String, user_id: i64, state: State<AppState>) -> Result<ImportResult, String> {
    let mut bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        bytes.drain(0..3);
    }
    let delimiter = detect_delimiter(&bytes);

    let mut rdr = ReaderBuilder::new().delimiter(delimiter).flexible(true).from_reader(bytes.as_slice());
    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    let col = |name: &str| headers.iter().position(|h| h.trim().eq_ignore_ascii_case(name));
    let tipo_idx = col("tipo").ok_or("Coluna \"tipo\" não encontrada no CSV.")?;
    let nome_idx = col("nome").ok_or("Coluna \"nome\" não encontrada no CSV.")?;
    let data_idx = col("data").ok_or("Coluna \"data\" não encontrada no CSV.")?;
    let valor_idx = col("valor").ok_or("Coluna \"valor\" não encontrada no CSV.")?;

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut imported = 0usize;
    let mut errors = Vec::new();

    for (i, record) in rdr.records().enumerate() {
        let line = i + 2; // +1 pelo cabeçalho, +1 pra contar a partir de 1
        let record = match record {
            Ok(r) => r,
            Err(e) => {
                errors.push(format!("Linha {line}: {e}"));
                continue;
            }
        };
        let get = |idx: usize| record.get(idx).unwrap_or("").to_string();

        let kind = match parse_kind(&get(tipo_idx)) {
            Some(k) => k,
            None => {
                errors.push(format!("Linha {line}: tipo inválido (\"{}\")", get(tipo_idx)));
                continue;
            }
        };
        let name = get(nome_idx).trim().to_string();
        if name.is_empty() {
            errors.push(format!("Linha {line}: nome vazio"));
            continue;
        }
        let date = match parse_date(&get(data_idx)) {
            Some(d) => d,
            None => {
                errors.push(format!("Linha {line}: data inválida (\"{}\")", get(data_idx)));
                continue;
            }
        };
        let amount = match parse_amount(&get(valor_idx)) {
            Some(v) if v > 0.0 => v,
            _ => {
                errors.push(format!("Linha {line}: valor inválido (\"{}\")", get(valor_idx)));
                continue;
            }
        };

        tx.execute(
            "INSERT INTO transactions (user_id, type, name, date, amount) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![user_id, kind, name, date, amount],
        )
        .map_err(|e| e.to_string())?;
        imported += 1;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(ImportResult { imported, errors })
}
