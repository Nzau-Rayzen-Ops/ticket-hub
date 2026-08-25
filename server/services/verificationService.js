const crypto = require("crypto");

const db = require("../database");

const {
  sendVerificationCodeEmail
} = require("./emailService");

/* =========================
   SECURITY HELPERS
========================= */

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function generateCode() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

/* =========================
   GET NAIROBI DATE
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

  const today =
    getNairobiDate();

  console.log(
    "🔐 Checking event verification codes for:",
    today
  );

  const tickets = db.prepare(`
    SELECT
      t.*
    FROM tickets t

    INNER JOIN events e
      ON e.id = t.event_id

    WHERE t.payment_status = 'PAID'

    AND t.ticket_status = 'VALID'

    AND t.deleted_at IS NULL

    AND t.verification_code_sent_at IS NULL

    AND e.date = ?
  `).all(today);

  console.log(
    `🔐 ${tickets.length} ticket(s) require verification codes.`
  );

  for (const ticket of tickets) {

    try {

      const code =
        generateCode();

      const codeHash =
        hashValue(code);

      /*
        IMPORTANT:
        No expiry is stored.

        The code remains valid until
        the ticket is successfully used.
      */

      const result = db.prepare(`
        UPDATE tickets

        SET
          verification_code_hash = ?,
          verification_code_expires_at = NULL,
          verification_code_sent_at =
            CURRENT_TIMESTAMP,
          verification_attempts = 0

        WHERE id = ?

        AND verification_code_sent_at IS NULL
      `).run(
        codeHash,
        ticket.id
      );

      /*
        If another process already generated
        the code, don't send another email.
      */

      if (result.changes !== 1) {
        continue;
      }

      await sendVerificationCodeEmail(
        ticket,
        code
      );

      console.log(
        `✅ Verification code sent for ticket ${ticket.ticket_id}`
      );

    } catch (error) {

      /*
        If email sending fails, clear the
        sent timestamp so the scheduler
        can retry later.
      */

      db.prepare(`
        UPDATE tickets

        SET
          verification_code_hash = NULL,
          verification_code_sent_at = NULL

        WHERE id = ?
      `).run(ticket.id);

      console.error(
        `❌ Failed sending verification code for ticket ${ticket.ticket_id}:`,
        error
      );
    }
  }
}

module.exports = {
  generateEventVerificationCodes
};