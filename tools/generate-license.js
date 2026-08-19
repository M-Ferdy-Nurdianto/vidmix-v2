#!/usr/bin/env node
/**
 * VidMix v2 - License Key Generator (Developer Tool)
 * 
 * Usage:
 *   node tools/generate-license.js --type 2w --token <GITHUB_TOKEN> --gist <GIST_ID>
 *   node tools/generate-license.js --type 1m --token <GITHUB_TOKEN> --gist <GIST_ID>
 *   node tools/generate-license.js --type lifetime --token <GITHUB_TOKEN> --gist <GIST_ID>
 *   node tools/generate-license.js --list --token <GITHUB_TOKEN> --gist <GIST_ID>
 *   node tools/generate-license.js --init --token <GITHUB_TOKEN>  (create new Gist)
 */

const https = require("https");
const crypto = require("crypto");

const GIST_FILENAME = "vidmix-licenses.json";
const LICENSE_TYPES = {
  "2w": { label: "2 Minggu", days: 14 },
  "1m": { label: "1 Bulan", days: 30 },
  "lifetime": { label: "Lifetime", days: null },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
    }
  }
  return result;
}

function generateKey(type) {
  const typeCode = type === "lifetime" ? "LT" : type.toUpperCase();
  const randomBytes = crypto.randomBytes(6).toString("hex").toUpperCase();
  const seg1 = randomBytes.slice(0, 4);
  const seg2 = randomBytes.slice(4, 8);
  const checksum = crypto
    .createHash("md5")
    .update(`${typeCode}-${seg1}-${seg2}`)
    .digest("hex")
    .slice(0, 4)
    .toUpperCase();
  return `VIDMIX-${typeCode}-${seg1}-${seg2}-${checksum}`;
}

function gistRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "User-Agent": "VidMix-License-Tool/1.0",
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getGist(token, gistId) {
  const res = await gistRequest("GET", `/gists/${gistId}`, token);
  if (res.status !== 200) throw new Error(`Gagal fetch Gist: ${res.status}`);
  const content = res.body.files[GIST_FILENAME]?.content;
  if (!content) throw new Error(`File ${GIST_FILENAME} tidak ditemukan di Gist`);
  return JSON.parse(content);
}

async function updateGist(token, gistId, db) {
  const res = await gistRequest("PATCH", `/gists/${gistId}`, token, {
    files: { [GIST_FILENAME]: { content: JSON.stringify(db, null, 2) } },
  });
  if (res.status !== 200) throw new Error(`Gagal update Gist: ${res.status}`);
  return res.body;
}

async function createGist(token) {
  const initialDb = { licenses: {}, version: 1 };
  const res = await gistRequest("POST", "/gists", token, {
    description: "VidMix v2 License Database (DO NOT SHARE)",
    public: false,
    files: { [GIST_FILENAME]: { content: JSON.stringify(initialDb, null, 2) } },
  });
  if (res.status !== 201) throw new Error(`Gagal buat Gist: ${res.status}`);
  return res.body;
}

async function cmdInit(token) {
  console.log("Membuat Gist baru untuk database lisensi...");
  const gist = await createGist(token);
  console.log("\n=== BERHASIL! Simpan info berikut ===\n");
  console.log("GIST_ID  :", gist.id);
  console.log("GIST_URL :", gist.html_url);
  console.log("RAW_URL  :", `https://gist.githubusercontent.com/raw/${gist.id}/${GIST_FILENAME}`);
  console.log("\nMasukkan GIST_ID dan GITHUB_TOKEN ke file: electron/license-config.js");
}

async function cmdGenerate(type, token, gistId) {
  if (!LICENSE_TYPES[type]) { console.error("Tipe tidak valid:", type); process.exit(1); }
  console.log(`\nGenerating license key [${LICENSE_TYPES[type].label}]...`);
  const db = await getGist(token, gistId);
  const key = generateKey(type);
  const issuedAt = new Date().toISOString().split("T")[0];
  db.licenses[key] = { type, label: LICENSE_TYPES[type].label, issuedAt, activatedBy: null, activatedAt: null, deviceId: null, expiresAt: null };
  await updateGist(token, gistId, db);
  console.log("\n=== LICENSE KEY ===");
  console.log("KEY    :", key);
  console.log("TYPE   :", LICENSE_TYPES[type].label);
  console.log("ISSUED :", issuedAt);
  console.log("==================\n");
}

async function cmdList(token, gistId) {
  const db = await getGist(token, gistId);
  const keys = Object.entries(db.licenses);
  console.log(`\nTotal lisensi: ${keys.length}\n`);
  for (const [key, data] of keys) {
    const expired = data.expiresAt && new Date(data.expiresAt) < new Date();
    const status = !data.activatedAt ? "BELUM DIPAKAI" : expired ? "EXPIRED" : "AKTIF";
    console.log(`[${status}] ${key} | ${data.label} | Issued: ${data.issuedAt}${data.activatedAt ? ` | Aktivasi: ${data.activatedAt} | Device: ${data.deviceId} | Expired: ${data.expiresAt || "Lifetime"}` : ""}`);
  }
  console.log("");
}

async function cmdRevoke(key, token, gistId) {
  const db = await getGist(token, gistId);
  if (!db.licenses[key]) { console.error("Key tidak ditemukan:", key); process.exit(1); }
  delete db.licenses[key];
  await updateGist(token, gistId, db);
  console.log("Key berhasil dihapus:", key);
}

async function main() {
  const args = parseArgs();
  if (!args.token) { console.error("--token wajib. Buat di: https://github.com/settings/tokens (scope: gist)"); process.exit(1); }
  try {
    if (args.init) { await cmdInit(args.token); }
    else if (args.list) { if (!args.gist) { console.error("--gist diperlukan"); process.exit(1); } await cmdList(args.token, args.gist); }
    else if (args.type) { if (!args.gist) { console.error("--gist diperlukan"); process.exit(1); } await cmdGenerate(args.type, args.token, args.gist); }
    else if (args.revoke) { if (!args.gist) { console.error("--gist diperlukan"); process.exit(1); } await cmdRevoke(args.revoke, args.token, args.gist); }
    else { console.log("Perintah: --init | --type <2w|1m|lifetime> | --list | --revoke <KEY>  (+ --token dan --gist)"); }
  } catch (err) { console.error("Error:", err.message); process.exit(1); }
}

main();
