import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /* =========================
     PREVENT ACCIDENTAL EXIT
  ========================= */

  useEffect(() => {

    const handleBeforeUnload = (e) => {

      if (!isSubmitting) {
        return;
      }

      e.preventDefault();

      e.returnValue =
        "Your payment may be in progress.";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };

  }, [isSubmitting]);

  /* =========================
     NO CHECKOUT STATE
  ========================= */

  if (!state) {

    return (
      <div className="checkout-page">

        <div className="checkout-header">
          <p>CHECKOUT</p>
          <h1>No Ticket Selected</h1>
        </div>

        <div
          className="checkout-container"
          style={{
            textAlign: "center",
            padding: "40px"
          }}
        >

          <p
            style={{
              marginBottom: "20px",
              color: "#666"
            }}
          >
            You haven't selected a ticket yet.
            Please go back and choose an event.
          </p>

          <button
            onClick={() =>
              navigate("/events")
            }
            style={{
              padding: "14px 30px",
              background: "#111",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              cursor: "pointer"
            }}
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
    total
  } = state;

  /* =========================
     VALIDATE + CONTINUE
  ========================= */

  const handleSubmit = (e) => {

    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");

    /* Name */
    if (!name.trim()) {

      setErrorMessage(
        "Please enter your full name."
      );

      return;
    }

    /* Email */
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {

      setErrorMessage(
        "Please enter a valid email address."
      );

      return;
    }

    /* Phone */
    let cleanPhone =
      phone.replace(/\D/g, "");

    if (cleanPhone.startsWith("0")) {

      cleanPhone =
        "254" +
        cleanPhone.substring(1);

    } else if (
      cleanPhone.startsWith("7") ||
      cleanPhone.startsWith("1")
    ) {

      cleanPhone =
        "254" +
        cleanPhone;
    }

    if (
      !/^254[0-9]{9}$/.test(cleanPhone)
    ) {

      setErrorMessage(
        "Please enter a valid Kenyan M-Pesa number, e.g. 0712345678."
      );

      return;
    }

    /*
      Generate ONE purchase key.

      This key follows the purchase from
      Checkout ? Payment ? PaymentSuccess.
    */
    const idempotencyKey =
      `purchase-${event.id}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}`;

    setIsSubmitting(true);

    /*
      IMPORTANT:

      We DO NOT call /api/tickets here.

      The ticket will only be created after
      M-Pesa confirms successful payment.
    */

    navigate("/payment", {
      state: {
        event,
        ticket,
        quantity,
        total,

        customer: {
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone
        },

        idempotencyKey
      }
    });
  };

  return (
    <div className="checkout-page">

      <div className="checkout-header">

        <p>CHECKOUT</p>

        <h1>
          Complete Your Order
        </h1>

      </div>

      <div className="checkout-container">

        <div className="checkout-form">

          <h2>
            Customer Details
          </h2>

          {errorMessage && (

            <div
              style={{
                background: "#fee",
                color: "#c00",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "15px",
                border: "1px solid #fcc"
              }}
            >
              {errorMessage}
            </div>

          )}

          <form
            onSubmit={handleSubmit}
          >

            <label>

              Full Name *

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
                disabled={isSubmitting}
              />

            </label>

            <label>

              Email Address *

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                disabled={isSubmitting}
              />

            </label>

            <label>

              M-Pesa Phone Number *

              <input
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                required
                disabled={isSubmitting}
              />

              <small
                style={{
                  fontSize: "12px",
                  color: "#666"
                }}
              >
                Enter a Kenyan number such as
                0712345678.
              </small>

            </label>

            <button
              type="submit"
              className="payment-button"
              disabled={isSubmitting}
              style={{
                opacity:
                  isSubmitting
                    ? 0.7
                    : 1,

                cursor:
                  isSubmitting
                    ? "not-allowed"
                    : "pointer"
              }}
            >
              {isSubmitting
                ? "Opening Payment..."
                : "Proceed to M-Pesa Payment"}
            </button>

          </form>

        </div>

        <div className="order-summary">

          <h2>
            Order Summary
          </h2>

          <div className="summary-event">

            <strong>
              {event.title}
            </strong>

            <span>
              {event.date}
            </span>

            <span>
              {event.venue}
            </span>

          </div>

          <div className="summary-row">

            <span>
              Ticket
            </span>

            <strong>
              {ticket.name}
            </strong>

          </div>

          <div className="summary-row">

            <span>
              Quantity
            </span>

            <strong>
              {quantity}
            </strong>

          </div>

          <div className="summary-total">

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
