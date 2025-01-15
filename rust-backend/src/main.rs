use axum::{
    extract::Query,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::{
    fs::File,
    io::{self, BufRead},
    net::SocketAddr,
    path::Path,
    sync::{Arc, RwLock},
};
use axum_server::Server;
use tower_http::cors::{CorsLayer, Any};
use http::Method;

#[tokio::main]
async fn main() {
    let words = load_words("data/words.txt").expect("Failed to load words.");
    let shared_words = Arc::new(words);
    let current_word = Arc::new(RwLock::new((String::new(), 0)));

    // Запускаем слово сразу при старте
    start_new_word(current_word.clone(), shared_words.clone()).await;

    let app = Router::new()
        .route(
            "/",
            get({
                let current_word = Arc::clone(&current_word);
                let words = Arc::clone(&shared_words);
                move |query| handler(query, current_word, words)
            }),
        )
        .route(
            "/current",
            get({
                let current_word = Arc::clone(&current_word);
                move || get_current_word(current_word)
            }),
        )
        .route(
            "/new_game", 
            get({
                let current_word = Arc::clone(&current_word);
                let words = Arc::clone(&shared_words);
                move || new_game(current_word, words)
            }),
        )
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(vec![Method::GET, Method::POST])
                .allow_headers(Any),
        );

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("🚀 Server launched on {} 🚀", addr);

    Server::bind(addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

#[derive(Deserialize)]
struct WordQuery {
    word: String,
}

#[derive(Serialize)]
struct Response {
    message: String,
    result: Option<Vec<String>>, // Статусы для каждой буквы
    word: Option<String>,        // Загаданное слово в верхнем регистре
}

async fn handler(
    Query(params): Query<WordQuery>,
    current_word: Arc<RwLock<(String, u64)>>,
    words: Arc<Vec<String>>,
) -> impl IntoResponse {
    let word_data = current_word.read().unwrap();
    let word = word_data.0.to_uppercase(); 

    let input_word = params.word.to_uppercase(); 

    // Проверка длины слова
    if input_word.len() < 5 {
        return (
            StatusCode::BAD_REQUEST,
            Json(Response {
                message: "❗ Error: Too Short".to_string(),
                result: None,
                word: None,
            }),
        );
    }

  
    if !words.contains(&input_word.to_lowercase()) {
        return (
            StatusCode::NOT_FOUND,
            Json(Response {
                message: "❗ Error: Word not found".to_string(),
                result: None,
                word: None,
            }),
        );
    }

    let mut result = vec![];
    let mut word_char_counts = std::collections::HashMap::new();

 
    for c in word.chars() {
        *word_char_counts.entry(c).or_insert(0) += 1;
    }

 
    for (i, c) in input_word.chars().enumerate() {
        if c == word.chars().nth(i).unwrap() {
            result.push("green".to_string());
            *word_char_counts.get_mut(&c).unwrap() -= 1; 
        } else {
            result.push("".to_string()); 
        }
    }

    
    for (i, c) in input_word.chars().enumerate() {
        if result[i].is_empty() {
            if word_char_counts.get(&c).unwrap_or(&0) > &0 {
                result[i] = "yellow".to_string();
                *word_char_counts.get_mut(&c).unwrap() -= 1; 
            } else {
                result[i] = "gray".to_string(); 
            }
        }
    }

    if input_word == word {
        (
            StatusCode::OK,
            Json(Response {
                message: "✅ Congratulations! The word has been guessed.".to_string(),
                result: Some(result),
                word: Some(word),
            }),
        )
    } else {
        (
            StatusCode::OK,
            Json(Response {
                message: "❌ Try again.".to_string(),
                result: Some(result),
                word: None,
            }),
        )
    }
}

async fn get_current_word(current_word: Arc<RwLock<(String, u64)>>) -> impl IntoResponse {
    let word_data = current_word.read().unwrap();
    let word = word_data.0.to_uppercase(); 

    (
        StatusCode::OK,
        Json(Response {
            message: format!("Current word: {}", word),
            result: None,
            word: Some(word),
        }),
    )
}

async fn new_game(current_word: Arc<RwLock<(String, u64)>>, words: Arc<Vec<String>>) -> impl IntoResponse {
    start_new_word(current_word, words).await;
    (
        StatusCode::OK,
        Json(Response {
            message: "🎉 New game started! A new word has been chosen.".to_string(),
            result: None,
            word: None,
        }),
    )
}

async fn start_new_word(current_word: Arc<RwLock<(String, u64)>>, words: Arc<Vec<String>>) {
    let new_word = words.choose(&mut rand::thread_rng()).unwrap().clone();
    {
        let mut word_data = current_word.write().unwrap();
        *word_data = (new_word.clone(), 0); // Устанавливаем новое слово
    }

    println!("🎉 New game started! The new word is '{}'.", new_word); // Логируем новое слово
}

fn load_words<P: AsRef<Path>>(path: P) -> io::Result<Vec<String>> {
    let file = File::open(path)?;
    let reader = io::BufReader::new(file);
    reader
        .lines()
        .map(|line| line.map(|word| word.trim().to_lowercase()))
        .collect()
}