mod auth;
mod services;
mod state;

use actix_files as fs;
use actix_session::CookieSession;
use actix_web::{web, App, HttpServer};
use auth::auth_routes;
use dotenv::dotenv;
use services::{
    create_post, update_post, delete_post, get_post_content, fetch_posts, user_status,
};
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use std::env;
use actix_web::middleware::Logger;

async fn index() -> std::io::Result<fs::NamedFile> {
    fs::NamedFile::open("./assets/index.html")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let github_client_id = env::var("GITHUB_CLIENT_ID").expect("GITHUB_CLIENT_ID must be set");
    let github_client_secret = env::var("GITHUB_CLIENT_SECRET").expect("GITHUB_CLIENT_SECRET must be set");
    let secret_key = env::var("SECRET_KEY").expect("SECRET_KEY must be set");

    let secret_key = hex::decode(secret_key).expect("SECRET_KEY must be a valid hex string");

    let db = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    let app_state = web::Data::new(AppState::new(
        github_client_id,
        github_client_secret,
        db,
    ));

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{port}");

    println!("Starting Rayspace Admin server on {}", addr);

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(
                CookieSession::private(&secret_key)
                    .secure(false)
                    .name("AdminUser"),
            )
            .app_data(app_state.clone())
            .service(auth_routes())
            .service(
                web::scope("/api")
                    .service(user_status)
                    .service(fetch_posts)
                    .service(create_post)
                    .service(update_post)
                    .service(delete_post)
                    .service(get_post_content)
            )
            .service(fs::Files::new("/assets", "./assets"))
            .route("/", web::get().to(index))
            .default_service(web::route().to(index))
    })
    .bind(&addr)?
    .run()
    .await
}
