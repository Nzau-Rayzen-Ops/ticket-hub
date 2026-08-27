const crypto = require("crypto");

const pool = require("../config/db");

const {
  sendTicketEmail
} = require("../services/emailService");


/* =========================
   SECURITY HELPERS
========================= */

function generateRandomToken(bytes = 32) {

  return crypto
    .randomBytes(bytes)
    .toString("hex");
}


function hashValue(value) {

  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}


/* =========================
   CREATE TICKET
========================= */

async function createTicket(req, res) {

  const client =
    await pool.connect();

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


    /* =========================
       REQUIRED FIELDS
    ========================= */

    if (
      !eventId ||
      !ticketType ||
      price === undefined ||
      !quantity ||
      !customerName ||
      !customerEmail ||
      !customerPhone
    ) {

      return res.status(400).json({
        message:
          "All ticket information is required."
      });
    }


    const finalIdempotencyKey =
      idempotencyKey ||
      `${String(customerEmail).trim().toLowerCase()}-${eventId}-${Date.now()}`;


    /* =========================
       IDEMPOTENCY CHECK
    ========================= */

    const existingResult =
      await client.query(
        `
        SELECT *
        FROM tickets
        WHERE idempotency_key = $1
        LIMIT 1
        `,
        [finalIdempotencyKey]
      );


    if (
      existingResult.rows.length > 0
    ) {

      return res.status(200).json({

        message:
          "Ticket already created.",

        ticket:
          existingResult.rows[0]
      });
    }


    /* =========================
       CHECK RECENT DUPLICATE
    ========================= */

    const duplicateResult =
      await client.query(
        `
        SELECT *
        FROM tickets
        WHERE LOWER(customer_email) =
              LOWER($1)
        AND event_id = $2
        AND created_at >=
            CURRENT_TIMESTAMP - INTERVAL '5 minutes'
        AND payment_status = 'PAID'
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [
          String(customerEmail)
            .trim(),
          Number(eventId)
        ]
      );


    if (
      duplicateResult.rows.length > 0
    ) {

      return res.status(409).json({

        message:
          "You already purchased tickets for this event recently. Please check your email for your ticket.",

        duplicate: true,

        ticket:
          duplicateResult.rows[0]
      });
    }


    /* =========================
       VALIDATE NUMBERS
    ========================= */

    const ticketQuantity =
      Number(quantity);

    const ticketPrice =
      Number(price);


    if (
      !Number.isInteger(ticketQuantity) ||
      ticketQuantity <= 0 ||
      !Number.isFinite(ticketPrice) ||
      ticketPrice < 0
    ) {

      return res.status(400).json({
        message:
          "Invalid ticket quantity or price."
      });
    }


    /* =========================
       START TRANSACTION
    ========================= */

    await client.query("BEGIN");


    /* =========================
       LOCK EVENT
    ========================= */

    const eventResult =
      await client.query(
        `
        SELECT *
        FROM events
        WHERE id = $1
        AND status != 'ARCHIVED'
        FOR UPDATE
        `,
        [Number(eventId)]
      );


    if (
      eventResult.rows.length === 0
    ) {

      await client.query("ROLLBACK");

      return res.status(404).json({
        message:
          "Event not found."
      });
    }


    const event =
      eventResult.rows[0];


    /* =========================
       CHECK AVAILABILITY
    ========================= */

    if (
      ticketQuantity >
      Number(event.available_tickets)
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({

        message:
          `Not enough tickets available. Only ${event.available_tickets} ticket(s) remaining.`
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
       QR TOKEN
    ========================= */

    const qrToken =
      generateRandomToken(32);

    const qrTokenHash =
      hashValue(qrToken);


    /* =========================
       CREATE TICKET
       
       NOTE:
       This preserves your current
       application behavior where
       createTicket creates a PAID
       ticket.

       Your payment flow can later
       create/update this separately
       if needed.
    ========================= */

    const insertResult =
      await client.query(
        `
        INSERT INTO tickets
        (
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          idempotency_key,
          qr_token_hash
        )
        VALUES
        (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13
        )
        RETURNING *
        `,
        [
          ticketId,
          Number(eventId),
          event.title ||
            eventTitle ||
            "Event",
          ticketType,
          ticketPrice,
          ticketQuantity,
          String(customerName).trim(),
          String(customerEmail)
            .trim()
            .toLowerCase(),
          String(customerPhone).trim(),
          "PAID",
          "VALID",
          finalIdempotencyKey,
          qrTokenHash
        ]
      );


    /* =========================
       REDUCE INVENTORY
    ========================= */

    await client.query(
      `
      UPDATE events
      SET
        available_tickets =
          available_tickets - $1
      WHERE id = $2
      `,
      [
        ticketQuantity,
        Number(eventId)
      ]
    );


    /* =========================
       COMMIT
    ========================= */

    await client.query("COMMIT");


    const ticket =
      insertResult.rows[0];


    /* =========================
       EMAIL
    ========================= */

    const ticketForEmail = {
      ...ticket,
      qrToken
    };


    try {

      await sendTicketEmail(
        ticketForEmail
      );

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
        "Ticket email error:",
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

    try {
      await client.query("ROLLBACK");
    } catch (_) {}


    console.error(
      "Create ticket error:",
      error
    );


    if (
      error.code === "23505"
    ) {

      return res.status(409).json({
        message:
          "This ticket request already exists."
      });
    }


    return res.status(500).json({

      message:
        error.message ||
        "Failed to create ticket."
    });

  } finally {

    client.release();
  }
}


/* =========================
   GET SINGLE TICKET
========================= */

async function getTicket(req, res) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          deleted_at,
          created_at
        FROM tickets
        WHERE ticket_id = $1
        LIMIT 1
        `,
        [req.params.ticketId]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({
        message:
          "Ticket not found."
      });
    }


    return res.json(
      result.rows[0]
    );


  } catch (error) {

    console.error(
      "Get ticket error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to retrieve ticket."
    });
  }
}


