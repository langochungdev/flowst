// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Disable unnecessary WebView2 features to save RAM (Aggressive optimization)
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--disable-features=Translate,OptimizationHints,MediaRouter \
         --disable-extensions --disable-component-update \
         --disable-background-networking --disable-sync \
         --disable-site-isolation-trials \
         --renderer-process-limit=1 \
         --js-flags=\"--max-old-space-size=50\""
    );
    
    tauri_app_lib::run()
}
