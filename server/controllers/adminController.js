const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* =========================
   ADMIN LOGIN
========================= */

function adminLogin(req, res) {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required."
      });
    }

    const adminEmail =
      process.env.ADMIN_EMAIL;

    const adminPasswordHash =
      process.env.ADMIN_PASSWORD_HASH;

    const jwtSecret =
      process.env.JWT_SECRET;

    /* =========================
       CONFIGURATION CHECK
    ========================= */

    if (
      !adminEmail ||
      !adminPasswordHash ||
      !jwtSecret
    ) {
      console.error(
        "Admin authentication configuration is incomplete."
      );

      return res.status(500).json({
        message:
          "Admin authentication is not configured."
      });
    }

    /* =========================
       EMAIL CHECK
    ========================= */

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      normalizedEmail !==
      adminEmail
        .trim()
        .toLowerCase()
    ) {
      return res.status(401).json({
        message:
          "Invalid admin credentials."
      });
    }

    /* =========================
       PASSWORD CHECK
    ========================= */

    const passwordCorrect =
      bcrypt.compareSync(
        password,
        adminPasswordHash
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        message:
          "Invalid admin credentials."
      });
    }

    /* =========================
       CREATE JWT
    ========================= */

    const token =
      jwt.sign(
        {
          email:
            adminEmail
              .trim()
              .toLowerCase(),

          role: "admin"
        },
        jwtSecret,
        {
          expiresIn: "8h"
        }
      );

    /* =========================
       COOKIE
    ========================= */

    const isProduction =
      process.env.NODE_ENV ===
      "production";

    res.cookie(
      "admin_token",
      token,
      {
        httpOnly: true,

        secure:
          isProduction,

        sameSite:
          isProduction
            ? "none"
            : "lax",

        maxAge:
          8 * 60 * 60 * 1000,

        path: "/"
      }
    );

    return res.json({
      authenticated: true,
      message:
        "Admin login successful."
    });

  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    return res.status(500).json({
      message:
        "Admin login failed."
    });
  }
}

/* =========================
   ADMIN LOGOUT
========================= */

function adminLogout(req, res) {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  res.clearCookie(
    "admin_token",
    {
      httpOnly: true,

      secure:
        isProduction,

      sameSite:
        isProduction
          ? "none"
          : "lax",

      path: "/"
    }
  );

  return res.json({
    authenticated: false,
    message:
      "Admin logged out successfully."
  });
}

/* =========================
   CHECK SESSION
========================= */

function getAdminSession(
  req,
  res
) {
  return res.json({
    authenticated: true,

    admin: {
      email:
        req.admin.email,

      role:
        req.admin.role
    }
  });
}

module.exports = {
  adminLogin,
  adminLogout,
  getAdminSession
};