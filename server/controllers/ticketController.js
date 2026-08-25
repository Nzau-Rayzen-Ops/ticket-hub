const crypto = require("crypto");
const db = require("../database");
const { sendTicketEmail } = require("../services/emailService");

/* =========================
   SECURITY HELPERS
========================= */

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function generateVerificationCode() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

/* =========================
   CREATE TICKET
========================= */

async function createTicket(req, res) {
  try {
    const {
      eventId,
      eventTitle,
      ticketType,
      price,
      quantity,
      customerName,
      customerEmail,
      customerPhone,
      idempotencyKey
    } = req.body;

    if (
      !eventId ||
      !eventTitle ||
      !ticketType ||
      price === undefined ||
      !quantity ||
      !customerName ||
      !customerEmail ||
      !customerPhone
    ) {
      return res.status(400).json({
        message: "All ticket information is required."
      });
    }

    const finalIdempotencyKey =
      idempotencyKey ||
      `${customerEmail}-${eventId}-${Date.now()}`;

    /* =========================
       IDEMPOTENCY CHECK
    ========================= */

    const existing = db.prepare(
      "SELECT * FROM tickets WHERE idempotency_key = ?"
    ).get(finalIdempotencyKey);

    if (existing) {
      return res.status(200).json({
        message: "Ticket already created",
        ticket: existing
      });
    }

    /* =========================
       RECENT DUPLICATE CHECK
    ========================= */

    const fiveMinutesAgo =
      new Date(
        Date.now() - 5 * 60 * 1000
      ).toISOString();

    const recentDuplicate = db.prepare(`
      SELECT *
      FROM tickets
      WHERE customer_email = ?
      AND event_id = ?
      AND created_at >= ?
      AND payment_status = 'PAID'
      AND deleted_at IS NULL
    `).get(
      customerEmail,
      String(eventId),
      fiveMinutesAgo
    );

    if (recentDuplicate) {
      return res.status(409).json({
        message:
          "You already purchased tickets for this event recently. Please check your email for your ticket.",
        duplicate: true,
        ticket: recentDuplicate
      });
    }

    /* =========================
       CHECK EVENT
    ========================= */

    const event = db.prepare(
      "SELECT * FROM events WHERE id = ?"
    ).get(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    /* =========================
       VALIDATE NUMBERS
    ========================= */

    const ticketQuantity = Number(quantity);
    const ticketPrice = Number(price);

    if (
      !Number.isInteger(ticketQuantity) ||
      ticketQuantity <= 0 ||
      !Number.isFinite(ticketPrice) ||
      ticketPrice < 0
    ) {
      return res.status(400).json({
        message: "Invalid ticket quantity or price."
      });
    }

    if (
      ticketQuantity >
      event.available_tickets
    ) {
      return res.status(400).json({
        message:
          "Not enough tickets available. Only " +
          event.available_tickets +
          " ticket(s) remaining."
      });
    }

    /* =========================
       SECURE TICKET ID
    ========================= */

    const ticketId =
      "TKT-" +
      crypto
        .randomBytes(12)
        .toString("hex")
        .toUpperCase();

    /* =========================
       SECURE QR TOKEN
    ========================= */

    const qrToken =
      generateRandomToken(32);

    const qrTokenHash =
      hashValue(qrToken);

    /* =========================
       CREATE TICKET
    ========================= */

    const createTicketTransaction =
      db.transaction(() => {

        const latestEvent = db.prepare(
          "SELECT available_tickets FROM events WHERE id = ?"
        ).get(eventId);

        if (!latestEvent) {
          throw new Error("Event not found.");
        }

        if (
          ticketQuantity >
          latestEvent.available_tickets
        ) {
          throw new Error(
            "Not enough tickets available. Only " +
            latestEvent.available_tickets +
            " ticket(s) remaining."
          );
        }

        db.prepare(
          "INSERT INTO tickets " +
          "(ticket_id, event_id, event_title, ticket_type, price, quantity, " +
          "customer_name, customer_email, customer_phone, payment_status, " +
          "ticket_status, idempotency_key, qr_token_hash) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          ticketId,
          String(eventId),
          event.title,
          ticketType,
          ticketPrice,
          ticketQuantity,
          customerName,
          customerEmail,
          customerPhone,
          "PAID",
          "VALID",
          finalIdempotencyKey,
          qrTokenHash
        );

        db.prepare(
          "UPDATE events " +
          "SET available_tickets = available_tickets - ? " +
          "WHERE id = ?"
        ).run(
          ticketQuantity,
          eventId
        );
      });

    createTicketTransaction();

    /* =========================
       GET CREATED TICKET
    ========================= */

    const ticket = db.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ?"
    ).get(ticketId);

    /*
      qrToken is returned only at creation time.
      It is NOT stored in the database in plaintext.
    */

    const ticketForEmail = {
      ...ticket,
      qrToken
    };

    /* =========================
       SEND EMAIL
    ========================= */

    try {
      await sendTicketEmail(ticketForEmail);

      return res.status(201).json({
        message:
          "Ticket created and email sent successfully.",

        ticket: {
          ...ticket,
          qrToken
        }
      });

    } catch (emailError) {

      console.error(
        "Email error:",
        emailError
      );

      return res.status(201).json({
        message:
          "Ticket created, but email could not be sent.",

        ticket: {
          ...ticket,
          qrToken
        }
      });
    }

  } catch (error) {

    console.error(
      "Create ticket error:",
      error
    );

    return res.status(500).json({
      message: "Failed to create ticket."
    });
  }
}

