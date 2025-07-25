mod auth;
mod services;
mod state;

use actix_files as fs;
use actix_session::{CookieSession};
use actix_web::{web, App, HttpServer};
use sentry::integrations::actix;
use auth::auth_routes;
use dotenv::dotenv;
use services::{
    create_comment, fetch_comments, fetch_posts, fetch_stars, update_views, user_status,
    create_post, update_post, delete_post, get_post_content,
};
// Remove admin imports
use sqlx::{postgres::PgPoolOptions};
use state::AppState;
use std::env;
use actix_web::middleware::Logger;

async fn index() -> std::io::Result<fs::NamedFile> {
    fs::NamedFile::open("./frontend/out/index.html")
}

async fn not_found() -> actix_web::HttpResponse {
    actix_web::HttpResponse::NotFound().body("404 Not Found")
}

// Remove tools_page function since it should be handled by JavaScript routing

fn main() -> std::io::Result<()> {
    env_logger::init();
    dotenv().ok();
    let _guard = sentry::init((
        "https://3a92ba62a6165a73da3081b74837a14c@o4509686868017152.ingest.us.sentry.io/4509686883090432",
        sentry::ClientOptions {
            send_default_pii: true,
            traces_sample_rate: 1.0,
            ..Default::default()
        },
    ));

    actix_web::rt::System::new().block_on(async {
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

        // Get port from environment or default to 8080 for Fly.io
        let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
        let addr = format!("0.0.0.0:{port}");

        HttpServer::new(move || {
            App::new()
                .wrap(
                    actix::Sentry::builder()
                        .capture_server_errors(true)
                        .start_transaction(true)
                        .finish(),
                )
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
                        .service(create_post)
                        .service(update_post)
                        .service(delete_post)
                        .service(get_post_content)
                )
                .route("/tools", web::get().to(not_found))
                // Remove the /tools route - let JavaScript handle it
                .service(
                    fs::Files::new("/posts", "./assets/posts")
                        .use_last_modified(true),
                )
                .service(
                    fs::Files::new("/", "./frontend/out")
                        .index_file("index.html")
                        .use_last_modified(true),
                )
                .default_service(web::route().to(index))
        })
        .bind(addr)?
        .run()
        .await
    })
}
