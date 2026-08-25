import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

export default function Ticket() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className="ticket-page">
        <h1>Ticket not found</h1>
        <button onClick={() => navigate("/events")}>
          Browse Events
        </button>
      </div>
    );
  }

  const {
    ticketId,
    event,
    ticket,
    quantity,
    total,
    customer
  } = state;

const qrValue = JSON.stringify({
  type: "TICKETHUB_ENTRY",
  token: state.qrToken
});

  return (
    <div className="ticket-page">

      <div className="ticket-card">

        <div className="ticket-header">
          <div>
            <strong>TicketHub</strong>
            <span>EVENT TICKET</span>
          </div>

          <span className="ticket-status">
            VALID
          </span>
        </div>

        <div className="ticket-main">

          <div className="ticket-event">
            <p>EVENT</p>
            <h1>{event.title}</h1>
          </div>

          <div className="ticket-info">

            <div>
              <span>ATTENDEE</span>
              <strong>{customer.name}</strong>
            </div>

            <div>
              <span>TICKET TYPE</span>
              <strong>{ticket.name}</strong>
            </div>

            <div>
              <span>PRICE</span>
              <strong>
                KES {ticket.price.toLocaleString()}
              </strong>
            </div>

            <div>
              <span>QUANTITY</span>
              <strong>{quantity}</strong>
            </div>

            <div>
              <span>DATE</span>
              <strong>{event.date}</strong>
            </div>

            <div>
              <span>LOCATION</span>
              <strong>{event.location}</strong>
            </div>

          </div>

          <div className="ticket-total">
            <span>TOTAL PAID</span>
            <strong>
              KES {total.toLocaleString()}
            </strong>
          </div>

          <div className="real-qr">

            <QRCodeSVG
              value={qrValue}
              size={190}
              level="H"
            />

            <p>
              Scan to verify ticket
            </p>

          </div>

          <div className="ticket-id">
            <span>TICKET ID</span>
            <strong>{ticketId}</strong>
          </div>

        </div>

        <div className="ticket-footer">
          <span>Present this ticket at the entrance.</span>
          <strong>TicketHub</strong>
        </div>

      </div>

    </div>
  );
}
