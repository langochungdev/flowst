use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn toggle_mini_window(app: AppHandle, to_mini: bool) {
    if let Some(main) = app.get_webview_window("main") {
        if to_mini {
            let _ = main.set_size(tauri::Size::Logical(tauri::LogicalSize::new(90.0, 46.0)));
        } else {
            let _ = main.set_size(tauri::Size::Logical(tauri::LogicalSize::new(300.0, 320.0)));
        }
    }
}

#[tauri::command]
pub fn open_settings_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub async fn open_debug_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("debug") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "debug",
            tauri::WebviewUrl::App("index.html".into())
        )
        .title("Debug Window")
        .inner_size(500.0, 600.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
