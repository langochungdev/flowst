pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg(target_os = "windows")]
fn disable_rounded_corners(window: &tauri::WebviewWindow) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE};

    if let Ok(hwnd) = window.hwnd() {
        let hwnd = HWND(hwnd.0 as _);
        // DWMWCP_DONOTROUND is 1
        let pref: i32 = 1;
        unsafe {
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &pref as *const _ as *const core::ffi::c_void,
                std::mem::size_of_val(&pref) as u32,
            );
        }
    }
}

fn clamp_window_to_monitor(window: &tauri::Window) {
    let Ok(pos) = window.outer_position() else {
        return;
    };
    let Ok(outer) = window.outer_size() else {
        return;
    };
    let Ok(inner) = window.inner_size() else {
        return;
    };
    let Some(monitor) = window.current_monitor().ok().flatten() else {
        return;
    };

    // On Windows, transparent borderless windows have an invisible DWM border
    // Left/right shadow is split evenly. Top has NO shadow. Bottom gets all vertical shadow.
    let shadow_side = (outer.width as i32 - inner.width as i32) / 2;
    let shadow_bottom = outer.height as i32 - inner.height as i32;

    let mon_pos = monitor.position();
    let mon_size = monitor.size();

    // Adjust bounds to compensate for invisible DWM border
    let min_x = mon_pos.x - shadow_side;
    let min_y = mon_pos.y;
    let max_x = mon_pos.x + mon_size.width as i32 - outer.width as i32 + shadow_side;
    let max_y = mon_pos.y + mon_size.height as i32 - outer.height as i32 + shadow_bottom;

    let new_x = pos.x.clamp(min_x, max_x);
    let new_y = pos.y.clamp(min_y, max_y);

    if new_x != pos.x || new_y != pos.y {
        let _ = window.set_position(tauri::PhysicalPosition::new(new_x, new_y));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
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
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:flowst.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            for window in app.webview_windows().values() {
                disable_rounded_corners(window);
            }

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
        .on_window_event(|window, event| {
            if let WindowEvent::Moved(_) = event {
                clamp_window_to_monitor(window);
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::toggle_mini_window,
            commands::window::open_settings_window,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::sys::get_memory_usage
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
