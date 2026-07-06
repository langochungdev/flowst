use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

#[tauri::command]
pub fn toggle_mini_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("mini") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    } else {
        // Create the mini window
        let builder = WebviewWindowBuilder::new(
            &app,
            "mini",
            WebviewUrl::App("mini".into())
        )
        .title("Flowst Mini")
        .inner_size(250.0, 150.0)
        .always_on_top(true)
        .decorations(false)
        .transparent(true)
        .resizable(false);

        if let Err(e) = builder.build() {
            log::error!("Failed to build mini window: {}", e);
        }
    }
}
