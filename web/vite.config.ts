import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@tauri-apps\/api\/.*/, replacement: path.resolve(__dirname, 'src/tauri-mock.ts') },
      { find: /^@tauri-apps\/plugin-.*/, replacement: path.resolve(__dirname, 'src/tauri-mock.ts') },
    ]
  },
  build: {
    outDir: 'dist',
  }
})
