use crate::state::AppState;
use actix_session::Session;
use actix_web::{get, post, put, delete, web, HttpResponse, Responder};
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
pub struct CreatePost {
    pub title: String,
    pub content: String,
    pub published_date: NaiveDate,
}

#[derive(Deserialize)]
pub struct UpdatePost {
    pub title: Option<String>,
    pub content: Option<String>,
    pub published_date: Option<NaiveDate>,
}


#[get("/github_stars")]
pub async fn fetch_stars(data: web::Data<AppState>) -> impl Responder {
    let (should_fetch, current_stars) = {
        let cache = data.star_cache.read().expect("Failed to acquire read lock");
        let should_fetch = Utc::now()
            .signed_duration_since(cache.last_fetched)
            .num_minutes() >= 15;
        (should_fetch, cache.star_count)
    };

    if !should_fetch {
        return HttpResponse::Ok().json(serde_json::json!({ "stars": current_stars }));
    }

    let client = reqwest::Client::new();
    let owner = env::var("GITHUB_OWNER").unwrap_or_else(|_| String::from("rx0a"));
    let repo = env::var("GITHUB_REPO").unwrap_or_else(|_| String::from("rayspace.dev"));

    let request_url = format!("https://api.github.com/repos/{owner}/{repo}");

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
pub async fn fetch_posts(state: web::Data<AppState>) -> impl Responder {
    match sqlx::query_as::<_, Post>("SELECT id, title, published_date, views FROM posts")
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
pub async fn fetch_comments(state: web::Data<AppState>) -> impl Responder {
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
    comment_body: web::Json<CreateComment>,
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

fn is_admin(session: &Session) -> bool {
    if let Ok(Some(user_id)) = session.get::<String>("user_id") {
        user_id == "156246723"
    } else {
        false
    }
}

#[post("/admin/posts")]
pub async fn create_post(
    session: Session,
    post_data: web::Json<CreatePost>,
    data: web::Data<AppState>,
) -> impl Responder {
    if !is_admin(&session) {
        return HttpResponse::Unauthorized().json("Admin access required");
    }

    match sqlx::query("INSERT INTO posts (title, published_date, views) VALUES ($1, $2, 0) RETURNING id")
        .bind(&post_data.title)
        .bind(&post_data.published_date)
        .fetch_one(&data.db)
        .await
    {
        Ok(row) => {
            let post_id: i32 = row.get(0);
            
            let html_content = format!(
                "<div class='post-container'><h1 class='post-title'>{}</h1><div class='post-content'>{}</div></div>",
                post_data.title, post_data.content
            );
            
            if std::fs::write(format!("./assets/posts/{}.html", post_id), html_content).is_err() {
                return HttpResponse::InternalServerError().json("Failed to create post file");
            }
            
            HttpResponse::Ok().json(serde_json::json!({ "id": post_id, "message": "Post created successfully" }))
        }
        Err(_) => HttpResponse::InternalServerError().json("Failed to create post")
    }
}

#[put("/admin/posts/{id}")]
pub async fn update_post(
    session: Session,
    path: web::Path<i32>,
    post_data: web::Json<UpdatePost>,
    data: web::Data<AppState>,
) -> impl Responder {
    if !is_admin(&session) {
        return HttpResponse::Unauthorized().json("Admin access required");
    }

    let post_id = path.into_inner();
    
    if let Some(title) = &post_data.title {
        if sqlx::query("UPDATE posts SET title = $1 WHERE id = $2")
            .bind(title)
            .bind(post_id)
            .execute(&data.db)
            .await
            .is_err()
        {
            return HttpResponse::InternalServerError().json("Failed to update post title");
        }
    }
    
    if let Some(date) = &post_data.published_date {
        if sqlx::query("UPDATE posts SET published_date = $1 WHERE id = $2")
            .bind(date)
            .bind(post_id)
            .execute(&data.db)
            .await
            .is_err()
        {
            return HttpResponse::InternalServerError().json("Failed to update post date");
        }
    }
    
    if let Some(content) = &post_data.content {
        let title = if let Some(t) = &post_data.title {
            t.clone()
        } else {
            match sqlx::query("SELECT title FROM posts WHERE id = $1")
                .bind(post_id)
                .fetch_one(&data.db)
                .await
            {
                Ok(row) => row.get(0),
                Err(_) => "Post Title".to_string()
            }
        };
        
        let html_content = format!(
            "<div class='post-container'><h1 class='post-title'>{}</h1><div class='post-content'>{}</div></div>",
            title, content
        );
        
        if std::fs::write(format!("./assets/posts/{}.html", post_id), html_content).is_err() {
            return HttpResponse::InternalServerError().json("Failed to update post file");
        }
    }
    
    HttpResponse::Ok().json("Post updated successfully")
}

#[delete("/admin/posts/{id}")]
pub async fn delete_post(
    session: Session,
    path: web::Path<i32>,
    data: web::Data<AppState>,
) -> impl Responder {
    if !is_admin(&session) {
        return HttpResponse::Unauthorized().json("Admin access required");
    }

    let post_id = path.into_inner();
    
    match sqlx::query("DELETE FROM posts WHERE id = $1")
        .bind(post_id)
        .execute(&data.db)
        .await
    {
        Ok(_) => {
            if std::fs::remove_file(format!("./assets/posts/{}.html", post_id)).is_err() {
                return HttpResponse::InternalServerError().json("Failed to delete post file");
            }
            HttpResponse::Ok().json("Post deleted successfully")
        }
        Err(_) => HttpResponse::InternalServerError().json("Failed to delete post")
    }
}

#[get("/admin/posts/{id}")]
pub async fn get_post_content(
    session: Session,
    path: web::Path<i32>,
) -> impl Responder {
    if !is_admin(&session) {
        return HttpResponse::Unauthorized().json("Admin access required");
    }

    let post_id = path.into_inner();
    
    match std::fs::read_to_string(format!("./assets/posts/{}.html", post_id)) {
        Ok(content) => HttpResponse::Ok().json(serde_json::json!({ "content": content })),
        Err(_) => HttpResponse::NotFound().json("Post content not found")
    }
}
