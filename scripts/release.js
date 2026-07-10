import { execSync, spawn } from "child_process";
import fs from "fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

try {
  // 1. Get all unpushed commits
  const commitsStr = run(`git log @{u}..HEAD --pretty=format:"%s"`);
  if (!commitsStr) {
    console.log("No new commits to release.");
    process.exit(0);
  }

  const commits = commitsStr.split("\n");

  // 2. Classify commits
  let major = false;
  let minor = false;
  let patch = false;

  const features = [];
  const fixes = [];

  for (const msg of commits) {
    if (msg.includes("BREAKING CHANGE") || msg.includes("!:")) {
      major = true;
    } else if (msg.startsWith("feat:") || msg.startsWith("feat(")) {
      minor = true;
      features.push(msg);
    } else if (msg.startsWith("fix:") || msg.startsWith("fix(")) {
      patch = true;
      fixes.push(msg);
    }
  }

  if (!major && !minor && !patch) {
    console.log("No feat/fix/breaking commits. Skipping release bump.");
    process.exit(0);
  }

  // 3. Bump version
  const pkgPath = "./package.json";
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const [vMajor, vMinor, vPatch] = pkg.version.split(".").map(Number);

  let nextVersion;
  if (major) {
    nextVersion = `${vMajor + 1}.0.0`;
  } else if (minor) {
    nextVersion = `${vMajor}.${vMinor + 1}.0`;
  } else {
    nextVersion = `${vMajor}.${vMinor}.${vPatch + 1}`;
  }

  console.log(`Bumping version from ${pkg.version} to ${nextVersion}`);

  // Update package.json
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // Update tauri.conf.json
  const tauriConfPath = "./src-tauri/tauri.conf.json";
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  tauriConf.version = nextVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");

  // 4. Update CHANGELOG.md
  const date = new Date().toISOString().split("T")[0];
  let changelog = `## [${nextVersion}] - ${date}\n`;
  if (features.length > 0) {
    changelog += `### Features\n${features.map((f) => `- ${f}`).join("\n")}\n`;
  }
  if (fixes.length > 0) {
    changelog += `### Fixes\n${fixes.map((f) => `- ${f}`).join("\n")}\n`;
  }
  changelog += "\n";

  let currentChangelog = "";
  if (fs.existsSync("./CHANGELOG.md")) {
    currentChangelog = fs.readFileSync("./CHANGELOG.md", "utf8");
  }
  fs.writeFileSync("./CHANGELOG.md", changelog + currentChangelog);

  // 5. Commit changes
  run("git add package.json src-tauri/tauri.conf.json CHANGELOG.md");
  run(`git commit -m "chore(release): v${nextVersion}"`);
  console.log("Release commit created successfully.");

  // 6. Push the release commit automatically in the background
  console.log("Scheduling background push for release commit...");
  const pushScript = `setTimeout(() => { const { execSync } = require('child_process'); try { execSync('git push --no-verify'); } catch (e) {} }, 3000);`;
  const child = spawn("node", ["-e", pushScript], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log("Release commit will be pushed shortly.");
} catch (error) {
  console.log("Release script error or skipped:", error.message);
}
