import { execSync, spawn } from "child_process";
import fs from "fs";

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

try {
  // 1. Read the target version from web/public/version.json
  const webVersionJsonPath = "./web/public/version.json";
  if (!fs.existsSync(webVersionJsonPath)) {
    console.log("No web/public/version.json found. Skipping release bump.");
    process.exit(0);
  }
  const nextVersion = JSON.parse(fs.readFileSync(webVersionJsonPath, "utf8")).version;

  // 2. Read current version from package.json
  const pkgPath = "./package.json";
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  const isVersionBump = pkg.version !== nextVersion;

  // 3. Get all unpushed commits for the changelog
  const commitsStr = run(`git log @{u}..HEAD --pretty=format:"%s"`);
  const features = [];
  const fixes = [];

  if (commitsStr) {
    const commits = commitsStr.split("\n");
    for (const msg of commits) {
      if (msg.startsWith("feat:") || msg.startsWith("feat(")) {
        features.push(msg);
      } else if (msg.startsWith("fix:") || msg.startsWith("fix(")) {
        fixes.push(msg);
      }
    }
  }

  if (features.length === 0 && fixes.length === 0) {
    console.log("No feat/fix commits. Skipping release.");
    process.exit(0);
  }

  if (isVersionBump) {
    console.log(`Bumping version from ${pkg.version} to ${nextVersion}`);
    // Update package.json
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

    // Update tauri.conf.json
    const tauriConfPath = "./src-tauri/tauri.conf.json";
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
    tauriConf.version = nextVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");

    // Update web version text file
    const webVersionTextPath = "./web/public/version";
    fs.writeFileSync(webVersionTextPath, nextVersion + "\n");
  } else {
    console.log(`Version is still ${pkg.version}. Adding commits to current changelog.`);
  }

  // 4. Update CHANGELOG.md
  let currentChangelog = "";
  if (fs.existsSync("./CHANGELOG.md")) {
    currentChangelog = fs.readFileSync("./CHANGELOG.md", "utf8");
  }

  const date = new Date().toISOString().split("T")[0];

  if (isVersionBump || !currentChangelog.includes(`## [${nextVersion}]`)) {
    let changelog = `## [${nextVersion}] - ${date}\n\n`;
    if (features.length > 0) {
      changelog += `### Features\n\n${features.map((f) => `- ${f}`).join("\n")}\n\n`;
    }
    if (fixes.length > 0) {
      changelog += `### Fixes\n\n${fixes.map((f) => `- ${f}`).join("\n")}\n\n`;
    }
    fs.writeFileSync("./CHANGELOG.md", changelog + currentChangelog);
  } else {
    const lines = currentChangelog.split("\n");
    let inSection = false;
    let featIndex = -1;
    let fixIndex = -1;
    let versionIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`## [${nextVersion}]`)) {
        inSection = true;
        versionIndex = i;
      } else if (lines[i].startsWith("## [") && inSection) {
        break;
      }
      if (inSection && lines[i].startsWith("### Features")) featIndex = i;
      if (inSection && lines[i].startsWith("### Fixes")) fixIndex = i;
    }

    // Insert fixes
    if (fixes.length > 0) {
      if (fixIndex !== -1) {
        lines.splice(fixIndex + 2, 0, ...fixes.map((f) => `- ${f}`));
      } else {
        const insertAt = featIndex !== -1 ? featIndex : versionIndex + 2;
        lines.splice(insertAt, 0, "### Fixes", "", ...fixes.map((f) => `- ${f}`), "");
      }
    }

    // Insert features (recalculate featIndex if we added fixes before it, but actually feat comes before fix usually. Let's just find featIndex again)
    featIndex = lines.findIndex(
      (l, idx) =>
        idx > versionIndex &&
        l.startsWith("### Features") &&
        !lines.slice(versionIndex + 1, idx).some((x) => x.startsWith("## [")),
    );

    if (features.length > 0) {
      if (featIndex !== -1) {
        lines.splice(featIndex + 2, 0, ...features.map((f) => `- ${f}`));
      } else {
        lines.splice(versionIndex + 2, 0, "### Features", "", ...features.map((f) => `- ${f}`), "");
      }
    }

    fs.writeFileSync("./CHANGELOG.md", lines.join("\n"));
  }

  // 5. Commit changes
  run(
    "git add package.json src-tauri/tauri.conf.json CHANGELOG.md web/public/version.json web/public/version",
  );
  run(`git commit -m "chore(release): v${nextVersion}"`);
  console.log("Release commit created successfully.");

  // 6. Push the release commit automatically in the background
  console.log("Scheduling background push for release commit...");
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
  const child = spawn("node", ["-e", pushScript], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log("Release commit will be pushed shortly.");
} catch (error) {
  console.log("Release script error or skipped:", error.message);
}