/* =========================
   GET SINGLE TICKET
========================= */

function getTicket(req, res) {
  try {

    const ticket = db.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ?"
    ).get(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found."
      });
    }

    /*
      Never return QR secret through
      the normal ticket lookup endpoint.
    */

    delete ticket.qr_token_hash;
    delete ticket.verification_code_hash;

    res.json(ticket);

  } catch (error) {

    console.error(
      "Get ticket error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to retrieve ticket."
    });
  }
}

/* =========================
   VERIFY QR
========================= */

function verifyTicket(req, res) {
  try {

    const { qrToken } = req.body;

    if (
      !qrToken ||
      typeof qrToken !== "string"
    ) {
      return res.status(400).json({
        valid: false,
        requiresCode: false,
        message: "Invalid QR code."
      });
    }

    const qrTokenHash =
      hashValue(qrToken.trim());

    const ticket = db.prepare(`
      SELECT
        id,
        event_id,
        event_title,
        ticket_type,
        quantity,
        customer_name,
        payment_status,
        ticket_status,
        verification_attempts
      FROM tickets
      WHERE qr_token_hash = ?
      AND deleted_at IS NULL
    `).get(qrTokenHash);

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        requiresCode: false,
        message:
          "Invalid or unknown ticket QR code."
      });
    }

    if (
      ticket.payment_status !== "PAID"
    ) {
      return res.status(400).json({
        valid: false,
        requiresCode: false,
        message:
          "Payment has not been confirmed."
      });
    }

    if (
      ticket.ticket_status === "USED"
    ) {
      return res.status(400).json({
        valid: false,
        requiresCode: false,
        message:
          "This ticket has already been used."
      });
    }

    if (
      ticket.ticket_status !== "VALID"
    ) {
      return res.status(400).json({
        valid: false,
        requiresCode: false,
        message:
          "This ticket is not valid."
      });
    }

    res.json({
      valid: false,
      requiresCode: true,

      message:
        "QR code recognized. Enter the 6-digit verification code sent to the ticket holder.",

      ticket: {
        event_title: ticket.event_title,
        ticket_type: ticket.ticket_type,
        quantity: ticket.quantity
      }
    });

  } catch (error) {

    console.error(
      "QR verification error:",
      error
    );

    res.status(500).json({
      valid: false,
      requiresCode: false,
      message:
        "Ticket verification failed."
    });
  }
}

/* =========================
   VERIFY QR + CODE
========================= */

