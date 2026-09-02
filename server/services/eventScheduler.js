const cron = require("node-cron");

const pool = require("../config/db");

const {
  generateCodeForEvent
} = require("./verificationService");


/* =========================================================
   TIMEZONE
========================================================= */

const TIMEZONE =
  "Africa/Nairobi";


/* =========================================================
   GET CURRENT NAIROBI DATE FROM POSTGRES
========================================================= */

async function getNairobiDate() {
  const result =
    await pool.query(
      `
      SELECT
        TO_CHAR(
          CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi',
          'YYYY-MM-DD'
        ) AS today
      `
    );

  return result.rows[0].today;
}


/* =========================================================
   RUN DAILY VERIFICATION JOB
========================================================= */

async function runDailyVerificationJob() {
  try {
    const today =
      await getNairobiDate();

    console.log(
      `Checking verification codes for ${today}...`
    );


    /* =====================================================
       FIND TODAY'S EVENTS THAT HAVE PAID TICKETS
    ===================================================== */

    const result =
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
        WHERE e.date = $1::date
        AND e.status != 'ARCHIVED'
        AND t.payment_status = 'PAID'
        AND t.deleted_at IS NULL
        ORDER BY e.id
        `,
        [today]
      );


    if (result.rows.length === 0) {
      console.log(
        `No events with paid tickets scheduled for ${today}.`
      );

      return;
    }


    console.log(
      `Found ${result.rows.length} event(s) with paid tickets for ${today}.`
    );


    /* =====================================================
       GENERATE EVENT CODE
    ===================================================== */

    for (const event of result.rows) {
      try {
        console.log(
          `Generating verification code for event ${event.id}: ${event.title}`
        );

        await generateCodeForEvent(
          event
        );

        console.log(
          `Verification code generation completed for event ${event.id}.`
        );

      } catch (error) {
        console.error(
          `Failed to generate verification code for event ${event.id}:`,
          error
        );
      }
    }

  } catch (error) {
    console.error(
      "Daily verification job failed:",
      error
    );
  }
}


/* =========================================================
   DAILY CRON
========================================================= */

cron.schedule(
  "0 10 * * *",

  async () => {
    console.log(
      "========================================"
    );

    console.log(
      "Daily verification scheduler triggered."
    );

    console.log(
      `Timezone: ${TIMEZONE}`
    );

    console.log(
      "========================================"
    );

    await runDailyVerificationJob();
  },

  {
    timezone: TIMEZONE
  }
);


/* =========================================================
   INITIALIZATION
========================================================= */

console.log(
  `Event verification scheduler initialized. Daily job: 10:00 AM ${TIMEZONE}.`
);


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  runDailyVerificationJob,
  getNairobiDate
};
