Write-Host "Building Tauri app..."
npm run tauri build
Write-Host "Opening bundle folder..."
Invoke-Item "src-tauri\target\release\bundle"