function verifyTicketCode(req, res) {
  try {

    const {
      qrToken,
      verificationCode
    } = req.body;

    if (
      !qrToken ||
      !verificationCode
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "QR code and verification code are required."
      });
    }

    if (
      typeof qrToken !== "string" ||
      typeof verificationCode !== "string"
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "Invalid verification request."
      });
    }

    const cleanCode =
      verificationCode.trim();

    if (
      !/^\d{6}$/.test(cleanCode)
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "Verification code must be 6 digits."
      });
    }

    const qrTokenHash =
      hashValue(qrToken.trim());

    const ticket = db.prepare(`
      SELECT *
      FROM tickets
      WHERE qr_token_hash = ?
      AND deleted_at IS NULL
    `).get(qrTokenHash);

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        message:
          "Invalid ticket."
      });
    }

    if (
      ticket.payment_status !== "PAID"
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "Payment has not been confirmed."
      });
    }

    if (
      ticket.ticket_status === "USED"
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "This ticket has already been used."
      });
    }

    if (
      ticket.ticket_status !== "VALID"
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "This ticket is not valid."
      });
    }

    /* =========================
       BRUTE FORCE PROTECTION
    ========================= */

    if (
      (ticket.verification_attempts || 0) >= 5
    ) {
      return res.status(429).json({
        valid: false,
        message:
          "Too many incorrect verification attempts. Contact the event administrator."
      });
    }

    if (
      !ticket.verification_code_hash
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "The event verification code has not been generated yet."
      });
    }

    /* =========================
       CHECK CODE
       
       IMPORTANT:
       There is intentionally NO
       expiration check here.
    ========================= */

    const suppliedCodeHash =
      hashValue(cleanCode);

    if (
      suppliedCodeHash !==
      ticket.verification_code_hash
    ) {

      db.prepare(`
        UPDATE tickets
        SET verification_attempts =
          verification_attempts + 1
        WHERE id = ?
      `).run(ticket.id);

      return res.status(400).json({
        valid: false,
        message:
          "Incorrect verification code."
      });
    }

    /* =========================
       ATOMIC ENTRY APPROVAL
    ========================= */

    const result = db.prepare(`
      UPDATE tickets
      SET
        ticket_status = 'USED',
        verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
      AND ticket_status = 'VALID'
    `).run(ticket.id);

    if (
      result.changes !== 1
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "Ticket has already been used or could not be verified."
      });
    }

    res.json({
      valid: true,

      message:
        "Ticket verified successfully. Entry approved.",

      ticket: {
        ticket_id: ticket.ticket_id,
        event_title: ticket.event_title,
        customer_name: ticket.customer_name,
        ticket_type: ticket.ticket_type,
        quantity: ticket.quantity,
        ticket_status: "USED"
      }
    });

  } catch (error) {

    console.error(
      "Verification code error:",
      error
    );

    res.status(500).json({
      valid: false,
      message:
        "Ticket verification failed."
    });
  }
}

/* =========================
   ADMIN DASHBOARD
========================= */

function getDashboardStats(req, res) {
  try {

    const stats = db.prepare(
      "SELECT " +
      "COALESCE(SUM(quantity), 0) AS totalTickets, " +
      "COALESCE(SUM(price * quantity), 0) AS totalRevenue, " +
      "COALESCE(SUM(CASE WHEN ticket_status = 'VALID' THEN quantity ELSE 0 END), 0) AS validTickets, " +
      "COALESCE(SUM(CASE WHEN ticket_status = 'USED' THEN quantity ELSE 0 END), 0) AS usedTickets " +
      "FROM tickets " +
      "WHERE payment_status = 'PAID' " +
      "AND deleted_at IS NULL"
    ).get();

    res.json(stats);

  } catch (error) {

    console.error(
      "Dashboard stats error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load dashboard statistics."
    });
  }
}

/* =========================
   RECENT TICKETS
========================= */

function getRecentTickets(req, res) {
  try {

    const tickets = db.prepare(
      "SELECT * FROM tickets " +
      "WHERE payment_status = 'PAID' " +
      "AND deleted_at IS NULL " +
      "ORDER BY created_at DESC " +
      "LIMIT 8"
    ).all();

    res.json(tickets);

  } catch (error) {

    console.error(
      "Recent tickets error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load recent tickets."
    });
  }
}

