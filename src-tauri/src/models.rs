use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSummary {
    pub id: i64,
    pub name: String,
    pub base_balance: f64,
    pub has_password: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TagRef {
    pub id: i64,
    pub name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagWithUsage {
    pub id: i64,
    pub name: String,
    pub usage_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: i64,
    pub user_id: i64,
    #[serde(rename = "type")]
    pub kind: String,
    pub name: String,
    pub date: String,
    pub amount: f64,
    pub installment_group_id: Option<i64>,
    pub installment_index: Option<i64>,
    pub installment_count: Option<i64>,
    pub tags: Vec<TagRef>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BillStatus {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub frequency: String,
    pub due_month: Option<i64>,
    pub estimated_value: f64,
    pub paid: bool,
    pub paid_amount: Option<f64>,
    pub paid_transaction_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Target {
    pub id: i64,
    pub user_id: i64,
    pub kind: String,
    pub name: String,
    pub target_value: f64,
    pub current_saldo: f64,
    pub pct: f64,
    pub remaining: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthSummary {
    pub year: i64,
    pub month: i64,
    pub in_total: f64,
    pub out_total: f64,
    pub lucro: f64,
    pub pct_change: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaldoPoint {
    pub month: i64,
    pub saldo: f64,
    pub pct_change: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagAmount {
    pub label: String,
    pub total: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardData {
    pub month_totals: MonthSummary,
    pub month_history: Vec<MonthSummary>,
    pub saldo_atual: f64,
    pub saldo_history: Vec<SaldoPoint>,
    pub year_series: Vec<MonthSummary>,
    pub year_balance_up_to_month: f64,
    pub years_with_data: Vec<i64>,
    pub months_with_data: Vec<i64>,
    pub in_by_tag: Vec<TagAmount>,
    pub out_by_tag: Vec<TagAmount>,
}
