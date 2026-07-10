import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("Auto-formatting and fixing lint errors...");
try {
  execSync("npm run format && npm run lint -- --fix", { stdio: "pipe", encoding: "utf-8" });
  console.log("Auto-format complete.\n");
} catch (error) {
  console.log("Auto-format encountered issues (some errors might need manual fixing).\n");
}

// Kiểm tra xem lệnh format có làm thay đổi file nào không
try {
  const changedFiles = execSync("git status -uno --porcelain", { encoding: "utf-8" });
  if (changedFiles.trim()) {
    console.log("Auto-format modified some files. Automatically committing them...");
    execSync("git add -u", { stdio: "pipe", encoding: "utf-8" });
    execSync('git commit -m "chore: auto-format code"', { stdio: "pipe", encoding: "utf-8" });
    console.log("Auto-format commit created successfully.\n");
    console.log(
      "⚠️ LƯU Ý: Git push sẽ không bao gồm commit auto-format này (vì hook chạy sau khi git lấy danh sách). Nó sẽ được đẩy lên ở lần push tiếp theo.\n",
    );
  }
} catch (e) {
  console.error("Failed to check or commit formatted files", e);
}

const checks = [
  { name: "ESLint", cmd: "npm run lint" },
  { name: "TypeScript", cmd: "npx tsc --noEmit" },
  { name: "Rust (Cargo Check)", cmd: "cargo check --manifest-path src-tauri/Cargo.toml" },
];

console.log("Running comprehensive pre-push checks...");

let failed = false;
let reportContent = `hãy fix hết các lỗi sau đó báo cáo các feature bị ảnh hưởng khi fix xong:\n\n`;

for (const check of checks) {
  console.log(`- Running ${check.name}...`);
  try {
    execSync(check.cmd, { stdio: "pipe", encoding: "utf-8" });
    console.log(`  ✓ ${check.name} passed.`);
  } catch (error) {
    console.error(`  ✗ ${check.name} failed!`);
    failed = true;
    reportContent += `====================================\n`;
    reportContent += `[FAILED CHECK]: ${check.name}\n`;
    reportContent += `[COMMAND]: ${check.cmd}\n`;
    reportContent += `====================================\n`;

    // Some commands output to stdout (like eslint/prettier), some to stderr (like cargo)
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";

    if (stdout.trim()) reportContent += `${stdout}\n`;
    if (stderr.trim()) reportContent += `${stderr}\n`;
    if (!stdout.trim() && !stderr.trim()) reportContent += `${error.message || "Unknown error"}\n`;

    reportContent += `\n`;
  }
}

if (failed) {
  console.error("\nSome checks failed! Push cancelled.");
  console.error("Generating comprehensive error report for AI...\n");

  const reportDir = path.resolve("ai-reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `prepush-error-${timestamp}.txt`);
  fs.writeFileSync(reportPath, reportContent, "utf-8");

  console.error(`Report generated at: ${reportPath}`);
  console.error("Please copy the content of this file and send it to the AI assistant to fix.");
  process.exit(1);
} else {
  console.log("\nAll checks passed successfully! Proceeding with push.");
}
