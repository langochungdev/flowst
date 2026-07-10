pub mod commands;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent, Emitter
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

#[tauri::command]
fn update_tray_tooltip(app_handle: tauri::AppHandle, tooltip: String) {
    let app_handle_clone = app_handle.clone();
    let _ = app_handle.run_on_main_thread(move || {
        if let Some(tray) = app_handle_clone.tray_by_id("main") {
            let _ = tray.set_tooltip(Some(tooltip));
        }
    });
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
        .plugin(tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Info)
            .build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:flowst.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            for window in app.webview_windows().values() {
                disable_rounded_corners(window);
            }

            let focus_25 = MenuItem::with_id(app, "focus_25", "Start Focus: 25m", true, None::<&str>)?;
            let focus_50 = MenuItem::with_id(app, "focus_50", "Start Focus: 50m", true, None::<&str>)?;
            let break_5 = MenuItem::with_id(app, "break_5", "Start Break: 5m", true, None::<&str>)?;
            let break_15 = MenuItem::with_id(app, "break_15", "Start Break: 15m", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            
            let menu = Menu::with_items(app, &[&focus_25, &focus_50, &break_5, &break_15, &sep, &quit_i])?;

            let tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "focus_25" | "focus_50" | "break_5" | "break_15" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                            if let Some(window) = app.get_webview_window("mini") {
                                let _ = window.show();
                            }
                            
                            let duration = match event.id.as_ref() {
                                "focus_25" => 25 * 60,
                                "focus_50" => 50 * 60,
                                "break_5" => 5 * 60,
                                "break_15" => 15 * 60,
                                _ => 0,
                            };
                            let session_type = if event.id.as_ref().starts_with("focus") { "focus" } else { "break" };
                            
                            let _ = app.emit("tray-preset", serde_json::json!({
                                "type": session_type,
                                "duration": duration
                            }));
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        rect,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            let is_minimized = window.is_minimized().unwrap_or(false);
                            
                            let _ = if is_visible && !is_minimized {
                                window.hide()
                            } else {
                                if let Ok(window_size) = window.outer_size() {
                                    let (tray_x, tray_y) = match rect.position {
                                        tauri::Position::Physical(p) => (p.x, p.y),
                                        tauri::Position::Logical(p) => (p.x as i32, p.y as i32),
                                    };
                                    let (tray_w, _tray_h) = match rect.size {
                                        tauri::Size::Physical(s) => (s.width as i32, s.height as i32),
                                        tauri::Size::Logical(s) => (s.width as i32, s.height as i32),
                                    };

                                    let x = tray_x - window_size.width as i32 + tray_w;
                                    let y = tray_y - window_size.height as i32 - 10;
                                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
                                }
                                let _ = window.unminimize();
                                window.show().and_then(|_| window.set_focus())
                            };
                        }
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(rect)) = tray.rect() {
                    if let Ok(window_size) = window.outer_size() {
                        let (tray_x, tray_y) = match rect.position {
                            tauri::Position::Physical(p) => (p.x, p.y),
                            tauri::Position::Logical(p) => (p.x as i32, p.y as i32),
                        };
                        let (tray_w, _tray_h) = match rect.size {
                            tauri::Size::Physical(s) => (s.width as i32, s.height as i32),
                            tauri::Size::Logical(s) => (s.width as i32, s.height as i32),
                        };

                        let x = tray_x - window_size.width as i32 + tray_w;
                        let y = tray_y - window_size.height as i32 - 10;
                        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
                    }
                }
                let _ = window.show();
            }

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
            commands::sys::get_memory_usage,
            update_tray_tooltip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
