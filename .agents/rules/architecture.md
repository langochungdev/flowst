# 4. Kiến trúc & Rule cho AI code

## 4.1 Ranh giới BE (Rust) / FE (TypeScript) — QUAN TRỌNG NHẤT

**Rust CHỈ làm:**
- File I/O (đọc/ghi SQLite, JSON settings)
- Window/tray control (always-on-top, resize, thumbnail toolbar)
- OS-level API (autostart, native notification)
- Command trả về "ngu" — CRUD thuần, không tính toán nghiệp vụ

**Frontend làm TẤT CẢ business logic:**
- Thuật toán auto-split, Pomodoro state machine, format dữ liệu chart,
  tính contribution graph, validate import/export

→ Rule bắt buộc: khi thêm feature mới, ưu tiên viết 100% ở FE. Chỉ đụng
Rust khi cần OS API mới hoàn toàn chưa có command tương ứng.

## 4.2 Cấu trúc thư mục

```
src/                      # Frontend
  components/             # UI components dùng chung
  features/
    pomodoro/              # timer, auto-split logic, state machine
    dashboard/              # chart, contribution graph
    settings/               # settings form, import/export
    debug/                   # debug panel (dev only)
  lib/
    pomodoro/autoSplit.ts
    db/                      # wrapper gọi SQL qua tauri-plugin-sql
    log.ts                   # wrapper log, no-op khi PROD
  stores/                  # zustand stores

src-tauri/
  src/
    commands/               # mỗi file = 1 nhóm command (db.rs, window.rs, sys.rs)
    main.rs
  Cargo.toml

.agents/
  rules/
    architecture.md         # file này
    logging.md
    versioning.md
  PLAN.md                   # kế hoạch code theo thứ tự feature

scripts/
  build.sh / build.ps1
  release.js                # version bump + changelog
```

## 4.3 Rule thêm feature mới
1. Xác định feature thuộc `features/<tên>` — tạo folder riêng nếu chưa có.
2. Logic thuần (không UI) → đặt trong `lib/`, viết unit test nếu là thuật toán.
3. Chỉ tạo Rust command mới khi thực sự cần OS/file API chưa tồn tại.
4. Mọi command Rust mới phải log input/output qua log wrapper (mục 5).
5. Không sửa file ngoài phạm vi feature đang làm — nếu cần sửa chung
   (store, type dùng chung) thì tách commit riêng.
