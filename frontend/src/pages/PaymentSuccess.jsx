import React, { useEffect } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

export default function PaymentSuccess() {

  const { state } = useLocation();
  const navigate = useNavigate();

  // Administrator WhatsApp number
  const ADMIN_WHATSAPP_NUMBER = "254758157516";

  /*
    Automatically open WhatsApp after payment submission.
    The customer will still need to press Send in WhatsApp.
  */
  useEffect(() => {

    if (!state) {
      return;
    }

    const {
      event,
      ticket,
      quantity,
      total,
      order,
      receiptNumber
    } = state;

    const orderId =
      order?.orderId ||
      order?.ticketId ||
      "Pending";

    const message =
      `Hello St Mary's Gala Committee.\n\n` +
      `I have completed payment for a ticket.\n\n` +
      `Order ID: ${orderId}\n` +
      `Event: ${event?.title || "Event"}\n` +
      `Ticket: ${ticket?.name || "Ticket"}\n` +
      `Quantity: ${quantity || 1}\n` +
      `Amount: KES ${Number(total || 0).toLocaleString()}\n` +
      `M-Pesa Receipt: ${receiptNumber || "Submitted"}\n\n` +
      `For Inquiry the Administrators number is: ${ADMIN_WHATSAPP_NUMBER}\n\n` +
      `I understand that my payment must be verified by the event administrator. ` +
      `Once verification is complete, I will receive my ticket by email within 24 hours.`;

    const whatsappUrl =
      `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    // Open your WhatsApp chat automatically
    window.location.href = whatsappUrl;

  }, [state]);

  if (!state) {

    return (
      <div className="success-page">

        <div className="success-card">

          <h1>
            Order Information Not Found
          </h1>

          <button
            onClick={() => navigate("/events")}
            className="ticket-button"
          >
            Back to Events
          </button>

        </div>

      </div>
    );
  }

  const {
    event,
    ticket,
    quantity,
    total,
    order,
    receiptNumber
  } = state;

  return (

    <div className="success-page">

      <div className="success-card">

        {/* =========================
            STATUS ICON
        ========================= */}

        <div
          className="success-icon"
          style={{
            background: "#fff3cd",
            color: "#856404"
          }}
        >
          !
        </div>

        <p className="success-label">
          PAYMENT AWAITING CONFIRMATION
        </p>

        <h1>
          Payment Submitted
        </h1>

        <p className="success-message">
          Thank you. Your payment information
          has been received.
        </p>

        {/* =========================
            DETAILS
        ========================= */}

        <div className="success-details">

          <div>
            <span>
              Order ID
            </span>

            <strong>
              {order?.orderId || "Pending"}
            </strong>
          </div>

          <div>
            <span>
              Event
            </span>

            <strong>
              {event?.title || "Event"}
            </strong>
          </div>

          <div>
            <span>
              Ticket
            </span>

            <strong>
              {ticket?.name || "Ticket"}
            </strong>
          </div>

          <div>
            <span>
              Quantity
            </span>

            <strong>
              {quantity}
            </strong>
          </div>

          <div>
            <span>
              Amount
            </span>

            <strong>
              KES{" "}
              {Number(total || 0).toLocaleString()}
            </strong>
          </div>

          <div>
            <span>
              M-Pesa Receipt
            </span>

            <strong>
              {receiptNumber || "Submitted"}
            </strong>
          </div>

          <div>
            <span>
              Status
            </span>

            <strong>
              PAYMENT PENDING
            </strong>
          </div>

        </div>

        {/* =========================
            WHAT HAPPENS NEXT
        ========================= */}

        <div
          style={{
            background: "#f5f5f5",
            padding: "18px",
            borderRadius: "8px",
            marginTop: "20px",
            marginBottom: "20px"
          }}
        >

          <strong>
            What happens next?
          </strong>

          <p
            style={{
              marginTop: "8px",
              color: "#555",
              lineHeight: "1.5"
            }}
          >

            The event administrator will verify
            your M-Pesa payment against the
            transaction.

            <br />
            <br />

            Once your payment is confirmed,
            your ticket will be activated and
            sent to your email.

            <br />
            <br />

            <strong>
              Please allow up to 24 hours after
              verification for your ticket to be
              delivered to your email.
            </strong>

          </p>

        </div>

        {/* =========================
            IMPORTANT NOTICE
        ========================= */}

        <div
          style={{
            padding: "15px",
            borderRadius: "8px",
            background: "#fff3cd",
            color: "#856404",
            marginBottom: "20px"
          }}
        >

          <strong>
            Keep your M-Pesa confirmation
            message.
          </strong>

          <p
            style={{
              marginTop: "6px"
            }}
          >

            You may need the receipt number if
            the administrator needs to verify
            your payment.

          </p>

        </div>

        {/* =========================
            WHATSAPP NOTICE
        ========================= */}

        <div
          style={{
            background: "#f5f5f5",
            padding: "18px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}
        >

          <strong>
            Opening WhatsApp...
          </strong>

          <p
            style={{
              marginTop: "8px",
              color: "#555",
              lineHeight: "1.5"
            }}
          >

            Your payment details are being
            prepared for the event administrator.

          </p>

        </div>

      </div>

    </div>

  );

}