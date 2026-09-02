const { Resend } = require("resend");

/*
============================================================
RESEND EMAIL SERVICE
============================================================
*/

const RESEND_API_KEY =
  process.env.RESEND_API_KEY || "";

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  "TicketHub <onboarding@resend.dev>";

/*
Do NOT create the Resend client when
the API key is missing.

This allows the server to start locally
even when email is not configured.
*/

const resend = RESEND_API_KEY
  ? new Resend(RESEND_API_KEY)
  : null;


/*
============================================================
SEND TICKET EMAIL
============================================================
*/

async function sendTicketEmail({
  to,
  subject,
  html,
  text
}) {
  if (!resend) {
    console.warn(
      "⚠️ Email skipped: RESEND_API_KEY is not configured."
    );

    return {
      success: false,
      skipped: true,
      message:
        "Email service is not configured."
    };
  }

  if (!to) {
    throw new Error(
      "Recipient email address is required."
    );
  }

  try {
    const result =
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject:
          subject ||
          "Your TicketHub Ticket",
        html:
          html ||
          "<p>Your TicketHub ticket is ready.</p>",
        text:
          text ||
          "Your TicketHub ticket is ready."
      });

    console.log(
      "✅ Ticket email sent:",
      result
    );

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error(
      "❌ Ticket email error:",
      error
    );

    return {
      success: false,
      error: error.message
    };
  }
}


/*
============================================================
GENERIC EMAIL
============================================================
*/

async function sendEmail({
  to,
  subject,
  html,
  text
}) {
  return sendTicketEmail({
    to,
    subject,
    html,
    text
  });
}


/*
============================================================
EXPORTS
============================================================
*/

module.exports = {
  sendTicketEmail,
  sendEmail
};
