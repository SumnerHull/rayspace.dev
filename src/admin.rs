use crate::state::AppState;
use actix_session::Session;
use actix_web::{delete, get, post, put, web,
    web::{Data, Json, Path},
    HttpResponse, Responder,
};
use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::{self, FromRow, Row};
use std::env;

#[derive(Deserialize)]
pub struct Info {
    pub id: String,
}

#[derive(Deserialize)]
pub struct CreatePost {
    pub title: String,
    pub content: String,
    pub published_date: Option<NaiveDate>,
}

#[derive(Deserialize)]
pub struct UpdatePost {
    pub title: String,
    pub content: String,
    pub published_date: Option<NaiveDate>,
}

#[derive(Serialize, FromRow)]
struct Post {
    id: i32,
    title: String,
    published_date: NaiveDate,
    views: i32
}

/// Check if the current user has admin privileges
async fn check_admin(session: &Session) -> Result<bool, Box<dyn std::error::Error>> {
    let user_id = session.get::<String>("user_id")?;
    let user_name = session.get::<String>("user_name")?;
    
    if let (Some(user_id), Some(_user_name)) = (user_id, user_name) {       // Check if user is admin (you can modify this logic based on your admin criteria)
        // For now, we'll check against environment variable ADMIN_USER_ID
        let admin_user_id = env::var("ADMIN_USER_ID").unwrap_or_default();
        Ok(user_id == admin_user_id)
    } else {        Ok(false)
    }
}

/// Create a new blog post
#[post("/admin/posts")]
pub async fn create_post(
    session: Session,
    post_data: Json<CreatePost>,
    data: web::Data<AppState>,
) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            // Validate input
            if post_data.title.trim().is_empty() || post_data.content.trim().is_empty() {
                return HttpResponse::BadRequest().json("Title and content cannot be empty");
            }

            let published_date = post_data.published_date.unwrap_or_else(|| Utc::now().date_naive());

            // Insert into database
            match sqlx::query(
                "INSERT INTO posts (title, published_date, views) VALUES ($1, $2, $3) RETURNING id"
            )
            .bind(&post_data.title)
            .bind(published_date)
            .bind(0) // Initial views
            .fetch_one(&data.db)
            .await {
                Ok(row) => {
                    let post_id: i32 = row.get(0);
                    
                    // Create the HTML file for the post
                    let html_content = format!(
                        r#"<div class="post-container">
  <h1 class="post-title">{}</h1>
  <div class="post-content">{}</div>
</div>"#,
                        post_data.title,
                        post_data.content
                    );

                    // Write to file (in a real app, you'd want to handle this more robustly)
                    let file_path = format!("./assets/posts/{}.html", post_id);
                    if let Err(_) = std::fs::write(&file_path, html_content) {
                        return HttpResponse::InternalServerError().json("Failed to create post file");
                    }

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

/// Update an existing blog post
#[put("/admin/posts/{id}")]
pub async fn update_post(
    session: Session,
    info: web::Path<Info>,
    post_data: Json<UpdatePost>,
    data: web::Data<AppState>,
) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            let post_id: i32 = info.id.parse().unwrap_or_default();
            
            // Validate input
            if post_data.title.trim().is_empty() || post_data.content.trim().is_empty() {
                return HttpResponse::BadRequest().json("Title and content cannot be empty");
            }

            let published_date = post_data.published_date.unwrap_or_else(|| Utc::now().date_naive());

            // Update database
            match sqlx::query(
                "UPDATE posts SET title = $1, published_date = $2 WHERE id = $3"
            )
            .bind(&post_data.title)
            .bind(published_date)
            .bind(post_id)
            .execute(&data.db)
            .await {
                Ok(_) => {
                    // Update the HTML file
                    let html_content = format!(
                        r#"<div class="post-container">
  <h1 class="post-title">{}</h1>
  <div class="post-content">{}</div>
</div>"#,
                        post_data.title,
                        post_data.content
                    );

                    let file_path = format!("./assets/posts/{}.html", post_id);
                    if let Err(_) = std::fs::write(&file_path, html_content) {
                        return HttpResponse::InternalServerError().json("Failed to update post file");
                    }

                    HttpResponse::Ok().json("Post updated successfully")              
                },
                Err(_) => HttpResponse::InternalServerError().json("Failed to update post"),        
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
}

/// Delete a blog post
#[delete("/admin/posts/{id}")]
pub async fn delete_post(
    session: Session,
    info: web::Path<Info>,
    data: web::Data<AppState>,
) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            let post_id: i32 = info.id.parse().unwrap_or_default();

            // Delete from database
            match sqlx::query("DELETE FROM posts WHERE id = $1")
                .bind(post_id)
                .execute(&data.db)
                .await {
                Ok(_) => {
                    // Delete the HTML file
                    let file_path = format!("./assets/posts/{}.html", post_id);
                    let _ = std::fs::remove_file(&file_path); // Ignore errors if file doesn't exist

                    HttpResponse::Ok().json("Post deleted successfully")              
                },
                Err(_) => HttpResponse::InternalServerError().json("Failed to delete post"),        
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
}

/// Fetch all posts for admin management
#[get("/admin/posts")]
pub async fn admin_fetch_posts(state: Data<AppState>, session: Session) -> impl Responder {
    match check_admin(&session).await {
        Ok(true) => {
            match sqlx::query_as::<_, Post>("SELECT * FROM posts ORDER BY id DESC")
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
                    HttpResponse::InternalServerError().json("An error occurred")                }
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json("Admin access required"),
        Err(_) => HttpResponse::InternalServerError().json("Authentication error"),
    }
} 