import { execSync, spawn, exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
import fs from "fs";
import path from "path";

console.log("Auto-formatting and fixing lint errors...");
try {
  execSync("npm run format && npm run lint -- --fix", { stdio: "pipe", encoding: "utf-8" });
  console.log("Auto-format complete.\n");
} catch {
  console.log("Auto-format encountered issues (some errors might need manual fixing).\n");
}

let autoFormatCommitted = false;

// Kiểm tra xem lệnh format có làm thay đổi file nào không
try {
  const changedFiles = execSync("git status -uno --porcelain", { encoding: "utf-8" });
  if (changedFiles.trim()) {
    console.log("Auto-format modified some files. Automatically committing them...");
    execSync("git add -u", { stdio: "pipe", encoding: "utf-8" });
    execSync('git commit -m "chore: auto-format code"', { stdio: "pipe", encoding: "utf-8" });
    console.log("Auto-format commit created successfully.\n");
    autoFormatCommitted = true;
  }
} catch (e) {
  console.error("Failed to check or commit formatted files", e);
}

const checks = [
  { name: "ESLint", cmd: "npm run lint" },
  { name: "TypeScript", cmd: "npx tsc --noEmit" },
  { name: "Rust (Cargo Check)", cmd: "cargo check --manifest-path src-tauri/Cargo.toml" },
];

console.log("Running comprehensive pre-push checks (in parallel)...");

let failed = false;
let reportContent = `hãy fix hết các lỗi sau đó báo cáo các feature bị ảnh hưởng khi fix xong:\n\n`;

const results = await Promise.all(
  checks.map(async (check) => {
    console.log(`- Started ${check.name}...`);
    try {
      await execAsync(check.cmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
      console.log(`  ✓ ${check.name} passed.`);
      return { check, passed: true };
    } catch (error) {
      console.error(`  ✗ ${check.name} failed!`);
      return { check, passed: false, error };
    }
  })
);

for (const result of results) {
  if (!result.passed) {
    failed = true;
    reportContent += `====================================\n`;
    reportContent += `[FAILED CHECK]: ${result.check.name}\n`;
    reportContent += `[COMMAND]: ${result.check.cmd}\n`;
    reportContent += `====================================\n`;

    const stdout = result.error.stdout ? result.error.stdout.toString() : "";
    const stderr = result.error.stderr ? result.error.stderr.toString() : "";

    if (stdout.trim()) reportContent += `${stdout}\n`;
    if (stderr.trim()) reportContent += `${stderr}\n`;
    if (!stdout.trim() && !stderr.trim()) reportContent += `${result.error.message || "Unknown error"}\n`;

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
  if (autoFormatCommitted) {
    console.log("Scheduling background push for auto-format commit...");
    const pushScript = `
      const { execSync } = require('child_process');
      let retries = 5;
      const tryPush = () => {
        try {
          execSync('git push --no-verify', { stdio: 'ignore' });
        } catch (e) {
          if (retries-- > 0) setTimeout(tryPush, 4000);
        }
      };
      setTimeout(tryPush, 4000);
    `;
    const child = spawn("node", ["-e", pushScript], { detached: true, stdio: "ignore" });
    child.unref();
  }
}
