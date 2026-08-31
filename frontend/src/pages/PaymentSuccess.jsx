import React, { useState } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

export default function PaymentSuccess() {

  const { state } = useLocation();
  const navigate = useNavigate();

  const [whatsappNumber, setWhatsappNumber] = useState("");

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

  const handleFinish = () => {

    let number = whatsappNumber.trim();

    if (!number) {
      alert("Please enter your WhatsApp number.");
      return;
    }

    // Remove spaces, +, brackets and hyphens
    number = number.replace(/[\s()+-]/g, "");

    // Convert Kenyan numbers such as 07XXXXXXXX
    // to international format 2547XXXXXXXX
    if (number.startsWith("0")) {
      number = "254" + number.substring(1);
    }

    // If user entered 7XXXXXXXX, add Kenya country code
    if (
      number.startsWith("7") &&
      number.length === 9
    ) {
      number = "254" + number;
    }

    // Basic Kenyan WhatsApp number validation
    if (
      !/^2547\d{8}$/.test(number)
    ) {
      alert(
        "Please enter a valid Kenyan WhatsApp number, e.g. 0712345678."
      );
      return;
    }

    const orderId =
      order?.orderId ||
      order?.ticketId ||
      "Pending";

    const message =
      `Hello St Mary's Gala Committee.%0A%0A` +
      `I have completed payment for a ticket.%0A%0A` +
      `Order ID: ${encodeURIComponent(orderId)}%0A` +
      `Event: ${encodeURIComponent(event?.title || "Event")}%0A` +
      `Ticket: ${encodeURIComponent(ticket?.name || "Ticket")}%0A` +
      `Quantity: ${encodeURIComponent(quantity || 1)}%0A` +
      `Amount: KES ${encodeURIComponent(
        Number(total || 0).toLocaleString()
      )}%0A` +
      `M-Pesa Receipt: ${encodeURIComponent(
        receiptNumber || "Submitted"
      )}%0A%0A` +
      `My WhatsApp number is: ${encodeURIComponent(
        number
      )}%0A%0A` +
      `I understand that my payment must be verified by the event administrator. ` +
      `Once verification is complete, I will receive my ticket by email within 24 hours.`;

    window.location.href =
      `https://wa.me/${number}?text=${message}`;
  };

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
              {
                order?.orderId ||
                "Pending"
              }
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
            WHATSAPP
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
            Send your payment details on WhatsApp
          </strong>

          <p
            style={{
              marginTop: "8px",
              marginBottom: "12px",
              color: "#555",
              lineHeight: "1.5"
            }}
          >

            Enter the WhatsApp number you would
            like to use to contact the event
            committee. It does not have to be the
            same number you used to make the
            M-Pesa payment.

          </p>

          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) =>
              setWhatsappNumber(e.target.value)
            }
            placeholder="e.g. 0712345678"
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "16px",
              boxSizing: "border-box"
            }}
          />

        </div>

        {/* =========================
            FINISH
        ========================= */}

        <button
          onClick={handleFinish}
          className="ticket-button"
        >
          Finish & Continue on WhatsApp
        </button>

      </div>

    </div>

  );

}
