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
SEND VERIFICATION PIN EMAIL
============================================================
*/

async function sendVerificationCodeEmail(
  ticket,
  verificationCode
) {
  if (!resend) {
    console.warn(
      "⚠️ Verification PIN email skipped: RESEND_API_KEY is not configured."
    );

    return {
      success: false,
      skipped: true,
      message:
        "Email service is not configured."
    };
  }

  if (!ticket || !ticket.customer_email) {
    throw new Error(
      "Recipient email address is required."
    );
  }

  if (
    !verificationCode ||
    !/^\d{6}$/.test(String(verificationCode))
  ) {
    throw new Error(
      "A valid 6-digit verification PIN is required."
    );
  }

  const customerName =
    ticket.customer_name ||
    "Ticket Holder";

  const eventTitle =
    ticket.event_title ||
    "Your TicketHub Event";

  const ticketId =
    ticket.ticket_id ||
    "Your Ticket";

  const subject =
    `TicketHub Verification PIN - ${eventTitle}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>TicketHub Verification PIN</h2>

      <p>Hello ${customerName},</p>

      <p>
        Your verification PIN for
        <strong>${eventTitle}</strong>
        is:
      </p>

      <div style="
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        margin: 24px 0;
        padding: 18px;
        background: #f4f4f4;
        border-radius: 8px;
        text-align: center;
      ">
        ${verificationCode}
      </div>

      <p>
        Ticket:
        <strong>${ticketId}</strong>
      </p>

      <p>
        Keep this PIN with you. You will need it together
        with your QR ticket when entering the event.
      </p>

      <p>
        <strong>Do not share this PIN with anyone other than
        event verification staff.</strong>
      </p>

      <p>
        The PIN is valid only for the event verification period.
      </p>

      <p>
        Thank you for using TicketHub.
      </p>
    </div>
  `;

  const text = `
TicketHub Verification PIN

Hello ${customerName},

Your verification PIN for ${eventTitle} is:

${verificationCode}

Ticket: ${ticketId}

Keep this PIN with you. You will need it together with your QR ticket when entering the event.

Do not share this PIN with anyone other than event verification staff.

The PIN is valid only for the event verification period.

Thank you for using TicketHub.
  `.trim();

  try {
    const result =
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [ticket.customer_email],
        subject,
        html,
        text
      });

    console.log(
      "✅ Verification PIN email sent:",
      result
    );

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error(
      "❌ Verification PIN email error:",
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
  sendVerificationCodeEmail,
  sendEmail
};