/* =========================
   VERIFY QR
========================= */

async function verifyTicket(req, res) {

  try {

    const {
      qrToken
    } = req.body;


    if (
      !qrToken ||
      typeof qrToken !== "string"
    ) {

      return res.status(400).json({

        valid: false,
        requiresCode: false,

        message:
          "Invalid QR code."
      });
    }


    const qrTokenHash =
      hashValue(
        qrToken.trim()
      );


    const result =
      await pool.query(
        `
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
        WHERE qr_token_hash = $1
        AND deleted_at IS NULL
        LIMIT 1
        `,
        [qrTokenHash]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        valid: false,
        requiresCode: false,

        message:
          "Invalid or unknown ticket QR code."
      });
    }


    const ticket =
      result.rows[0];


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


    return res.json({

      valid: false,
      requiresCode: true,

      message:
        "QR code recognized. Enter the 6-digit verification code sent to the ticket holder.",

      ticket: {

        event_title:
          ticket.event_title,

        ticket_type:
          ticket.ticket_type,

        quantity:
          ticket.quantity
      }
    });


  } catch (error) {

    console.error(
      "QR verification error:",
      error
    );

    return res.status(500).json({

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

async function verifyTicketCode(
  req,
  res
) {

  const client =
    await pool.connect();

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
      hashValue(
        qrToken.trim()
      );


    await client.query("BEGIN");


    const result =
      await client.query(
        `
        SELECT *
        FROM tickets
        WHERE qr_token_hash = $1
        AND deleted_at IS NULL
        FOR UPDATE
        `,
        [qrTokenHash]
      );


    if (
      result.rows.length === 0
    ) {

      await client.query("ROLLBACK");

      return res.status(404).json({

        valid: false,

        message:
          "Invalid ticket."
      });
    }


    const ticket =
      result.rows[0];


    if (
      ticket.payment_status !== "PAID"
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({

        valid: false,

        message:
          "Payment has not been confirmed."
      });
    }


    if (
      ticket.ticket_status === "USED"
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({

        valid: false,

        message:
          "This ticket has already been used."
      });
    }


    if (
      ticket.ticket_status !== "VALID"
    ) {

      await client.query("ROLLBACK");

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
      Number(
        ticket.verification_attempts || 0
      ) >= 5
    ) {

      await client.query("ROLLBACK");

      return res.status(429).json({

        valid: false,

        message:
          "Too many incorrect verification attempts. Contact the event administrator."
      });
    }


    if (
      !ticket.verification_code_hash
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({

        valid: false,

        message:
          "The event verification code has not been generated yet."
      });
    }


    /* =========================
       CHECK CODE
    ========================= */

    const suppliedCodeHash =
      hashValue(cleanCode);


    if (
      suppliedCodeHash !==
      ticket.verification_code_hash
    ) {

      await client.query(
        `
        UPDATE tickets
        SET
          verification_attempts =
            verification_attempts + 1,
          updated_at =
            CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [ticket.id]
      );


      await client.query("COMMIT");


      return res.status(400).json({

        valid: false,

        message:
          "Incorrect verification code."
      });
    }


    /* =========================
       ATOMIC ENTRY APPROVAL
    ========================= */

    const updateResult =
      await client.query(
        `
        UPDATE tickets
        SET
          ticket_status = 'USED',
          verified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        AND ticket_status = 'VALID'
        RETURNING *
        `,
        [ticket.id]
      );


    if (
      updateResult.rows.length !== 1
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({

        valid: false,

        message:
          "Ticket has already been used or could not be verified."
      });
    }


    await client.query("COMMIT");


    const verifiedTicket =
      updateResult.rows[0];


    return res.json({

      valid: true,

      message:
        "Ticket verified successfully. Entry approved.",

      ticket: {

        ticket_id:
          verifiedTicket.ticket_id,

        event_title:
          verifiedTicket.event_title,

        customer_name:
          verifiedTicket.customer_name,

        ticket_type:
          verifiedTicket.ticket_type,

        quantity:
          verifiedTicket.quantity,

        ticket_status:
          "USED"
      }
    });


  } catch (error) {

    try {
      await client.query("ROLLBACK");
    } catch (_) {}


    console.error(
      "Verification code error:",
      error
    );


    return res.status(500).json({

      valid: false,

      message:
        "Ticket verification failed."
    });

  } finally {

    client.release();
  }
}


/* =========================
   ADMIN DASHBOARD
========================= */

async function getDashboardStats(
  req,
  res
) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          COALESCE(
            SUM(quantity),
            0
          )::INTEGER AS "totalTickets",

          COALESCE(
            SUM(price * quantity),
            0
          )::NUMERIC AS "totalRevenue",

          COALESCE(
            SUM(
              CASE
                WHEN ticket_status = 'VALID'
                THEN quantity
                ELSE 0
              END
            ),
            0
          )::INTEGER AS "validTickets",

          COALESCE(
            SUM(
              CASE
                WHEN ticket_status = 'USED'
                THEN quantity
                ELSE 0
              END
            ),
            0
          )::INTEGER AS "usedTickets"

        FROM tickets

        WHERE payment_status = 'PAID'
        AND deleted_at IS NULL
        `
      );


    return res.json(
      result.rows[0]
    );


  } catch (error) {

    console.error(
      "Dashboard stats error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to load dashboard statistics."
    });
  }
}


/* =========================
   RECENT TICKETS
========================= */

async function getRecentTickets(
  req,
  res
) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          created_at
        FROM tickets
        WHERE payment_status = 'PAID'
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 8
        `
      );


    return res.json(
      result.rows
    );


  } catch (error) {

    console.error(
      "Recent tickets error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to load recent tickets."
    });
  }
}


/* =========================
   ALL TICKETS
========================= */

async function getAllTickets(
  req,
  res
) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          created_at
        FROM tickets
        WHERE payment_status = 'PAID'
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        `
      );


    return res.json(
      result.rows
    );


  } catch (error) {

    console.error(
      "Get all tickets error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to load tickets."
    });
  }
}


