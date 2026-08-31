const { Resend } = require("resend");
const QRCode = require("qrcode");

/* =========================
   RESEND CONFIGURATION
========================= */

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "RESEND_API_KEY is not configured. Email sending will fail until it is added to Railway."
  );
}

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.EMAIL_USER ||
  "onboarding@resend.dev";


/* =========================
   SEND TICKET EMAIL
========================= */

async function sendTicketEmail(ticket) {

  if (!ticket.qrToken) {
    throw new Error(
      "QR token is missing."
    );
  }

  const qrData = JSON.stringify({
    type: "TICKETHUB_ENTRY",
    token: ticket.qrToken
  });

  const qrBuffer =
    await QRCode.toBuffer(
      qrData,
      {
        type: "png",
        width: 300,
        margin: 2,
        errorCorrectionLevel: "H"
      }
    );

  const mailOptions = {

    from: EMAIL_FROM,

    to: [
      ticket.customer_email
    ],

    subject:
      "Your Ticket - " +
      ticket.event_title,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
        background: #f5f5f5;
      ">

        <div style="
          background: white;
          padding: 30px;
          border-radius: 15px;
          text-align: center;
        ">

          <h1>Your Ticket is Ready!</h1>

          <p>
            Hello ${ticket.customer_name},
          </p>

          <p>
            Your payment has been
            received successfully.
          </p>

          <hr>

          <h2>
            ${ticket.event_title}
          </h2>

          <p>
            <strong>Ticket Type</strong>
            <br>
            ${ticket.ticket_type}
          </p>

          <p>
            <strong>Quantity</strong>
            <br>
            ${ticket.quantity}
          </p>

          <p>
            <strong>Total Paid</strong>
            <br>
            KES ${
              (
                ticket.price *
                ticket.quantity
              ).toLocaleString()
            }
          </p>

          <hr>

          <h3>Entry QR Code</h3>

          <img
            src="cid:ticket-qr"
            alt="Ticket QR Code"
            width="300"
            height="300"
          />

          <p>
            Present this QR code
            at the entrance.
          </p>

          <hr>

          <h3>Important</h3>

          <p>
            Your personal 6-digit
            entry verification code
            will be sent to this email
            at <strong>10:00 AM</strong>
            on the day of the gala.
          </p>

          <p>
            You will need both:
          </p>

          <p>
            <strong>1. Your QR code</strong>
            <br>
            <strong>2. Your 6-digit verification code</strong>
          </p>

          <p>
            <strong>
              Gala arrival:
              5:00 PM – 5:45 PM
            </strong>
          </p>

          <p style="
            font-size: 13px;
            color: #666;
          ">
            Keep your QR code and
            verification code private.
          </p>

        </div>

      </div>
    `,

    attachments: [
      {
        filename:
          "ticket-qr.png",

        content:
          qrBuffer.toString("base64"),

        contentId:
          "ticket-qr"
      }
    ]
  };

  const {
    data,
    error
  } = await resend.emails.send(
    mailOptions
  );

  if (error) {

    console.error(
      "Resend ticket email error:",
      error
    );

    throw new Error(
      error.message ||
      "Failed to send ticket email."
    );
  }

  console.log(
    `Ticket email sent successfully. Resend ID: ${data?.id || "unknown"}`
  );

  return data;
}


/* =========================
   SEND EVENT-DAY CODE
========================= */

async function sendVerificationCodeEmail(
  ticket,
  verificationCode
) {

  const mailOptions = {

    from: EMAIL_FROM,

    to: [
      ticket.customer_email
    ],

    subject:
      "Your Gala Entry Verification Code - " +
      ticket.event_title,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
        background: #f5f5f5;
      ">

        <div style="
          background: white;
          padding: 30px;
          border-radius: 15px;
          text-align: center;
        ">

          <h1>
            Your Gala Entry Code
          </h1>

          <p>
            Hello ${ticket.customer_name},
          </p>

          <p>
            Today is the day!
            Your ticket verification
            code is ready.
          </p>

          <div style="
            margin: 30px 0;
            padding: 20px;
            background: #f1f1f1;
            border-radius: 12px;
          ">

            <p style="
              margin: 0 0 10px;
              color: #666;
            ">
              YOUR 6-DIGIT CODE
            </p>

            <div style="
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
            ">
              ${verificationCode}
            </div>

          </div>

          <h3>
            Entry Instructions
          </h3>

          <p>
            At the entrance you will need:
          </p>

          <p>
            <strong>
              1. Your ticket QR code
            </strong>
            <br>
            <strong>
              2. This 6-digit code
            </strong>
          </p>

          <p>
            <strong>
              Arrival time:
              5:00 PM – 5:45 PM
            </strong>
          </p>

          <p>
            Keep this code private.
            Do not share it with anyone.
          </p>

          <p style="
            font-size: 13px;
            color: #666;
          ">
            This code is valid until the end of today.
            It becomes unusable once your ticket
            has been successfully verified
            at the entrance.
          </p>

        </div>

      </div>
    `
  };

  const {
    data,
    error
  } = await resend.emails.send(
    mailOptions
  );

  if (error) {

    console.error(
      "Resend verification email error:",
      error
    );

    throw new Error(
      error.message ||
      "Failed to send verification code email."
    );
  }

  console.log(
    `Verification code email sent successfully. Resend ID: ${data?.id || "unknown"}`
  );

  return data;
}


/* =========================
   EXPORTS
========================= */

module.exports = {
  sendTicketEmail,
  sendVerificationCodeEmail
};

