import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const path = ".env";
let t = readFileSync(path, "utf8");

if (!t.includes("AUTH_SECRET=")) {
  t += `\nAUTH_SECRET="${randomBytes(32).toString("base64")}"\n`;
}
if (!t.includes("ADMIN_USERNAME=")) {
  t += "ADMIN_USERNAME=admin\n";
}
if (!t.includes("ADMIN_PASSWORD=")) {
  t += "ADMIN_PASSWORD=admin123\n";
}

writeFileSync(path, t);
console.log("AUTH_ENV_OK");
