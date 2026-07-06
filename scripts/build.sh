#!/bin/bash
echo "Building Tauri app..."
npm run tauri build
echo "Opening bundle folder..."
open src-tauri/target/release/bundle/ || explorer.exe src-tauri/target/release/bundle/ || xdg-open src-tauri/target/release/bundle/
