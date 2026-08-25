const jwt = require("jsonwebtoken");

/* =========================
   REQUIRE ADMIN
========================= */

function requireAdmin(req, res, next) {
  try {
    const token =
      req.cookies?.admin_token;

    if (!token) {
      return res.status(401).json({
        authenticated: false,
        message:
          "Admin authentication required."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is not configured."
      );

      return res.status(500).json({
        authenticated: false,
        message:
          "Authentication system is not configured."
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (
      !decoded ||
      decoded.role !== "admin" ||
      !decoded.email
    ) {
      return res.status(403).json({
        authenticated: false,
        message:
          "Admin access denied."
      });
    }

    req.admin = decoded;

    next();

  } catch (error) {
    console.error(
      "Admin authentication error:",
      error.message
    );

    return res.status(401).json({
      authenticated: false,
      message:
        "Invalid or expired admin session."
    });
  }
}

module.exports = {
  requireAdmin
};