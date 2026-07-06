import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("Running ESLint before push...");

try {
  execSync("npm run lint", { stdio: "pipe", encoding: "utf-8" });
  console.log("ESLint passed.");
} catch (error) {
  console.error("\nESLint failed! Push cancelled.");
  console.error("Generating error report for AI...\n");

  const reportDir = path.resolve("ai-reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportContent = `hãy fix hết các lỗi sau đó báo cáo các feature bị ảnh hưởng khi fix xong:

${error.stdout || error.message}
`;

  const reportPath = path.join(reportDir, `eslint-error-${timestamp}.txt`);
  fs.writeFileSync(reportPath, reportContent, "utf-8");

  console.error(`Report generated at: ${reportPath}`);
  console.error("Please copy the content of this file and send it to the AI assistant to fix.");
  process.exit(1);
}
