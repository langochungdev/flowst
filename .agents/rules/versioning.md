# 6. Build script — build ra file cài được ngay

Yêu cầu: 1 lệnh build ra installer cho đúng OS đang chạy.

`scripts/build.sh` (Mac/Linux) và `scripts/build.ps1` (Windows) đều gọi:
```bash
npm run tauri build
```
Output installer nằm ở `src-tauri/target/release/bundle/`
(`.dmg`/`.app` trên Mac, `.msi`/`.exe` trên Windows — Tauri tự bundle
đúng theo OS đang build, cần build trên máy tương ứng hoặc CI riêng
cho từng OS vì không cross-compile được bundle native).

Thêm script tiện: `scripts/build.sh` tự mở folder bundle sau khi build
xong (dùng `open`/`explorer` tương ứng OS) để lấy file cài ngay.

---

# 7. Versioning & Changelog tự động theo commit

Bối cảnh: commit message theo prefix chuẩn Conventional Commits do
Antigravity tạo (`feat:`, `fix:`, `chore:`, `refactor:`...).

**Yêu cầu script `scripts/release.js`, chạy khi `git push` (qua Husky
pre-push hook):**

1. Lấy toàn bộ commit chưa push: `git log @{u}..HEAD --pretty=format:"%s"`
2. Phân loại theo prefix:
   - `feat:` → minor bump (0.X.0)
   - `fix:` → patch bump (0.0.X)
   - `BREAKING CHANGE` / `!:` → major bump (X.0.0)
   - Nếu có cả feat + fix → ưu tiên bump cao nhất (minor)
3. Đọc version hiện tại từ `package.json` + `src-tauri/tauri.conf.json`,
   tính version mới, ghi đè cả 2 file.
4. Gom toàn bộ commit theo nhóm, append vào `CHANGELOG.md`:
   ```markdown
   ## [0.2.0] - 2026-07-06
   ### Features
   - ...
   ### Fixes
   - ...
   ```
5. `git add` các file đã sửa (package.json, tauri.conf.json,
   CHANGELOG.md), tạo 1 commit `chore(release): v0.2.0`, rồi mới cho
   push tiếp tục.
