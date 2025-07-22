use sqlx::{Pool, Postgres};

#[derive(Clone)]
pub struct AppState {
    pub github_client_id: String,
    pub github_client_secret: String,
    pub db: Pool<Postgres>,
}

impl AppState {
    pub fn new(github_client_id: String, github_client_secret: String, db: Pool<Postgres>) -> Self {
        AppState {
            github_client_id,
            github_client_secret,
            db,
        }
    }
}
