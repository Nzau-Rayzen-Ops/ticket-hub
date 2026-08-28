import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  useEffect,
  useState,
  useRef
} from "react";

export default function PaymentSuccess() {

  const { state } = useLocation();

  const navigate = useNavigate();

  const [ticketData, setTicketData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const hasCreatedTicket =
    useRef(false);

  /* =========================
     CREATE TICKET
  ========================= */

  useEffect(() => {

    if (!state) {

      setLoading(false);

      return;
    }

    if (
      hasCreatedTicket.current
    ) {

      setLoading(false);

      return;
    }

    const createTicket =
      async () => {

        try {

          /*
            This page should only be reached
            after successful M-Pesa confirmation.
          */

          if (
            !state.checkoutRequestID
          ) {

            throw new Error(
              "Payment confirmation information is missing."
            );
          }

          /*
            Use the exact idempotency key
            created during Checkout.
          */
          const idempotencyKey =
            state.idempotencyKey ||
            `purchase-${state.event.id}-${Date.now()}`;

          const response =
            await fetch(
              "/api/tickets",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({
                  eventId:
                    state.event.id,

                  eventTitle:
                    state.event.title,

                  ticketType:
                    state.ticket.name,

                  price:
                    state.ticket.price,

                  quantity:
                    state.quantity,

                  customerName:
                    state.customer.name,

                  customerEmail:
                    state.customer.email,

                  customerPhone:
                    state.customer.phone,

                  idempotencyKey
                })
              }
            );

          const data =
            await response.json();

          /*
            Duplicate protection.
          */
          if (
            response.status === 409
          ) {

            console.log(
              "Duplicate ticket detected. Looking up existing ticket."
            );

            const fallbackResponse =
              await fetch(
                `/api/tickets/lookup?email=${encodeURIComponent(
                  state.customer.email
                )}&eventId=${encodeURIComponent(
                  state.event.id
                )}`
              );

            if (
              fallbackResponse.ok
            ) {

              const existingTickets =
                await fallbackResponse.json();

              const existingTicket =
                existingTickets.find(
                  (t) =>
                    t.event_id ===
                      String(state.event.id) &&
                    t.payment_status ===
                      "PAID" &&
                    t.deleted_at === null
                );

              if (
                existingTicket
              ) {

                hasCreatedTicket.current =
                  true;

                setTicketData({
                  ticketId:
                    existingTicket.ticket_id,

                  event:
                    state.event,

                  ticket:
                    state.ticket,

                  quantity:
                    existingTicket.quantity,

                  total:
                    existingTicket.price *
                    existingTicket.quantity,

                  customer:
                    state.customer
                });

                setLoading(false);

                return;
              }
            }

            throw new Error(
              "A duplicate purchase was detected, but we could not retrieve the ticket."
            );
          }

          if (
            !response.ok
          ) {

            throw new Error(
              data.message ||
              "Failed to create your ticket."
            );
          }

          if (
            !data.ticket
          ) {

            throw new Error(
              "The server did not return the created ticket."
            );
          }

          const officialTicket =
            data.ticket;

          hasCreatedTicket.current =
            true;

          setTicketData({

            ticketId:
              officialTicket.ticket_id,

            event:
              state.event,

            ticket:
              state.ticket,

            quantity:
              officialTicket.quantity,

            total:
              officialTicket.price *
              officialTicket.quantity,

            customer:
              state.customer,

            /*
              QR token is returned only
              at creation time.
            */
            qrToken:
              officialTicket.qrToken
          });

        } catch (err) {

          console.error(
            "Ticket creation error:",
            err
          );

          setError(
            err.message ||
            "Ticket generation failed."
          );

        } finally {

          setLoading(false);
        }
      };

    createTicket();

  }, [state]);

  /* =========================
     NO STATE
  ========================= */

  if (!state) {

    return (
      <div className="success-page">

        <div className="success-card">

          <h1>
            Payment information not found
          </h1>

          <p
            style={{
              color: "#666",
              marginBottom: "20px"
            }}
          >
            We couldn't find your payment
            information.
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

  /* =========================
     LOADING
  ========================= */

  if (loading) {

    return (
      <div className="success-page">

        <div className="success-card">

          <div
            className="success-icon"
            style={{
              background: "#f5f5f5",
              color: "#111"
            }}
          >
            ?
          </div>

          <h1>
            Generating your ticket...
          </h1>

          <p className="success-message">
            Your M-Pesa payment has been
            confirmed. We're generating your
            ticket now.
          </p>

        </div>

      </div>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {

    return (
      <div className="success-page">

        <div className="success-card">

          <div
            className="success-icon"
            style={{
              background: "#fee",
              color: "#c00"
            }}
          >
            ?
          </div>

          <h1>
            Ticket Generation Failed
          </h1>

          <p className="success-message">
            {error}
          </p>

          <p
            style={{
              color: "#666",
              fontSize: "14px",
              marginBottom: "20px"
            }}
          >
            Your payment may already have
            been completed. Please don't make
            another payment immediately.
            Check your email or contact the
            event administrator if necessary.
          </p>

          <button
            onClick={() =>
              navigate("/events")
            }
            className="ticket-button"
          >
            Back to Events
          </button>

        </div>

      </div>
    );
  }

  /* =========================
     VIEW TICKET
  ========================= */

  const viewTicket = () => {

    navigate(
      "/ticket",
      {
        state: ticketData
      }
    );
  };

  return (
    <div className="success-page">

      <div className="success-card">

        <div className="success-icon">
          ?
        </div>

        <p className="success-label">
          PAYMENT SUCCESSFUL
        </p>

        <h1>
          Your Ticket is Ready!
        </h1>

        <p className="success-message">

          Your M-Pesa payment has been
          received and your ticket has been
          generated successfully.

        </p>

        <div className="success-details">

          <div>

            <span>
              Ticket ID
            </span>

            <strong>
              {ticketData.ticketId}
            </strong>

          </div>

          <div>

            <span>
              Event
            </span>

            <strong>
              {ticketData.event.title}
            </strong>

          </div>

          <div>

            <span>
              Ticket
            </span>

            <strong>
              {ticketData.ticket.name}
            </strong>

          </div>

          <div>

            <span>
              Total Paid
            </span>

            <strong>
              KES{" "}
              {Number(
                ticketData.total
              ).toLocaleString()}
            </strong>

          </div>

        </div>

        <button
          className="ticket-button"
          onClick={viewTicket}
        >
          View My Ticket
        </button>

        <button
          onClick={() =>
            navigate("/")
          }
          style={{
            display: "inline-block",
            marginTop: "15px",
            padding: "12px 24px",
            background: "transparent",
            color: "#111",
            border: "1px solid #ccc",
            borderRadius: "6px",
            fontSize: "15px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          ? Return to Website
        </button>

      </div>

    </div>
  );
}
