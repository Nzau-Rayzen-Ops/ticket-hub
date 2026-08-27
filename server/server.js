const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const dotenv = require("dotenv");

/* =========================
   LOAD SERVER ENVIRONMENT
========================= */

dotenv.config({
  path: path.join(__dirname, ".env")
});

const db = require("./config/db");

const ticketRoutes = require("./routes/ticketRoutes");
const eventRoutes = require("./routes/eventRoutes");
const mpesaRoutes = require("./routes/mpesaRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/AdminRoutes");

// Start event verification scheduler
require("./services/eventScheduler");

const app = express();

/* =========================
   SECURITY / MIDDLEWARE
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(
    process.env.FRONTEND_URL.replace(/\/$/, "")
  );
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // such as Postman/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed.")
      );
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================
   API HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "TicketHub API is healthy."
  });
});

/* =========================
   API ROUTES
========================= */

app.use("/api/tickets", ticketRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

/* =========================
   SERVE REACT FRONTEND
========================= */

const frontendPath = path.join(__dirname, "..", "dist");

app.use(express.static(frontendPath));

/*
   React Router fallback.
   API routes are handled above.
   Any non-API route is sent to React.
*/

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(
    path.join(frontendPath, "index.html"),
    (err) => {
      if (err) {
        next(err);
      }
    }
  );
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (err.message === "CORS origin not allowed.") {
    return res.status(403).json({
      message: "CORS origin not allowed."
    });
  }

  res.status(500).json({
    message: "Internal server error."
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Admin authentication enabled.");
  console.log("Event verification scheduler enabled.");

  console.log(
    `Email configured: ${
      process.env.EMAIL_USER ? "YES" : "NO"
    }`
  );

  console.log(
    `Email password configured: ${
      process.env.EMAIL_PASSWORD ? "YES" : "NO"
    }`
  );
});
