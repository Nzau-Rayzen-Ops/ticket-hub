const crypto = require("crypto");
const pool = require("../config/db");
const { sendVerificationCodeEmail } = require("./emailService");

/* =========================
   SECURITY
========================= */

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function generateCode() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

/* =========================
   NAIROBI DATE
========================= */

function getNairobiDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(new Date());
}

/* =========================
   GENERATE EVENT CODES
========================= */

async function generateEventVerificationCodes() {
  const today = getNairobiDate();

  console.log(`🔐 Checking verification codes for ${today}...`);

  /*
    Find today's events that have paid tickets.
    FIXED: Removed the text casting rule. Both columns are evaluated strictly as Integers.
  */
  try {
    const eventResult = await pool.query(
      `
      SELECT DISTINCT
        e.id,
        e.title
      FROM events e
      INNER JOIN tickets t
        ON t.event_id = e.id
      WHERE e.date = $1
      AND e.status != 'ARCHIVED'
      AND t.payment_status = 'PAID'
      AND t.deleted_at IS NULL
      `,
      [today]
    );

    if (eventResult.rows.length === 0) {
      console.log("ℹ️ No events with paid tickets found for today.");
      return;
    }

    for (const event of eventResult.rows) {
      try {
        await generateCodeForEvent(event);
      } catch (error) {
        console.error(`❌ Failed generating code for event ${event.id}:`, error);
      }
    }
  } catch (globalQueryError) {
    console.error("❌ Fatal scheduler query mismatch error encountered:", globalQueryError.message);
  }
}

/* =========================
   GENERATE CODE FOR EVENT
========================= */

async function generateCodeForEvent(event) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
      Check whether this event already has a valid generated code.
      FIXED: Ensured event.id is parsed strictly as a proper integer scalar parameter
    */
    const eventIdInt = parseInt(event.id, 10);

    const existingResult = await client.query(
      `
      SELECT
        verification_code_hash,
        verification_code_expires_at
      FROM tickets
      WHERE event_id = $1
      AND payment_status = 'PAID'
      AND verification_code_hash IS NOT NULL
      AND verification_code_expires_at IS NOT NULL
      LIMIT 1
      `,
      [eventIdInt]
    );

    const existing = existingResult.rows[0];

    if (existing) {
      const expiresAt = new Date(existing.verification_code_expires_at);

      if (expiresAt > new Date()) {
        await client.query("COMMIT");
        console.log(`ℹ️ Verification code already exists for event ${event.id}.`);
        return;
      }
    }

    /* =========================
       GENERATE CODE
    ========================= */

    const code = generateCode();
    const codeHash = hashValue(code);

    const expiry = new Date();
    expiry.setHours(23, 59, 59, 999);

    /*
      Store code on every paid ticket belonging to today's event.
    */
    const updateResult = await client.query(
      `
      UPDATE tickets
      SET
        verification_code_hash = $1,
        verification_code_expires_at = $2,
        verification_attempts = 0,
        verification_code_sent_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $3
      AND payment_status = 'PAID'
      AND deleted_at IS NULL
      `,
      [codeHash, expiry, eventIdInt]
    );

    await client.query("COMMIT");

    console.log(`✅ Generated verification code for event ${event.id}. Tickets updated: ${updateResult.rowCount}`);

    /* =========================
       SEND EMAILS
    ========================= */

    const ticketResult = await pool.query(
      `
      SELECT
        id,
        customer_name,
        customer_email,
        event_title
      FROM tickets
      WHERE event_id = $1
      AND payment_status = 'PAID'
      AND deleted_at IS NULL
      `,
      [eventIdInt]
    );

    for (const ticket of ticketResult.rows) {
      try {
        await sendVerificationCodeEmail(ticket, code);

        // FIXED: Enforce clear integer parsing if ticket IDs are serial sequences
        const ticketIdInt = parseInt(ticket.id, 10);

        await pool.query(
          `
          UPDATE tickets
          SET
            verification_code_sent_at = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [isNaN(ticketIdInt) ? ticket.id : ticketIdInt]
        );

      } catch (emailError) {
        console.error(`❌ Failed sending verification code to ${ticket.customer_email}:`, emailError);
      }
    }

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    throw error;
  } {
    client.release();
  }
}

/* =========================
   EXPORTS
========================= */

module.exports = {
  generateEventVerificationCodes
};
