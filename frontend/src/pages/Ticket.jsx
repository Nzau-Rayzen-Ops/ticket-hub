import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import "./Ticket.css";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export default function Ticket() {
  const { ticketId } = useParams();

  const ticketRef =
    useRef(null);

  const [ticket, setTicket] =
    useState(null);

  const [qrToken, setQrToken] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      if (!ticketId) {
        setError("Ticket ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        /*
          First try the token saved locally immediately
          after ticket creation/confirmation.
        */

        let savedTicket = null;

        try {
          const raw =
            localStorage.getItem(
              `tickethub_ticket_${ticketId}`
            );

          if (raw) {
            savedTicket =
              JSON.parse(raw);
          }
        } catch (_) {
          savedTicket = null;
        }

        if (!cancelled && savedTicket) {
          const savedToken =
            savedTicket.qrToken ||
            savedTicket.ticket?.qrToken;

          if (savedToken) {
            setQrToken(
              String(savedToken)
            );
          }

          if (savedTicket.ticket) {
            setTicket(
              savedTicket.ticket
            );
          } else {
            setTicket(savedTicket);
          }
        }

        /*
          Always load the authoritative ticket record
          from the backend.
        */

        const response =
          await fetch(
            `${API_BASE}/api/tickets/${encodeURIComponent(ticketId)}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load ticket."
          );
        }

        if (cancelled) {
          return;
        }

        const serverTicket =
          data.ticket ||
          data;

        setTicket(serverTicket);

        /*
          If a token was already supplied by the
          creation/confirmation response, preserve it.

          The GET endpoint intentionally does not expose
          qr_token_hash or attempt to reconstruct the token.
        */

      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load ticket."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTicket();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  function handlePrint() {
    window.print();
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleString(
      "en-KE",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );
  }

  if (loading) {
    return (
      <main className="ticket-page">
        <section className="ticket-card ticket-loading">
          <p className="ticket-eyebrow">
            TICKETHUB
          </p>

          <h1>
            Loading ticket...
          </h1>

          <p>
            Please wait while we retrieve
            your ticket.
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ticket-page">
        <section className="ticket-card ticket-error">
          <p className="ticket-eyebrow">
            TICKETHUB
          </p>

          <h1>
            Ticket unavailable
          </h1>

          <p>
            {error}
          </p>

          <Link
            to="/events"
            className="ticket-button"
          >
            Back to Events
          </Link>
        </section>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="ticket-page">
        <section className="ticket-card ticket-error">
          <h1>
            Ticket not found
          </h1>

          <Link
            to="/events"
            className="ticket-button"
          >
            Back to Events
          </Link>
        </section>
      </main>
    );
  }

  const isPaid =
    String(
      ticket.payment_status ||
        ticket.paymentStatus ||
        ""
    ).toUpperCase() === "PAID";

  const isValid =
    String(
      ticket.ticket_status ||
        ticket.ticketStatus ||
        ""
    ).toUpperCase() === "VALID";

  return (
    <main className="ticket-page">
      <section
        ref={ticketRef}
        className="ticket-card"
      >
        <header className="ticket-header">
          <div>
            <p className="ticket-eyebrow">
              TICKETHUB
            </p>

            <h1>
              {ticket.event_title ||
                ticket.eventTitle ||
                "Event Ticket"}
            </h1>
          </div>

          <div
            className={
              isPaid && isValid
                ? "ticket-status valid"
                : "ticket-status"
            }
          >
            {isPaid
              ? ticket.ticket_status ||
                ticket.ticketStatus ||
                "PAID"
              : ticket.payment_status ||
                ticket.paymentStatus ||
                "PENDING"}
          </div>
        </header>

        <div className="ticket-body">
          <div className="ticket-main">
            <div className="ticket-details">
              <div className="ticket-detail">
                <span>
                  TICKET ID
                </span>

                <strong>
                  {ticket.ticket_id ||
                    ticket.ticketId ||
                    ticketId}
                </strong>
              </div>

              <div className="ticket-detail">
                <span>
                  CUSTOMER
                </span>

                <strong>
                  {ticket.customer_name ||
                    ticket.customerName ||
                    "—"}
                </strong>
              </div>

              <div className="ticket-detail">
                <span>
                  TICKET TYPE
                </span>

                <strong>
                  {ticket.ticket_type ||
                    ticket.ticketType ||
                    "—"}
                </strong>
              </div>

              <div className="ticket-detail">
                <span>
                  QUANTITY
                </span>

                <strong>
                  {ticket.quantity ?? "—"}
                </strong>
              </div>

              <div className="ticket-detail">
                <span>
                  AMOUNT
                </span>

                <strong>
                  KES{" "}
                  {(
                    Number(ticket.price || 0) *
                    Number(ticket.quantity || 1)
                  ).toLocaleString(
                    "en-KE"
                  )}
                </strong>
              </div>

              <div className="ticket-detail">
                <span>
                  PAYMENT
                </span>

                <strong>
                  {ticket.payment_method ||
                    ticket.paymentMethod ||
                    "—"}
                </strong>
              </div>

              {(
                ticket.mpesa_receipt_number ||
                ticket.receiptNumber
              ) && (
                <div className="ticket-detail">
                  <span>
                    M-PESA RECEIPT
                  </span>

                  <strong>
                    {ticket.mpesa_receipt_number ||
                      ticket.receiptNumber}
                  </strong>
                </div>
              )}

              <div className="ticket-detail">
                <span>
                  ISSUED
                </span>

                <strong>
                  {formatDate(
                    ticket.created_at ||
                      ticket.createdAt
                  )}
                </strong>
              </div>
            </div>

            <div className="ticket-instructions">
              <h2>
                Entry Instructions
              </h2>

              <p>
                Present this QR code at the
                entrance. The event team will
                scan and verify your ticket.
              </p>

              <p>
                Keep this ticket available
                on your phone or print it
                before attending.
              </p>
            </div>
          </div>

          <aside className="ticket-qr">
            {qrToken ? (
              <>
                <div className="qr-box">
                  <QRCodeCanvas
                    value={qrToken}
                    size={240}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <h2>
                  Scan to Verify
                </h2>

                <p>
                  This QR code contains your
                  secure ticket token.
                </p>
              </>
            ) : (
              <div className="qr-unavailable">
                <div>
                  QR
                </div>

                <h2>
                  QR code unavailable
                </h2>

                <p>
                  This ticket was created before
                  the secure QR token was available
                  to the ticket page.
                </p>

                <p>
                  For a new ticket, confirm the
                  payment again and open the ticket
                  using the new confirmation result.
                </p>
              </div>
            )}
          </aside>
        </div>

        <footer className="ticket-footer">
          <span>
            TicketHub
          </span>

          <span>
            {ticket.ticket_id ||
              ticket.ticketId ||
              ticketId}
          </span>
        </footer>
      </section>

      <div className="ticket-actions no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="ticket-button"
          disabled={!qrToken}
        >
          Print / Save PDF
        </button>

        <Link
          to="/events"
          className="ticket-button secondary"
        >
          Back to Events
        </Link>
      </div>
    </main>
  );
}
