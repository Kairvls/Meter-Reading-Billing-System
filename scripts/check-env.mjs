import fs from "node:fs";

const t = fs.readFileSync(".env", "utf8");
const api = (t.match(/^NEXT_PUBLIC_FIREBASE_API_KEY=(.*)$/m)?.[1] || "").trim();
const pkLine = (t.match(/^FIREBASE_ADMIN_PRIVATE_KEY=(.*)$/m)?.[1] || "").trim();

console.log("API_KEY_LEN=" + api.length);
console.log("API_KEY_OK=" + (api.length > 20 && !api.endsWith("...")));
console.log("PK_QUOTED=" + (pkLine.startsWith('"') || pkLine.startsWith("'")));
console.log("PK_HAS_BEGIN=" + pkLine.includes("BEGIN PRIVATE KEY"));
console.log("PK_HAS_END=" + pkLine.includes("END PRIVATE KEY"));
console.log(
  "HAS_PROJECT=" + t.includes("FIREBASE_ADMIN_PROJECT_ID=meter-reading-f1e72")
);
console.log(
  "HAS_EMAIL=" + t.includes("FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk")
);
