use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn toggle_mini_window(app: AppHandle) {
    let main_window = app.get_webview_window("main");
    let mini_window = app.get_webview_window("mini");

    if let Some(mini) = mini_window {
        if mini.is_visible().unwrap_or(false) {
            let _ = mini.hide();
            if let Some(main) = main_window {
                let _ = main.show();
                let _ = main.set_focus();
            }
        } else {
            let _ = mini.show();
            let _ = mini.set_focus();
            if let Some(main) = main_window {
                let _ = main.hide();
            }
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
