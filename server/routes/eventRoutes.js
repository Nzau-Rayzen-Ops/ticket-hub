const express = require("express");

const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} = require("../controllers/eventController");

const {
  requireAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();


/* =========================
   PUBLIC EVENTS
========================= */

router.get("/", getEvents);

router.get("/:id", getEvent);


/* =========================
   ADMIN EVENT MANAGEMENT
========================= */

router.post(
  "/",
  requireAdmin,
  createEvent
);

router.put(
  "/:id",
  requireAdmin,
  updateEvent
);

router.delete(
  "/:id",
  requireAdmin,
  deleteEvent
);


module.exports = router;