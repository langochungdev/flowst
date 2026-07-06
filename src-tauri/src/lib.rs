pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_sessions_table",
            sql: "CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                duration_actual INTEGER,
                completed BOOLEAN NOT NULL DEFAULT 0
            );",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().add_migrations("sqlite:flowst.db", migrations).build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let toggle_i = MenuItem::with_id(app, "toggle", "Toggle Window", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = if window.is_visible().unwrap_or(false) {
                                window.hide()
                            } else {
                                window.show().and_then(|_| window.set_focus())
                            };
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::toggle_mini_window,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::sys::get_memory_usage
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
