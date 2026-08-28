import { useState } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

export default function Payment() {

  const { state } = useLocation();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(
    state?.customer?.phone || ""
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [paymentMessage, setPaymentMessage] =
    useState("");

  /* =========================
     NO PAYMENT STATE
  ========================= */

  if (!state) {

    return (
      <div className="payment-page">

        <div className="payment-header">

          <p>PAYMENT</p>

          <h1>
            No Payment Information
          </h1>

        </div>

        <div
          className="payment-container"
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
            No payment information was found.
            Please go back and try again.
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
    total,
    customer,
    idempotencyKey
  } = state;

  /* =========================
     PHONE FORMATTER
  ========================= */

  const formatPhone = (value) => {

    let clean =
      value.replace(/\D/g, "");

    if (clean.startsWith("0")) {

      clean =
        "254" +
        clean.substring(1);

    } else if (
      clean.startsWith("7") ||
      clean.startsWith("1")
    ) {

      clean =
        "254" +
        clean;
    }

    return clean;
  };

  /* =========================
     CHECK STATUS
  ========================= */

  const waitForPayment = async (
    checkoutRequestID,
    formattedPhone
  ) => {

    let attempts = 0;

    const maxAttempts = 40;

    while (attempts < maxAttempts) {

      attempts++;

      try {

        const response =
          await fetch(
            `http://localhost:5000/api/mpesa/status/${encodeURIComponent(
              checkoutRequestID
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.message ||
            "Unable to check payment status."
          );
        }

        console.log(
          "Payment status:",
          data
        );

        /* =========================
           SUCCESS
        ========================= */

        if (
          data.status === "SUCCESS" ||
          String(
            data.result?.ResultCode
          ) === "0"
        ) {

          setPaymentMessage(
            "Payment confirmed! Preparing your ticket..."
          );

          /*
            IMPORTANT:

            Ticket creation happens AFTER
            M-Pesa confirmation.
          */

          navigate(
            "/payment/success",
            {
              state: {
                event,
                ticket,
                quantity,
                total,

                customer: {
                  name: customer.name,
                  email: customer.email,
                  phone: formattedPhone
                },

                idempotencyKey,

                checkoutRequestID
              }
            }
          );

          return;
        }

        /* =========================
           FAILED
        ========================= */

        if (
          data.status === "FAILED"
        ) {

          const description =
            data.result?.ResultDesc ||
            "The M-Pesa payment was not completed.";

          throw new Error(
            description
          );
        }

        /*
          Still pending.

          Wait 3 seconds before asking
          Safaricom again.
        */

        setPaymentMessage(
          `Waiting for M-Pesa confirmation... (${attempts}/${maxAttempts})`
        );

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 3000)
        );

      } catch (error) {

        console.error(
          "Payment status error:",
          error
        );

        /*
          If the error came from an actual
          payment failure, stop.

          Otherwise retry.
        */
        if (
          error.message &&
          !error.message.toLowerCase().includes(
            "query"
          ) &&
          !error.message.toLowerCase().includes(
            "unable to check"
          )
        ) {

          throw error;
        }

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 3000)
        );
      }
    }

    throw new Error(
      "Payment timed out. Please check your M-Pesa messages before trying again."
    );
  };

  /* =========================
     START PAYMENT
  ========================= */

  const handlePayment = async (e) => {

    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setPaymentMessage("");

    const formattedPhone =
      formatPhone(phone);

    if (
      !/^254[0-9]{9}$/.test(
        formattedPhone
      )
    ) {

      setError(
        "Please enter a valid Kenyan M-Pesa number, e.g. 0712345678."
      );

      return;
    }

    setLoading(true);

    try {

      /*
        Account reference must remain short.
      */
      const accountReference =
        `TKT${Date.now()
          .toString()
          .slice(-9)}`;

      const response =
        await fetch(
          "http://localhost:5000/api/mpesa/stkpush",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              phoneNumber:
                formattedPhone,

              amount:
                Number(total),

              accountReference,

              transactionDesc:
                "Ticket Payment"
            })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          "Failed to initiate M-Pesa payment."
        );
      }

      if (
        !data.checkoutRequestID
      ) {

        throw new Error(
          "Safaricom did not return a checkout request ID."
        );
      }

      setPaymentMessage(
        "📲 M-Pesa prompt sent. Check your phone and enter your M-Pesa PIN."
      );

      /*
        Start polling.
      */
      await waitForPayment(
        data.checkoutRequestID,
        formattedPhone
      );

    } catch (error) {

      console.error(
        "Payment error:",
        error
      );

      setError(
        error.message ||
        "Payment failed. Please try again."
      );

      setPaymentMessage("");

      setLoading(false);
    }
  };

  return (
    <div className="payment-page">

      <div className="payment-header">

        <p>PAYMENT</p>

        <h1>
          Pay with M-Pesa
        </h1>

      </div>

      <div className="payment-container">

        <div className="payment-box">

          <h2>
            M-Pesa Payment
          </h2>

          <p className="payment-instruction">
            Enter your M-Pesa number below.
            You will receive a payment prompt
            on your phone.
          </p>

          {error && (

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
              {error}
            </div>

          )}

          {paymentMessage && (

            <div
              style={{
                background: "#f5f5f5",
                color: "#111",
                padding: "14px",
                borderRadius: "6px",
                marginBottom: "15px",
                border: "1px solid #ddd",
                lineHeight: "1.5"
              }}
            >
              {paymentMessage}
            </div>

          )}

          <form
            onSubmit={handlePayment}
          >

            <label>

              M-Pesa Phone Number

              <input
                type="tel"
                value={phone}
                placeholder="0712345678"
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                required
                disabled={loading}
              />

            </label>

            <button
              type="submit"
              className="mpesa-button"
              disabled={loading}
            >
              {loading
                ? "Waiting for M-Pesa..."
                : `Pay KES ${Number(total).toLocaleString()}`}
            </button>

          </form>

          <p className="secure-payment">
            Your payment is securely processed
            through M-Pesa.
          </p>

        </div>

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