const crypto = require("crypto");

const pool = require("../config/db");

/* SECURITY HELPERS */

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


/* NAIROBI DATE */

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


/* NAIROBI END OF DAY */

function getNairobiEndOfDay() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(now);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  /*
    Nairobi is UTC+3.

    23:59:59.999 Nairobi
    =
    20:59:59.999 UTC
  */

  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      20,
      59,
      59,
      999
    )
  );
}


/*
============================================================
GENERATE VERIFICATION CODE FOR ONE EVENT
============================================================

IMPORTANT:

This function now ONLY generates and stores the
verification-code hash.

It does NOT send emails.

The actual customer email will be handled by the
admin-controlled SEND VERIFICATION PIN operation.
*/

async function generateCodeForEvent(event) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const eventId = Number(event.id);

    if (
      !Number.isInteger(eventId) ||
      eventId <= 0
    ) {
      throw new Error(
        `Invalid event ID: ${event.id}`
      );
    }


    /*
    LOCK ONE PAID TICKET FOR THIS EVENT

    This prevents two scheduler/manual executions
    from generating different codes at the same time.
    */

    const existingResult = await client.query(
      `
      SELECT
        id,
        verification_code_hash,
        verification_code_expires_at
      FROM tickets
      WHERE event_id = $1
      AND payment_status = 'PAID'
      AND deleted_at IS NULL
      AND verification_code_hash IS NOT NULL
      AND verification_code_expires_at IS NOT NULL
      ORDER BY id
      LIMIT 1
      FOR UPDATE
      `,
      [eventId]
    );

    const existing =
      existingResult.rows[0];


    /*
    IF A VALID CODE ALREADY EXISTS,
    DO NOT GENERATE ANOTHER ONE.
    */

    if (existing) {
      const expiresAt =
        new Date(
          existing.verification_code_expires_at
        );

      if (
        !Number.isNaN(expiresAt.getTime()) &&
        expiresAt > new Date()
      ) {
        await client.query("COMMIT");

        console.log(
          `Valid verification code already exists for event ${eventId}.`
        );

        return {
          success: true,
          alreadyExists: true
        };
      }
    }


    /*
    GENERATE NEW EVENT CODE
    */

    const code =
      generateCode();

    const codeHash =
      hashValue(code);

    const expiry =
      getNairobiEndOfDay();


    /*
    APPLY SAME CODE HASH TO ALL
    PAID TICKETS FOR THIS EVENT.

    NOTE:
    The raw PIN is intentionally NOT returned
    or emailed here.
    */

    const updateResult =
      await client.query(
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
        [
          codeHash,
          expiry,
          eventId
        ]
      );

    await client.query("COMMIT");

    console.log(
      `Generated verification code for event ${eventId}.`
    );

    console.log(
      `Tickets updated: ${updateResult.rowCount}`
    );

    console.log(
      `Verification code expires at: ${expiry.toISOString()}`
    );


    /*
    IMPORTANT:

    Do NOT log the actual 6-digit PIN.
    */

    return {
      success: true,
      alreadyExists: false,
      eventId,
      ticketsUpdated:
        updateResult.rowCount,
      expiresAt: expiry
    };

  } catch (error) {

    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    throw error;

  } finally {

    client.release();

  }
}


/*
============================================================
GENERATE VERIFICATION CODES FOR TODAY'S EVENTS
============================================================

This function is retained because the scheduler
still uses it.

However, it no longer sends PIN emails.

The scheduler can therefore generate the event code
without automatically revealing it to customers.
*/

async function generateEventVerificationCodes() {

  const today =
    getNairobiDate();

  console.log(
    `Checking verification codes for ${today}...`
  );

  try {

    const eventResult =
      await pool.query(
        `
        SELECT DISTINCT
          e.id,
          e.title,
          e.date,
          e.status
        FROM events e
        INNER JOIN tickets t
          ON t.event_id = e.id
        WHERE e.date = $1
        AND e.status != 'ARCHIVED'
        AND t.payment_status = 'PAID'
        AND t.deleted_at IS NULL
        ORDER BY e.id
        `,
        [today]
      );


    if (
      eventResult.rows.length === 0
    ) {

      console.log(
        "No events with paid tickets found for today."
      );

      return;
    }


    console.log(
      `Found ${eventResult.rows.length} event(s) with paid tickets for ${today}.`
    );


    for (
      const event of eventResult.rows
    ) {

      try {

        await generateCodeForEvent(
          event
        );

      } catch (error) {

        console.error(
          `Failed generating verification code for event ${event.id}:`,
          error
        );

      }

    }

  } catch (error) {

    console.error(
      "Verification-code event query failed:",
      error
    );

  }
}


module.exports = {
  generateEventVerificationCodes,
  generateCodeForEvent,
  getNairobiDate,
  getNairobiEndOfDay,
  generateCode,
  hashValue
};