/* =========================
   ALL TICKETS
========================= */

function getAllTickets(req, res) {
  try {

    const tickets = db.prepare(
      "SELECT * FROM tickets " +
      "WHERE payment_status = 'PAID' " +
      "AND deleted_at IS NULL " +
      "ORDER BY created_at DESC"
    ).all();

    res.json(tickets);

  } catch (error) {

    console.error(
      "Get all tickets error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load tickets."
    });
  }
}

/* =========================
   SOFT DELETE
========================= */

function softDeleteTicket(req, res) {
  try {

    const { ticketId } =
      req.params;

    const ticket = db.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ? AND deleted_at IS NULL"
    ).get(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message:
          "Ticket not found or already deleted."
      });
    }

    const result = db.prepare(
      "UPDATE tickets SET deleted_at = CURRENT_TIMESTAMP WHERE ticket_id = ?"
    ).run(ticketId);

    if (
      result.changes === 0
    ) {
      return res.status(404).json({
        message:
          "Ticket not found."
      });
    }

    res.json({
      message:
        "Ticket moved to deleted tickets successfully.",
      ticketId
    });

  } catch (error) {

    console.error(
      "Soft delete ticket error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete ticket."
    });
  }
}

/* =========================
   PERMANENT DELETE
========================= */

function permanentDeleteTicket(req, res) {
  try {

    const { ticketId } =
      req.params;

    const ticket = db.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ? AND deleted_at IS NOT NULL"
    ).get(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message:
          "Ticket not found in deleted items."
      });
    }

    const result = db.prepare(
      "DELETE FROM tickets WHERE ticket_id = ?"
    ).run(ticketId);

    if (
      result.changes === 0
    ) {
      return res.status(404).json({
        message:
          "Ticket not found."
      });
    }

    res.json({
      message:
        "Ticket permanently deleted.",
      ticketId
    });

  } catch (error) {

    console.error(
      "Permanent delete ticket error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to permanently delete ticket."
    });
  }
}

/* =========================
   GET DELETED TICKETS
========================= */

function getDeletedTickets(req, res) {
  try {

    const tickets = db.prepare(
      "SELECT * FROM tickets " +
      "WHERE deleted_at IS NOT NULL " +
      "ORDER BY deleted_at DESC"
    ).all();

    res.json(tickets);

  } catch (error) {

    console.error(
      "Get deleted tickets error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load deleted tickets."
    });
  }
}

/* =========================
   RESTORE
========================= */

function restoreTicket(req, res) {
  try {

    const { ticketId } =
      req.params;

    const ticket = db.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ? AND deleted_at IS NOT NULL"
    ).get(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message:
          "Ticket not found in deleted items."
      });
    }

    const result = db.prepare(
      "UPDATE tickets SET deleted_at = NULL WHERE ticket_id = ?"
    ).run(ticketId);

    if (
      result.changes === 0
    ) {
      return res.status(404).json({
        message:
          "Ticket not found."
      });
    }

    res.json({
      message:
        "Ticket restored successfully.",
      ticketId
    });

  } catch (error) {

    console.error(
      "Restore ticket error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to restore ticket."
    });
  }
}

/* =========================
   LOOKUP BY EMAIL + EVENT
========================= */

function lookupTicketByEmailAndEvent(
  req,
  res
) {
  try {

    const {
      email,
      eventId
    } = req.query;

    if (
      !email ||
      !eventId
    ) {
      return res.status(400).json({
        message:
          "Email and event ID are required."
      });
    }

    const tickets = db.prepare(
      "SELECT * FROM tickets " +
      "WHERE customer_email = ? " +
      "AND event_id = ? " +
      "AND payment_status = 'PAID' " +
      "AND deleted_at IS NULL " +
      "ORDER BY created_at DESC"
    ).all(
      email,
      String(eventId)
    );

    res.json(tickets);

  } catch (error) {

    console.error(
      "Lookup ticket error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to lookup ticket."
    });
  }
}

/* =========================
   EXPORTS
========================= */

module.exports = {
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
};