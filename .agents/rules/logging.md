# 5. Logging strategy (dev-only, không tốn RAM ở prod)

- Tạo wrapper `src/lib/log.ts`:
  ```ts
  const isDev = import.meta.env.DEV;
  export const log = {
    debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
    error: (...args: unknown[]) => { if (isDev) console.error(...args); /* vẫn log error ở prod nếu cần crash report */ },
  };
  ```
- Rust: dùng `log::debug!()` macro chuẩn, cấu hình `tauri-plugin-log` chỉ
  ghi level `debug` khi build có `debug_assertions`, prod chỉ giữ `warn`/`error`.
- AI code phải tự thêm `log.debug(...)` vào: state transition của timer,
  mỗi command Rust được gọi, mọi nhánh catch error, thao tác file I/O.
- Vì code bị strip theo `if (isDev)` / `cfg!(debug_assertions)`, prod build
  không tốn RAM cho log thừa.
