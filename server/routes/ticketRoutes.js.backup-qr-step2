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
  lookupTicketByEmailAndEvent,

  createPendingPayment,
  getPendingPayments,
  confirmManualPayment,
  rejectManualPayment

} = require("../controllers/ticketController");

const {
  requireAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();


/* =========================
   CUSTOMER ROUTES
========================= */

router.post(
  "/",
  createTicket
);


router.post(
  "/manual-payment",
  createPendingPayment
);


/* =========================
   TICKET VERIFICATION
========================= */

router.post(
  "/verify",
  verifyTicket
);


router.post(
  "/verify-code",
  verifyTicketCode
);


/* =========================
   CUSTOMER LOOKUP
========================= */

router.get(
  "/lookup",
  lookupTicketByEmailAndEvent
);


/* =========================
   ADMIN DASHBOARD
========================= */

router.get(
  "/admin/dashboard",
  requireAdmin,
  getDashboardStats
);


router.get(
  "/admin/recent",
  requireAdmin,
  getRecentTickets
);


/* =========================
   MANUAL PAYMENTS
========================= */

router.get(
  "/admin/pending-payments",
  requireAdmin,
  getPendingPayments
);


router.post(
  "/admin/confirm-payment",
  requireAdmin,
  confirmManualPayment
);


router.delete(
  "/admin/reject-payment/:ticketId",
  requireAdmin,
  rejectManualPayment
);


/* =========================
   ADMIN TICKETS
========================= */

router.get(
  "/admin/all",
  requireAdmin,
  getAllTickets
);


router.get(
  "/deleted",
  requireAdmin,
  getDeletedTickets
);


router.delete(
  "/:ticketId/soft",
  requireAdmin,
  softDeleteTicket
);


router.put(
  "/:ticketId/restore",
  requireAdmin,
  restoreTicket
);


router.delete(
  "/:ticketId/permanent",
  requireAdmin,
  permanentDeleteTicket
);


/* =========================
   PUBLIC TICKET
========================= */

router.get(
  "/:ticketId",
  getTicket
);


module.exports = router;
