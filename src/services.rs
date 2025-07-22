use crate::state::AppState;
use actix_session::Session;
use actix_web::{get, post, put, delete, web, HttpResponse, Responder};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{self, FromRow, Row};

#[derive(Serialize, FromRow)]
struct Post {
    id: i32,
    title: String,
    published_date: NaiveDate,
    views: i32,
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

fn is_admin(session: &Session) -> bool {
    if let Ok(Some(user_id)) = session.get::<String>("user_id") {
        user_id == "156246723"
    } else {
        false
    }
}

#[get("/user_status")]
pub async fn user_status(session: Session) -> impl Responder {
    let user_id = session.get::<String>("user_id");
    let user_name = session.get::<String>("user_name");

    if let (Ok(Some(user_id)), Ok(Some(user_name))) = (user_id, user_name) {
        HttpResponse::Ok().json(serde_json::json!({
            "authenticated": true,
            "is_admin": user_id == "156246723",
            "user_name": user_name
        }))
    } else {
        HttpResponse::Ok().json(serde_json::json!({
            "authenticated": false,
            "is_admin": false
        }))
    }
}

#[get("/posts")]
pub async fn fetch_posts(state: web::Data<AppState>) -> impl Responder {
    match sqlx::query_as::<_, Post>("SELECT id, title, published_date, views FROM posts ORDER BY id DESC")
        .fetch_all(&state.db)
        .await
    {
        Ok(posts) => {
            if posts.is_empty() {
                HttpResponse::Ok().json(Vec::<Post>::new())
            } else {
                HttpResponse::Ok().json(posts)
            }
        }
        Err(e) => {
            eprintln!("Database error: {e:?}");
            HttpResponse::InternalServerError().json("An error occurred")
        }
    }
}

#[post("/posts")]
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
            
            std::fs::create_dir_all("./posts").ok();
            if std::fs::write(format!("./posts/{}.html", post_id), html_content).is_err() {
                return HttpResponse::InternalServerError().json("Failed to create post file");
            }
            
            HttpResponse::Ok().json(serde_json::json!({ "id": post_id, "message": "Post created successfully" }))
        }
        Err(e) => {
            eprintln!("Database error: {e:?}");
            HttpResponse::InternalServerError().json("Failed to create post")
        }
    }
}

#[put("/posts/{id}")]
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
        
        std::fs::create_dir_all("./posts").ok();
        if std::fs::write(format!("./posts/{}.html", post_id), html_content).is_err() {
            return HttpResponse::InternalServerError().json("Failed to update post file");
        }
    }
    
    HttpResponse::Ok().json("Post updated successfully")
}

#[delete("/posts/{id}")]
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
            std::fs::remove_file(format!("./posts/{}.html", post_id)).ok();
            HttpResponse::Ok().json("Post deleted successfully")
        }
        Err(e) => {
            eprintln!("Database error: {e:?}");
            HttpResponse::InternalServerError().json("Failed to delete post")
        }
    }
}

#[get("/posts/{id}")]
pub async fn get_post_content(
    session: Session,
    path: web::Path<i32>,
) -> impl Responder {
    if !is_admin(&session) {
        return HttpResponse::Unauthorized().json("Admin access required");
    }

    let post_id = path.into_inner();
    
    match std::fs::read_to_string(format!("./posts/{}.html", post_id)) {
        Ok(content) => HttpResponse::Ok().json(serde_json::json!({ "content": content })),
        Err(_) => HttpResponse::NotFound().json("Post content not found")
    }
}
