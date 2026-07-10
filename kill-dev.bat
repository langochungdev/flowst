@echo off
echo Đang dọn dẹp các tiến trình bị treo...

echo 1. Đóng app Tauri (nếu còn kẹt)...
taskkill /F /IM tauri-app.exe /T >nul 2>&1

echo 2. Đóng Vite/NodeJS đang giữ port 1420...
taskkill /F /IM node.exe /T >nul 2>&1

echo Hoan thanh! Bay gio ban co the chay lai lenh "npm run tauri dev".
