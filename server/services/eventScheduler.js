const cron = require("node-cron");

const {
  generateEventVerificationCodes
} = require("./verificationService");

/* =========================
   DAILY 10:00 AM JOB
========================= */

cron.schedule(
  "0 10 * * *",

  async () => {

    console.log(
      "⏰ 10:00 AM Nairobi — generating event verification codes..."
    );

    await generateEventVerificationCodes();

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
   SERVER STARTUP CHECK
========================= */

/*
  Protects against:

  - server restart
  - deployment
  - temporary downtime
  - server starting after 10 AM
*/

setTimeout(
  async () => {

    const now =
      new Date();

    const hour =
      Number(
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
        ).format(now)
      );

    if (hour >= 10) {

      console.log(
        "🔄 Server started after 10 AM. Checking verification codes..."
      );

      await generateEventVerificationCodes();
    }

  },
  5000
);