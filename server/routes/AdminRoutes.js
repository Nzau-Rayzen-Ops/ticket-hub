const express = require("express");

const {
  adminLogin,
  adminLogout,
  getAdminSession
} = require(
  "../controllers/adminController"
);

const {
  requireAdmin
} = require(
  "../middleware/authMiddleware"
);

const router =
  express.Router();

/* =========================
   PUBLIC ADMIN ROUTES
========================= */

/*
  POST /api/admin/login
*/
router.post(
  "/login",
  adminLogin
);

/* =========================
   PROTECTED ADMIN ROUTES
========================= */

/*
  GET /api/admin/session
*/
router.get(
  "/session",
  requireAdmin,
  getAdminSession
);

/*
  POST /api/admin/logout
*/
router.post(
  "/logout",
  requireAdmin,
  adminLogout
);

module.exports = router;