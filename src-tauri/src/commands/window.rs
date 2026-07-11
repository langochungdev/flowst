use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn toggle_mini_window(app: AppHandle, to_mini: bool) {
    if let Some(main) = app.get_webview_window("main") {
        let logical_main_size = tauri::LogicalSize::new(300.0, 320.0);
        let logical_mini_size = tauri::LogicalSize::new(90.0, 46.0);
        
        let new_logical_size = if to_mini { logical_mini_size } else { logical_main_size };
        let cur_logical_size = if to_mini { logical_main_size } else { logical_mini_size };
        
        let scale_factor = main.scale_factor().unwrap_or(1.0);
        let mut cur_pos = main.outer_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
        let cur_size = main.outer_size().unwrap_or(tauri::PhysicalSize::new(0, 0));
        
        let new_physical_size = new_logical_size.to_physical::<u32>(scale_factor);
        let cur_physical_webview_size = cur_logical_size.to_physical::<u32>(scale_factor);

        let border_x = cur_size.width as i32 - cur_physical_webview_size.width as i32;
        let border_y = cur_size.height as i32 - cur_physical_webview_size.height as i32;
        let target_outer_width = new_physical_size.width as i32 + border_x;
        let target_outer_height = new_physical_size.height as i32 + border_y;
        let left_border = border_x / 2;
        let top_border = 0; // Windows invisible top border is generally 0

        if let Ok(Some(monitor)) = main.current_monitor() {
            let monitor_pos = monitor.position();
            let monitor_size = monitor.size();
            
            let dist_right = (monitor_pos.x + monitor_size.width as i32) - (cur_pos.x + cur_size.width as i32);
            let dist_bottom = (monitor_pos.y + monitor_size.height as i32) - (cur_pos.y + cur_size.height as i32);
            
            let edge_threshold = (30.0 * scale_factor) as i32;

            if dist_right < edge_threshold {
                cur_pos.x += cur_size.width as i32 - target_outer_width;
            }

            if dist_bottom < edge_threshold {
                cur_pos.y += cur_size.height as i32 - target_outer_height;
            }

            if !to_mini {
                let right_border = border_x / 2;
                if cur_pos.x + target_outer_width > monitor_pos.x + monitor_size.width as i32 + right_border {
                    cur_pos.x = monitor_pos.x + monitor_size.width as i32 + right_border - target_outer_width;
                }
                if cur_pos.y + target_outer_height > monitor_pos.y + monitor_size.height as i32 + border_y {
                    cur_pos.y = monitor_pos.y + monitor_size.height as i32 + border_y - target_outer_height;
                }
                if cur_pos.x < monitor_pos.x - left_border { 
                    cur_pos.x = monitor_pos.x - left_border; 
                }
                if cur_pos.y < monitor_pos.y - top_border { 
                    cur_pos.y = monitor_pos.y - top_border; 
                }
            }
        }

        let _ = main.set_size(tauri::Size::Logical(new_logical_size));
        let _ = main.set_position(tauri::Position::Physical(cur_pos));
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
        let _ = window.set_always_on_top(true);
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
        .always_on_top(true)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_dashboard_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("dashboard") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "dashboard",
            tauri::WebviewUrl::App("index.html".into())
        )
        .title("Dashboard")
        .inner_size(450.0, 800.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(false)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
