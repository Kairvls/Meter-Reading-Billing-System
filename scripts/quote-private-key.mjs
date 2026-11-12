import fs from "node:fs";

const path = ".env";
let t = fs.readFileSync(path, "utf8");

t = t.replace(
  /^FIREBASE_ADMIN_PRIVATE_KEY=(.*)$/m,
  (_match, value) => {
    let v = String(value).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return `FIREBASE_ADMIN_PRIVATE_KEY=${v}`;
    }
    v = v.replace(/"/g, '\\"');
    return `FIREBASE_ADMIN_PRIVATE_KEY="${v}"`;
  }
);

fs.writeFileSync(path, t);
console.log("PRIVATE_KEY_QUOTED");
