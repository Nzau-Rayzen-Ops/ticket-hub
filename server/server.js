const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const dotenv = require("dotenv");

/* =========================
   LOAD ENVIRONMENT
========================= */

dotenv.config({
  path: path.join(__dirname, ".env")
});

const ticketRoutes = require("./routes/ticketRoutes");
const eventRoutes = require("./routes/eventRoutes");
const mpesaRoutes = require("./routes/mpesaRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/AdminRoutes");

/* =========================
   START VERIFICATION SCHEDULER
========================= */

require("./services/eventScheduler");

/* =========================
   EXPRESS
========================= */

const app = express();

/* =========================
   CORS
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL
    .replace(/\/$/, "");

  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

console.log(
  "Allowed frontend origins:",
  allowedOrigins
);

app.use(
  cors({
    origin: function (origin, callback) {

      /*
        Allow requests with no Origin header.
        Useful for Postman/server-to-server requests.
      */

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        "Blocked CORS origin:",
        origin
      );

      return callback(
        new Error("CORS origin not allowed.")
      );
    },

    credentials: true
  })
);

/* =========================
   BODY PARSERS
========================= */

app.use(express.json({
  limit: "1mb"
}));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

app.use(cookieParser());

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TicketHub API is running.",
    environment:
      process.env.NODE_ENV || "development"
  });
});

app.get("/api/health", async (req, res) => {

  try {

    const pool =
      require("./config/db");

    await pool.query("SELECT 1");

    res.json({
      success: true,
      status: "OK",
      database: "PostgreSQL",
      message: "TicketHub API is healthy."
    });

  } catch (error) {

    console.error(
      "Health check database error:",
      error
    );

    res.status(503).json({
      success: false,
      status: "ERROR",
      database: "Unavailable",
      message: "Database connection failed."
    });
  }
});

/* =========================
   API ROUTES
========================= */

app.use(
  "/api/tickets",
  ticketRoutes
);

app.use(
  "/api/events",
  eventRoutes
);

app.use(
  "/api/mpesa",
  mpesaRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {

  res.status(404).json({
    success: false,
    message:
      "API route not found."
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use(
  (err, req, res, next) => {

    console.error(
      "Server error:",
      err
    );

    if (
      err.message ===
      "CORS origin not allowed."
    ) {

      return res.status(403).json({
        success: false,
        message:
          "CORS origin not allowed."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error."
          : err.message ||
            "Internal server error."
    });
  }
);

/* =========================
   START SERVER
========================= */

const PORT =
  Number(process.env.PORT) || 5000;

app.listen(PORT, () => {

  console.log(
    "=========================================="
  );

  console.log(
    "🚀 TicketHub API started"
  );

  console.log(
    `🌐 Port: ${PORT}`
  );

  console.log(
    `🌍 Environment: ${
      process.env.NODE_ENV || "development"
    }`
  );

  console.log(
    `💳 M-Pesa environment: ${
      process.env.MPESA_ENVIRONMENT || "sandbox"
    }`
  );

  console.log(
    `🔗 Backend URL: ${
      process.env.BACKEND_URL ||
      "NOT SET"
    }`
  );

  console.log(
    `🌐 Frontend URL: ${
      process.env.FRONTEND_URL ||
      "NOT SET"
    }`
  );

  console.log(
    `📧 Email configured: ${
      process.env.EMAIL_USER
        ? "YES"
        : "NO"
    }`
  );

  console.log(
    "🔐 Admin authentication enabled."
  );

  console.log(
    "🎟️ Event verification scheduler enabled."
  );

  console.log(
    "🗄️ Database: PostgreSQL"
  );

  console.log(
    "=========================================="
  );
});