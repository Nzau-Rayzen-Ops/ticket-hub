const express = require("express");

const {
  createTicket,
  getTicket,
  verifyTicket,
  verifyTicketCode,
  getDashboardStats,
  getRecentTickets,
  getAllTickets,
  softDeleteTicket,
  permanentDeleteTicket,
  getDeletedTickets,
  restoreTicket,
  lookupTicketByEmailAndEvent
} = require("../controllers/ticketController");

const {
  requireAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();


/* =========================
   PUBLIC TICKET ROUTES
========================= */

// Create customer ticket
router.post(
  "/",
  createTicket
);


// Step 1 — verify QR
router.post(
  "/verify",
  verifyTicket
);


// Step 2 — verify QR + 6-digit email code
router.post(
  "/verify-code",
  verifyTicketCode
);


// Lookup ticket
router.get(
  "/lookup",
  lookupTicketByEmailAndEvent
);


/* =========================
   ADMIN TICKET ROUTES

   IMPORTANT:
   These MUST come before
   /:ticketId
========================= */

// Admin dashboard statistics
router.get(
  "/admin/dashboard",
  requireAdmin,
  getDashboardStats
);


// Admin recent tickets
router.get(
  "/admin/recent",
  requireAdmin,
  getRecentTickets
);


// Admin all tickets
router.get(
  "/admin/all",
  requireAdmin,
  getAllTickets
);


// Deleted tickets
router.get(
  "/deleted",
  requireAdmin,
  getDeletedTickets
);


// Soft delete ticket
router.delete(
  "/:ticketId/soft",
  requireAdmin,
  softDeleteTicket
);


// Restore ticket
router.put(
  "/:ticketId/restore",
  requireAdmin,
  restoreTicket
);


// Permanently delete ticket
router.delete(
  "/:ticketId/permanent",
  requireAdmin,
  permanentDeleteTicket
);


/* =========================
   PUBLIC INDIVIDUAL TICKET
========================= */

// Individual ticket
// KEEP THIS AFTER ADMIN ROUTES
router.get(
  "/:ticketId",
  getTicket
);


module.exports = router;