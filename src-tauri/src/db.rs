use rusqlite::{params, Connection};
use std::path::PathBuf;

pub fn open_connection(db_path: PathBuf) -> rusqlite::Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    init_db(&conn)?;
    migrate_db(&conn);
    Ok(conn)
}

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT    NOT NULL,
            password_hash   TEXT    NULL,
            password_salt   BLOB    NULL,
            base_balance    REAL    NOT NULL DEFAULT 0,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS bills (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name            TEXT    NOT NULL,
            frequency       TEXT    NOT NULL CHECK(frequency IN ('monthly','yearly')),
            due_month       INTEGER NULL,
            estimated_value REAL    NOT NULL,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            CHECK (
                (frequency = 'monthly' AND due_month IS NULL)
                OR (frequency = 'yearly' AND due_month BETWEEN 1 AND 12)
            )
        );
        CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);

        CREATE TABLE IF NOT EXISTS transactions (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type                  TEXT    NOT NULL CHECK(type IN ('in','out')),
            name                  TEXT    NOT NULL,
            date                  TEXT    NOT NULL,
            amount                REAL    NOT NULL,
            installment_group_id  INTEGER NULL REFERENCES transactions(id),
            installment_index     INTEGER NULL,
            installment_count     INTEGER NULL,
            bill_id               INTEGER NULL REFERENCES bills(id) ON DELETE SET NULL,
            bill_year             INTEGER NULL,
            bill_month            INTEGER NULL,
            created_at            TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
            CHECK (
                (installment_group_id IS NULL AND installment_index IS NULL AND installment_count IS NULL)
                OR (installment_group_id IS NOT NULL AND installment_index IS NOT NULL AND installment_count IS NOT NULL)
            )
        );
        CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
        CREATE INDEX IF NOT EXISTS idx_transactions_group ON transactions(installment_group_id);

        CREATE TABLE IF NOT EXISTS targets (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind          TEXT    NOT NULL CHECK(kind IN ('goal','purchase')),
            name          TEXT    NOT NULL,
            target_value  REAL    NOT NULL,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_targets_user_kind ON targets(user_id, kind);

        CREATE TABLE IF NOT EXISTS config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name       TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

        CREATE TABLE IF NOT EXISTS transaction_tags (
            transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
            tag_id         INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (transaction_id, tag_id)
        );
        CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag ON transaction_tags(tag_id);",
    )
}

pub const DEFAULT_TAGS: &[&str] = &[
    "Lazer",
    "Viagem",
    "Alimentação",
    "Transporte",
    "Saúde",
    "Moradia",
    "Assinaturas",
    "Educação",
];

pub fn seed_default_tags(conn: &Connection, user_id: i64) -> Result<(), String> {
    for name in DEFAULT_TAGS {
        conn.execute("INSERT OR IGNORE INTO tags (user_id, name) VALUES (?1, ?2)", params![user_id, name])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn migrate_db(conn: &Connection) {
    // Seguro rodar a cada início — SQLite retorna erro se a coluna/tabela já existe, que é ignorado.
    let _ = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS bills (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name            TEXT    NOT NULL,
            frequency       TEXT    NOT NULL CHECK(frequency IN ('monthly','yearly')),
            due_month       INTEGER NULL,
            estimated_value REAL    NOT NULL,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            CHECK (
                (frequency = 'monthly' AND due_month IS NULL)
                OR (frequency = 'yearly' AND due_month BETWEEN 1 AND 12)
            )
        );
        CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);",
    );
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN bill_year INTEGER", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN bill_month INTEGER", []);
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_transactions_bill ON transactions(bill_id, bill_year, bill_month)", []);
}

pub fn month_end_date(year: i64, month: i64) -> String {
    let (ny, nm) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    let next_start = chrono::NaiveDate::from_ymd_opt(ny as i32, nm as u32, 1).expect("data válida");
    next_start.pred_opt().expect("data válida").format("%Y-%m-%d").to_string()
}

pub fn prev_year_month(year: i64, month: i64) -> (i64, i64) {
    if month == 1 { (year - 1, 12) } else { (year, month - 1) }
}

pub fn saldo_up_to(conn: &Connection, user_id: i64, end_date: &str) -> Result<f64, String> {
    let base_balance: f64 = conn
        .query_row("SELECT base_balance FROM users WHERE id = ?1", params![user_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let net: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0)
             FROM transactions WHERE user_id = ?1 AND date <= ?2",
            params![user_id, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(base_balance + net)
}

pub fn current_saldo(conn: &Connection, user_id: i64) -> Result<f64, String> {
    saldo_up_to(conn, user_id, "9999-12-31")
}

pub fn month_totals(conn: &Connection, user_id: i64, year: i64, month: i64) -> Result<(f64, f64), String> {
    let start = format!("{year:04}-{month:02}-01");
    let end = month_end_date(year, month);
    conn.query_row(
        "SELECT COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE 0 END),0),
                COALESCE(SUM(CASE WHEN type='out' THEN amount ELSE 0 END),0)
         FROM transactions WHERE user_id = ?1 AND date >= ?2 AND date <= ?3",
        params![user_id, start, end],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map_err(|e| e.to_string())
}

/// Soma o valor das transações de um tipo no período por tag; transações sem
/// tag nenhuma caem no bucket "Sem tag". Uma transação com N tags conta o
/// valor cheio em cada uma delas (mesma semântica OR usada no filtro por tag).
pub fn tag_breakdown(conn: &Connection, user_id: i64, kind: &str, start: &str, end: &str) -> Result<Vec<(String, f64)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(tg.name, 'Sem tag') AS label, SUM(tx.amount) AS total
             FROM transactions tx
             LEFT JOIN transaction_tags tt ON tt.transaction_id = tx.id
             LEFT JOIN tags tg ON tg.id = tt.tag_id
             WHERE tx.user_id = ?1 AND tx.type = ?2 AND tx.date >= ?3 AND tx.date <= ?4
             GROUP BY tg.id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![user_id, kind, start, end], |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?)))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn years_with_data(conn: &Connection, user_id: i64) -> Result<Vec<i64>, String> {
    let mut stmt = conn
        .prepare("SELECT DISTINCT CAST(strftime('%Y', date) AS INTEGER) FROM transactions WHERE user_id = ?1 ORDER BY 1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![user_id], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn months_with_data(conn: &Connection, user_id: i64, year: i64) -> Result<Vec<i64>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT CAST(strftime('%m', date) AS INTEGER) FROM transactions
             WHERE user_id = ?1 AND strftime('%Y', date) = ?2 ORDER BY 1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![user_id, format!("{year:04}")], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
