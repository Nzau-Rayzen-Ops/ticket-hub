const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

// Load server/.env explicitly
dotenv.config({
  path: path.join(__dirname, "..", ".env")
});

/* =========================
   VALIDATE DATABASE URL
========================= */

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not configured.");
}

/* =========================
   POSTGRESQL POOL
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false
        }
      : false,

  max: 20,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});

/* =========================
   CONNECTION
========================= */

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

/* =========================
   POOL ERROR
========================= */

pool.on("error", (error) => {
  console.error("❌ Unexpected PostgreSQL pool error:", error);
});

/* =========================
   EXPORT
========================= */

module.exports = pool;
