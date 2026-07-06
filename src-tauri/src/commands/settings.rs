use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;

fn get_settings_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("settings.json")
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<String, String> {
    let path = get_settings_path(&app);
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        // Return default settings
        Ok(r#"{
            "focus_duration": 25,
            "break_duration": 5,
            "auto_mode": false,
            "theme": "system",
            "always_on_top": false
        }"#.to_string())
    }
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: String) -> Result<(), String> {
    let path = get_settings_path(&app);
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            let _ = fs::create_dir_all(parent);
        }
    }
    fs::write(path, settings).map_err(|e| e.to_string())
}
