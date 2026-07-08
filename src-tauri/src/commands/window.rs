use tauri::{AppHandle, Manager, PhysicalPosition};

#[tauri::command]
pub fn toggle_mini_window(app: AppHandle) {
    let main_window = app.get_webview_window("main");
    let mini_window = app.get_webview_window("mini");

    if let Some(mini) = mini_window {
        if mini.is_visible().unwrap_or(false) {
            // mini → main: position main near mini (top-left of mini aligns with main)
            if let Some(main) = main_window {
                if let (Ok(mini_pos), Ok(mini_outer)) = (mini.outer_position(), mini.outer_size()) {
                    // Try to place main window so it overlaps/covers mini position
                    let target_x = mini_pos.x;
                    let target_y = mini_pos.y;
                    let _ = main.set_position(PhysicalPosition::new(target_x, target_y));
                }
                let _ = mini.hide();
                let _ = main.show();
                let _ = main.set_focus();
            } else {
                let _ = mini.hide();
            }
        } else {
            // main → mini: position mini at top-LEFT corner of main window
            if let Some(main) = main_window {
                if let Ok(main_pos) = main.outer_position() {
                    // Top-left of main
                    let _ = mini.set_position(PhysicalPosition::new(main_pos.x, main_pos.y));
                }
                let _ = main.hide();
            }
            let _ = mini.show();
            let _ = mini.set_focus();
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
