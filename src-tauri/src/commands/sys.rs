use sysinfo::System;

#[tauri::command]
pub fn get_memory_usage() -> u64 {
    let mut sys = System::new_all();
    sys.refresh_all();
    // Return used memory in bytes (or KB/MB). We return KB.
    sys.used_memory() / 1024
}
