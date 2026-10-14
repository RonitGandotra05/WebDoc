import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const roots = execFileSync("npm", ["ls", "--all", "--omit=dev", "--parseable"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .slice(1);
let output =
  "WebDoc dependency notices\n\nComponents retain their respective license and copyright terms.\n\n";
for (const root of [...new Set(roots)]) {
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  const files = (await fs.readdir(root)).filter(
    (file) =>
      /^(license|licence|copying)([.\-]|$)/i.test(file) ||
      file === "DOCX-ENGINE-LICENSE.md" ||
      file === "NOTICE.md",
  );
  output += `\n${"=".repeat(72)}\n${pkg.name} ${pkg.version}\nLicense: ${JSON.stringify(pkg.license || "See included package terms")}\n`;
  for (const file of files) {
    if ((await fs.stat(path.join(root, file))).isFile())
      output += `\n${file}\n${await fs.readFile(path.join(root, file), "utf8")}\n`;
  }
}
await fs.writeFile(
  "public/legal/DEPENDENCIES.txt",
  output.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trimEnd() + "\n",
);
console.log(
  "Bundled notices for",
  roots.length,
  "installed production package paths.",
);
