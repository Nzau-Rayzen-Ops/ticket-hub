import { useState } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

const TILL_NUMBER = "1625965";
const RECIPIENT_NAME = "Ronald Nzau"; // ONLY THIS LINE ADDED

export default function Payment() {

  const { state } = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [copied, setCopied] = useState(false);

  if (!state) {

    return (
      <div className="payment-page">

        <div className="payment-header">
          <p>PAYMENT</p>
          <h1>No Payment Information</h1>
        </div>

        <div
          className="payment-container"
          style={{
            textAlign: "center",
            padding: "40px"
          }}
        >

          <p>
            No payment information was found.
          </p>

          <button
            onClick={() => navigate("/events")}
          >
            Browse Events
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
    customer,
    idempotencyKey
  } = state;


  /* =========================
     COPY TILL NUMBER
  ========================= */

  const copyTillNumber = async () => {

    try {

      await navigator.clipboard.writeText(
        TILL_NUMBER
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);

    } catch (error) {

      console.error(
        "Failed to copy Till number:",
        error
      );

      setError(
        "Unable to copy automatically. Please copy the Till number manually."
      );
    }
  };


  /* =========================
     SUBMIT PAYMENT
  ========================= */

  const submitPayment = async (e) => {

    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const cleanReceipt =
      receipt.trim().toUpperCase();


    if (!cleanReceipt) {

      setError(
        "Please enter your M-Pesa receipt number."
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          "/api/tickets/manual-payment",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              eventId:
                event.id,

              eventTitle:
                event.title,

              ticketType:
                ticket.name,

              price:
                Number(ticket.price),

              quantity:
                Number(quantity),

              customerName:
                customer.name,

              customerEmail:
                customer.email,

              customerPhone:
                customer.phone,

              receiptNumber:
                cleanReceipt,

              idempotencyKey

            })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Unable to submit your payment."
        );
      }


      navigate(
        "/payment/success",
        {
          state: {

            event,
            ticket,
            quantity,
            total,
            customer,
            idempotencyKey,

            order:
              data.order,

            receiptNumber:
              cleanReceipt

          }
        }
      );


    } catch (error) {

      console.error(
        "Manual payment error:",
        error
      );

      setError(
        error.message ||
        "Something went wrong while submitting your payment."
      );

    } finally {

      setLoading(false);

    }

  };


  return (

    <div className="payment-page">

      <div className="payment-header">

        <p>PAYMENT</p>

        <h1>
          Complete M-Pesa Payment
        </h1>

        <p>
          Pay using M-Pesa and submit your
          receipt number below.
        </p>

      </div>


      <div className="payment-container">


        {/* =========================
            PAYMENT BOX
        ========================= */}

        <div className="payment-box">

          <h2>
            Pay via M-Pesa
          </h2>


          {/* =========================
              TILL NUMBER
          ========================= */}

          <div
            style={{
              padding: "25px",
              background: "#f5f5f5",
              borderRadius: "10px",
              marginBottom: "25px",
              textAlign: "center"
            }}
          >

            {/* ONLY THIS LINE ADDED */}
            <p style={{ marginBottom: "5px", fontSize: "14px", color: "#666" }}>
              Pay to: <strong>{RECIPIENT_NAME}</strong>
            </p>

            <p
              style={{
                marginBottom: "8px"
              }}
            >
              Send payment to Till Number
            </p>


            <strong
              style={{
                display: "block",
                fontSize: "32px",
                letterSpacing: "2px",
                marginBottom: "15px"
              }}
            >
              {TILL_NUMBER}
            </strong>


            <button
              type="button"
              onClick={copyTillNumber}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "7px",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              {copied
                ? "✓ Till Number Copied"
                : "Copy Till Number"}
            </button>

          </div>


          {/* =========================
              AMOUNT
          ========================= */}

          <div
            style={{
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "25px",
              textAlign: "center",
              border: "1px solid #ddd"
            }}
          >

            <p
              style={{
                marginBottom: "5px"
              }}
            >
              Amount to Pay
            </p>

            <strong
              style={{
                fontSize: "30px"
              }}
            >
              KES{" "}
              {Number(total).toLocaleString()}
            </strong>

          </div>


          {/* =========================
              INSTRUCTIONS
          ========================= */}

          <div
            style={{
              marginBottom: "25px"
            }}
          >

            <h3>
              Payment Instructions
            </h3>

            <ol>

              <li>
                Open M-Pesa on your phone.
              </li>

              <li>
                Select{" "}
                <strong>
                  Lipa na M-Pesa
                </strong>.
              </li>

              <li>
                Select{" "}
                <strong>
                  Buy Goods and Services
                </strong>.
              </li>

              <li>
                Enter Till Number:{" "}
                <strong>
                  {TILL_NUMBER}
                </strong>
              </li>

              {/* ONLY THIS LINE ADDED */}
              <li>
                Pay to:{" "}
                <strong>
                  {RECIPIENT_NAME}
                </strong>
              </li>

              <li>
                Enter amount:{" "}
                <strong>
                  KES{" "}
                  {Number(total).toLocaleString()}
                </strong>
              </li>

              <li>
                Enter your M-Pesa PIN.
              </li>

              <li>
                Wait for the M-Pesa confirmation
                message.
              </li>

              <li>
                Copy the M-Pesa transaction
                receipt number.
              </li>

              <li>
                Enter the receipt number below.
              </li>

            </ol>

          </div>


          {/* =========================
              ERROR
          ========================= */}

          {error && (

            <div
              style={{
                background: "#fee",
                color: "#c00",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "15px"
              }}
            >
              {error}
            </div>

          )}


          {/* =========================
              RECEIPT FORM
          ========================= */}

          <form onSubmit={submitPayment}>

            <label>

              M-Pesa Receipt Number

              <input
                type="text"
                placeholder="e.g. QAB123XYZ"
                value={receipt}
                onChange={(e) =>
                  setReceipt(
                    e.target.value
                  )
                }
                disabled={loading}
                required
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "8px",
                  padding: "12px",
                  boxSizing: "border-box"
                }}
              />

            </label>


            <button
              type="submit"
              className="mpesa-button"
              disabled={loading}
              style={{
                marginTop: "18px"
              }}
            >

              {loading
                ? "Submitting Payment..."
                : "I Have Paid"}

            </button>

          </form>


          <p
            style={{
              marginTop: "20px",
              fontSize: "13px",
              color: "#666",
              lineHeight: "1.5"
            }}
          >
            Your payment will remain pending
            until the event administrator verifies
            the M-Pesa transaction. Your ticket will
            only become valid after payment is
            confirmed.
          </p>

        </div>


        {/* =========================
            ORDER SUMMARY
        ========================= */}

        <div className="payment-summary">

          <h2>
            Order Summary
          </h2>


          <div>

            <strong>
              {event.title}
            </strong>

            <span>
              {event.date}
            </span>

          </div>


          <div className="payment-row">

            <span>
              Ticket
            </span>

            <strong>
              {ticket.name}
            </strong>

          </div>


          <div className="payment-row">

            <span>
              Quantity
            </span>

            <strong>
              {quantity}
            </strong>

          </div>


          <div className="payment-total">

            <span>
              Total
            </span>

            <strong>
              KES{" "}
              {Number(total).toLocaleString()}
            </strong>

          </div>

        </div>

      </div>

    </div>

  );

}
