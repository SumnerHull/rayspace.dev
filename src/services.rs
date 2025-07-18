use crate::state::AppState;
use actix_session::Session;
use actix_web::{get, post, put, delete, web, HttpResponse, Responder};
use sentry;
use chrono::{NaiveDate, DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{self, FromRow, Row};
use std::env;

#[derive(Deserialize)]
struct Repo {
    stargazers_count: i32,
}

#[derive(Deserialize)]
pub struct Info {
    id: String,
}

#[derive(Serialize, FromRow)]
struct Post {
    id: i32,
    title: String,
    published_date: NaiveDate,
    views: i32,
}

#[derive(Serialize, FromRow)]
struct Comment {
    id: i32,
    #[serde(skip_serializing)]
    userid: String,
    name: String,
    comment: String,
    #[serde(skip_serializing)]
    timestamp: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct CreateComment {
    pub comment: String,
}

#[derive(Deserialize)]
pub struct ToolPost {
    pub title: String,
    pub content: String,
    pub published_date: Option<NaiveDate>,
}

#[get("/github_stars")]
pub async fn fetch_stars(data: web::Data<AppState>) -> impl Responder {
    let cache = data.star_cache.read().expect("Failed to acquire read lock");
    if Utc::now()
        .signed_duration_since(cache.last_fetched)
        .num_minutes()
        < 15
    {
        return HttpResponse::Ok().json(serde_json::json!({ "stars": cache.star_count }));
    }
    drop(cache);

    let client = reqwest::Client::new();
    let owner = env::var("GITHUB_OWNER").unwrap_or_else(|_| String::from("rx0a"));
    let repo = env::var("GITHUB_REPO").unwrap_or_else(|_| String::from("rayspace.dev"));

    let request_url = format!(
        "https://api.github.com/repos/{owner}/{repo}",
        owner = owner,
        repo = repo
    );

    match client
        .get(&request_url)
        .header(reqwest::header::USER_AGENT, "rayspace.dev")
        .send()
        .await
    {
        Ok(response) => match response.json::<Repo>().await {
            Ok(repo) => {
                let mut cache = data.star_cache.write().expect("Failed to acquire write lock");
                cache.star_count = repo.stargazers_count;
                cache.last_fetched = Utc::now();

                HttpResponse::Ok().json(serde_json::json!({ "stars": repo.stargazers_count }))
            }
            Err(e) => {
                sentry::capture_error(&e);
                HttpResponse::InternalServerError().json("An error occurred")
            }
        },
        Err(e) => {
            sentry::capture_error(&e);
            HttpResponse::InternalServerError().json("An error occurred")
        },
    }
}

#[put("/update_views/{id}")]
pub async fn update_views(info: web::Path<Info>, data: web::Data<AppState>) -> impl Responder {
    let id: i32 = info.id.parse().unwrap_or_default();

    match sqlx::query("UPDATE posts SET views = views + 1 WHERE id = $1")
        .bind(id)
        .execute(&data.db)
        .await
    {
        Ok(_) => HttpResponse::Ok().json("Updated views"),
        Err(_) => {
            HttpResponse::InternalServerError().json("An error occurred")
        }
    }
}

#[get("/user_status")]
pub async fn user_status(session: Session) -> impl Responder {
    let user_id = session.get::<String>("user_id");
    let user_name = session.get::<String>("user_name");

    if let (Ok(Some(_)), Ok(Some(_))) = (user_id, user_name) {
        HttpResponse::Ok().json(serde_json::json!({
            "authenticated": true
        }))
    } else {
        HttpResponse::Ok().json(serde_json::json!({
            "authenticated": false
        }))
    }
}

#[get("/posts")]
pub async fn fetch_posts(state: Data<AppState>) -> impl Responder {
    match sqlx::query_as::<_, Post>("SELECT * FROM posts")
        .fetch_all(&state.db)
        .await
    {
        Ok(posts) => {
            if posts.is_empty() {
                HttpResponse::NotFound().json("No posts found")
            } else {
                HttpResponse::Ok().json(posts)
            }
        }
        Err(e) => {
            sentry::capture_error(&e);
            HttpResponse::InternalServerError().json("An error occurred")
        }
    }
}

#[get("/comments")]
pub async fn fetch_comments(state: Data<AppState>) -> impl Responder {
    match sqlx::query_as::<_, Comment>("SELECT id, userid, name, comment, timestamp FROM comments ORDER BY timestamp DESC LIMIT 100")
        .fetch_all(&state.db)
        .await
    {
        Ok(comments) => {
            if comments.is_empty() {
                HttpResponse::NotFound().json("No comments found")
            } else {
                HttpResponse::Ok().json(comments)
            }
        }
        Err(_) => {
            HttpResponse::InternalServerError().json("An error occurred")
        }
    }
}

#[post("/comments")]
pub async fn create_comment(
    session: Session,
    comment_body: Json<CreateComment>,
    data: web::Data<AppState>,
) -> impl Responder {
    const MAX_CHARS: usize = 255;

    let user_id = session.get::<String>("user_id");
    let user_name = session.get::<String>("user_name");

    if let (Ok(Some(user_id)), Ok(Some(user_name))) = (user_id, user_name) {
        if user_id.len() > MAX_CHARS
            || user_name.len() > MAX_CHARS
            || comment_body.comment.len() > MAX_CHARS
        {
            return HttpResponse::BadRequest().body("Input exceeds maximum allowed characters");
        }
        let sanitized_comment = ammonia::clean(&comment_body.comment);

        match sqlx::query(
            "INSERT INTO comments (userid, name, comment) VALUES ($1, $2, $3) RETURNING id, userid, name, comment, timestamp",
        )
        .bind(&user_id)
        .bind(&user_name)
        .bind(&sanitized_comment)
        .fetch_one(&data.db)
        .await
        {
            Ok(row) => {
                let id: Result<i32, _> = row.try_get(0);
                let userid: Result<String, _> = row.try_get(1);
                let name: Result<String, _> = row.try_get(2);
                let comment: Result<String, _> = row.try_get(3);
                let timestamp: Result<DateTime<Utc>, _> = row.try_get(4);

                match (id, userid, name, comment, timestamp) {
                    (Ok(id), Ok(userid), Ok(name), Ok(comment), Ok(timestamp)) => {
                        let comment = Comment {
                            id,
                            userid,
                            name,
                            comment,
                            timestamp,
                        };
                        HttpResponse::Ok().json(comment)
                    }
                    _ => HttpResponse::InternalServerError().body("Failed to parse comment fields"),
                }
            },
            Err(_) => HttpResponse::InternalServerError().body("Failed to create comment"),
        }
    } else {
        HttpResponse::Unauthorized().body("User must be logged in to create a comment")
    }
}

#[post("/tools/posts")]
pub async fn tool_add_post(
    post_data: Json<ToolPost>,
    data: web::Data<AppState>,
) -> impl Responder {
    let published_date = post_data.published_date.unwrap_or_else(|| Utc::now().date_naive());
    match sqlx::query(
        "INSERT INTO posts (title, published_date, views) VALUES ($1, $2, $3) RETURNING id"
    )
    .bind(&post_data.title)
    .bind(published_date)
    .bind(0)
    .fetch_one(&data.db)
    .await {
        Ok(row) => {
            let post_id: i32 = row.try_get(0).unwrap_or(0);
            // Write HTML file
            let html_content = format!(
                r#"<div class='post-container'><h1 class='post-title'>{}</h1><div class='post-content'>{}</div></div>"#,
                post_data.title, post_data.content
            );
            let file_path = format!("./assets/posts/{}.html", post_id);
            let _ = std::fs::write(&file_path, html_content);
            HttpResponse::Ok().json(serde_json::json!({"id": post_id}))
        },
        Err(e) => HttpResponse::InternalServerError().body(format!("Failed to add post: {}", e)),
    }
}

#[delete("/tools/posts/{id}")]
pub async fn tool_delete_post(
    info: web::Path<Info>,
    data: web::Data<AppState>,
) -> impl Responder {
    let post_id: i32 = info.id.parse().unwrap_or_default();
    match sqlx::query("DELETE FROM posts WHERE id = $1")
        .bind(post_id)
        .execute(&data.db)
        .await {
        Ok(_) => {
            let file_path = format!("./assets/posts/{}.html", post_id);
            let _ = std::fs::remove_file(&file_path);
            HttpResponse::Ok().body("Post deleted")
        },
        Err(e) => HttpResponse::InternalServerError().body(format!("Failed to delete post: {}", e)),
    }
}

// --- Admin endpoints moved from admin.rs ---
use actix_session::Session;
use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::env;

#[derive(Deserialize)]
pub struct AdminInfo {
    pub id: String,
}

#[derive(Deserialize)]
pub struct AdminCreatePost {
    pub title: String,
    pub content: String,
    pub published_date: Option<NaiveDate>,
}

#[derive(Deserialize)]
pub struct AdminUpdatePost {
    pub title: String,
    pub content: String,
    pub published_date: Option<NaiveDate>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct AdminPost {
    pub id: i32,
    pub title: String,
    pub published_date: NaiveDate,
    pub views: i32,
}

async fn check_admin(session: &Session) -> Result<bool, Box<dyn std::error::Error>> {
    let user_id = session.get::<String>("user_id")?;
    let user_name = session.get::<String>("user_name")?;
    if let (Some(user_id), Some(_user_name)) = (user_id, user_name) {
        let admin_user_id = env::var("ADMIN_USER_ID").unwrap_or_default();
        Ok(user_id == admin_user_id)
    } else {
        Ok(false)
    }
}

#[get("/admin/posts")]
pub async fn admin_fetch_posts(state: web::Data<AppState>, session: Session) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            match sqlx::query_as::<_, AdminPost>("SELECT * FROM posts ORDER BY id DESC")
                .fetch_all(&state.db)
                .await {
                Ok(posts) => {
                    if posts.is_empty() {
                        HttpResponse::NotFound().json("No posts found")
                    } else {
                        HttpResponse::Ok().json(posts)
                    }
                }
                Err(_) => {
                    HttpResponse::InternalServerError().json("An error occurred")
                }
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
}

#[post("/admin/posts")]
pub async fn admin_create_post(
    session: Session,
    post_data: web::Json<AdminCreatePost>,
    state: web::Data<AppState>,
) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            if post_data.title.trim().is_empty() || post_data.content.trim().is_empty() {
                return HttpResponse::BadRequest().json("Title and content cannot be empty");
            }
            let published_date = post_data.published_date.unwrap_or_else(|| Utc::now().date_naive());
            match sqlx::query(
                "INSERT INTO posts (title, published_date, views) VALUES ($1, $2, $3) RETURNING id"
            )
            .bind(&post_data.title)
            .bind(published_date)
            .bind(0)
            .fetch_one(&state.db)
            .await {
                Ok(row) => {
                    let post_id: i32 = row.get(0);
                    let html_content = format!(
                        r#"<div class=\"post-container\"><h1 class=\"post-title\">{}</h1><div class=\"post-content\">{}</div></div>"#,
                        post_data.title, post_data.content
                    );
                    let file_path = format!("./assets/posts/{}.html", post_id);
                    let _ = std::fs::write(&file_path, html_content);
                    HttpResponse::Ok().json(serde_json::json!({
                        "id": post_id,
                        "title": post_data.title,
                        "published_date": published_date,
                        "views": 0
                    }))
                },
                Err(_) => HttpResponse::InternalServerError().json("Failed to create post"),
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
}

#[put("/admin/posts/{id}")]
pub async fn admin_update_post(
    session: Session,
    info: web::Path<AdminInfo>,
    post_data: web::Json<AdminUpdatePost>,
    state: web::Data<AppState>,
) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            let post_id: i32 = info.id.parse().unwrap_or_default();
            if post_data.title.trim().is_empty() || post_data.content.trim().is_empty() {
                return HttpResponse::BadRequest().json("Title and content cannot be empty");
            }
            let published_date = post_data.published_date.unwrap_or_else(|| Utc::now().date_naive());
            match sqlx::query(
                "UPDATE posts SET title = $1, published_date = $2 WHERE id = $3"
            )
            .bind(&post_data.title)
            .bind(published_date)
            .bind(post_id)
            .execute(&state.db)
            .await {
                Ok(_) => {
                    let html_content = format!(
                        r#"<div class=\"post-container\"><h1 class=\"post-title\">{}</h1><div class=\"post-content\">{}</div></div>"#,
                        post_data.title, post_data.content
                    );
                    let file_path = format!("./assets/posts/{}.html", post_id);
                    let _ = std::fs::write(&file_path, html_content);
                    HttpResponse::Ok().json("Post updated successfully")
                },
                Err(_) => HttpResponse::InternalServerError().json("Failed to update post"),
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
}

#[delete("/admin/posts/{id}")]
pub async fn admin_delete_post(
    session: Session,
    info: web::Path<AdminInfo>,
    state: web::Data<AppState>,
) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            let post_id: i32 = info.id.parse().unwrap_or_default();
            match sqlx::query("DELETE FROM posts WHERE id = $1")
                .bind(post_id)
                .execute(&state.db)
                .await {
                Ok(_) => {
                    let file_path = format!("./assets/posts/{}.html", post_id);
                    let _ = std::fs::remove_file(&file_path);
                    HttpResponse::Ok().json("Post deleted successfully")
                },
                Err(_) => HttpResponse::InternalServerError().json("Failed to delete post"),
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
}
// --- End admin endpoints ---