/* =========================
   SOFT DELETE
========================= */

async function softDeleteTicket(
  req,
  res
) {

  try {

    const {
      ticketId
    } = req.params;


    const result =
      await pool.query(
        `
        UPDATE tickets

        SET
          deleted_at =
            CURRENT_TIMESTAMP

        WHERE ticket_id = $1
        AND deleted_at IS NULL

        RETURNING ticket_id
        `,
        [ticketId]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        message:
          "Ticket not found or already deleted."
      });
    }


    return res.json({

      message:
        "Ticket moved to deleted tickets successfully.",

      ticketId
    });


  } catch (error) {

    console.error(
      "Soft delete ticket error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to delete ticket."
    });
  }
}


/* =========================
   PERMANENT DELETE
========================= */

async function permanentDeleteTicket(
  req,
  res
) {

  try {

    const {
      ticketId
    } = req.params;


    const result =
      await pool.query(
        `
        DELETE FROM tickets
        WHERE ticket_id = $1
        AND deleted_at IS NOT NULL
        RETURNING ticket_id
        `,
        [ticketId]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        message:
          "Ticket not found in deleted items."
      });
    }


    return res.json({

      message:
        "Ticket permanently deleted.",

      ticketId
    });


  } catch (error) {

    console.error(
      "Permanent delete ticket error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to permanently delete ticket."
    });
  }
}


/* =========================
   GET DELETED TICKETS
========================= */

async function getDeletedTickets(
  req,
  res
) {

  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          deleted_at,
          created_at
        FROM tickets
        WHERE deleted_at IS NOT NULL
        ORDER BY deleted_at DESC
        `
      );


    return res.json(
      result.rows
    );


  } catch (error) {

    console.error(
      "Get deleted tickets error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to load deleted tickets."
    });
  }
}


/* =========================
   RESTORE
========================= */

async function restoreTicket(
  req,
  res
) {

  try {

    const {
      ticketId
    } = req.params;


    const result =
      await pool.query(
        `
        UPDATE tickets

        SET
          deleted_at = NULL

        WHERE ticket_id = $1
        AND deleted_at IS NOT NULL

        RETURNING ticket_id
        `,
        [ticketId]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(404).json({

        message:
          "Ticket not found in deleted items."
      });
    }


    return res.json({

      message:
        "Ticket restored successfully.",

      ticketId
    });


  } catch (error) {

    console.error(
      "Restore ticket error:",
      error
    );

    return res.status(500).json({

      message:
        "Failed to restore ticket."
    });
  }
}


/* =========================
   LOOKUP BY EMAIL + EVENT
========================= */

async function lookupTicketByEmailAndEvent(
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


    const result =
      await pool.query(
        `
        SELECT
          id,
          ticket_id,
          event_id,
          event_title,
          ticket_type,
          price,
          quantity,
          customer_name,
          customer_email,
          customer_phone,
          payment_status,
          ticket_status,
          created_at
        FROM tickets
        WHERE LOWER(customer_email) =
              LOWER($1)
        AND event_id = $2
        AND payment_status = 'PAID'
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        `,
        [
          String(email).trim(),
          Number(eventId)
        ]
      );


    return res.json(
      result.rows
    );


  } catch (error) {

    console.error(
      "Lookup ticket error:",
      error
    );

    return res.status(500).json({

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