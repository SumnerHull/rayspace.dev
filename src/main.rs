mod auth;
mod services;
mod state;
// mod admin; // Remove admin module

use actix_files as fs;
use actix_session::{CookieSession};
use actix_web::{web, App, HttpServer};
use auth::auth_routes;
use dotenv::dotenv;
use hex;
use services::{
    create_comment, fetch_comments, fetch_posts, fetch_stars, update_views, user_status,
    tool_add_post, tool_delete_post,
};
// Remove admin imports
use sqlx::{postgres::PgPoolOptions};
use state::AppState;
use std::env;
use env_logger;
use actix_web::middleware::Logger;

async fn index() -> std::io::Result<fs::NamedFile> {
    fs::NamedFile::open("./assets/index.html")
}

async fn tools_page() -> std::io::Result<actix_files::NamedFile> {
    actix_files::NamedFile::open("./assets/pages/tools.html")
}

// Remove admin_page function

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(12)
        .connect(&database_url)
        .await
        .expect("Error building a connection pool");
    let github_client_id =
        env::var("GITHUB_CLIENT_ID").expect("Missing the GITHUB_CLIENT_ID environment variable.");
    let github_client_secret = env::var("GITHUB_CLIENT_SECRET")
        .expect("Missing the GITHUB_CLIENT_SECRET environment variable.");
    let secret_key_hex = env::var("SECRET_KEY").expect("SECRET_KEY must be set");
    let secret_key =
        hex::decode(secret_key_hex).expect("SECRET_KEY must be a hex-encoded byte array");
    let app_state = web::Data::new(AppState::new(github_client_id, github_client_secret, pool));

    HttpServer::new(move || {
        App::new()
            .wrap(
                CookieSession::private(&secret_key)
                    .secure(true)
                    .name("User"),
            )
            .wrap(
                Logger::new("%t %a \"%r\" %s %b %T \"%{User-Agent}i\"")
                    .exclude_regex(r"^/(styles|images|scripts)/.*")
            )
            .app_data(app_state.clone())
            .service(auth_routes())
            .service(
                web::scope("/api")
                    .service(fetch_posts)
                    .service(fetch_comments)
                    .service(create_comment)
                    .service(update_views)
                    .service(user_status)
                    .service(fetch_stars)
                    .service(tool_add_post)
                    .service(tool_delete_post),
            )
            // Remove /admin and /test routes
            .service(
                web::resource("/tools").route(web::get().to(tools_page))
            )
            .service(
                fs::Files::new("/", "./assets")
                    .index_file("index.html")
                    .use_last_modified(true),
            )
            .default_service(web::route().to(index))
    })
    .bind("0.0.0.0:3000")?
    .run()
    .await
}
