use std::collections::HashMap;
use std::time::Duration;
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

mod secret;

#[derive(serde::Serialize)]
struct ProxyResp {
    status: u16,
    body: String,
}

/// HTTP isteklerini backend'den (reqwest) yapar — webview origin'i gönderilmez,
/// böylece Ollama/Open WebUI gibi servislerin CORS reddi (403) tetiklenmez.
#[tauri::command]
async fn http_proxy(
    url: String,
    method: Option<String>,
    body: Option<String>,
    headers: Option<HashMap<String, String>>,
) -> Result<ProxyResp, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let m = method.unwrap_or_else(|| "GET".to_string());
    let mut req = if m.eq_ignore_ascii_case("POST") {
        client.post(&url)
    } else {
        client.get(&url)
    };

    if let Some(h) = headers {
        for (k, v) in h {
            req = req.header(k, v);
        }
    }
    if let Some(b) = body {
        req = req.body(b);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    Ok(ProxyResp { status, body: text })
}

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial schema",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "analysis and player names",
            sql: include_str!("../migrations/002_analysis.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "encrypted secrets store",
            sql: include_str!("../migrations/003_secrets.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "tournaments",
            sql: include_str!("../migrations/004_tournaments.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:chess.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            http_proxy,
            secret::encrypt_secret,
            secret::decrypt_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
