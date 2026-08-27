const cron = require("node-cron");

const {
  generateEventVerificationCodes
} = require("./verificationService");


/* =========================
   RUN VERIFICATION JOB
========================= */

async function runVerificationJob(
  source
) {

  try {

    console.log(
      `🎟️ Running verification code job: ${source}`
    );

    await generateEventVerificationCodes();

    console.log(
      "✅ Verification code job completed."
    );

  } catch (error) {

    console.error(
      "❌ Verification code job failed:",
      error
    );

    /*
      IMPORTANT:
      Do NOT crash the entire server.
    */
  }
}


/* =========================
   DAILY 10:00 AM
========================= */

cron.schedule(
  "0 10 * * *",

  async () => {

    await runVerificationJob(
      "daily 10:00 AM Nairobi job"
    );

  },

  {
    timezone:
      "Africa/Nairobi"
  }
);


console.log(
  "⏰ Event verification scheduler started."
);


/* =========================
   STARTUP CHECK
========================= */

setTimeout(
  async () => {

    try {

      const now =
        new Date();


      const hourString =
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              "Africa/Nairobi",

            hour:
              "2-digit",

            hour12:
              false
          }
        ).format(now);


      const hour =
        Number(hourString);


      if (hour >= 10) {

        await runVerificationJob(
          "server startup after 10 AM"
        );

      } else {

        console.log(
          "ℹ️ Server started before 10 AM. Waiting for scheduled job."
        );
      }

    } catch (error) {

      console.error(
        "❌ Startup verification check failed:",
        error
      );

    }

  },
  5000
);