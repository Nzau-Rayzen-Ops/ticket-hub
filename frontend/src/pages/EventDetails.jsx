import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ⬇️⬇️⬇️ ADD THIS - Track which ticket type is selected ⬇️⬇️⬇️
  const [selectedTicketType, setSelectedTicketType] = useState("single");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:5000/api/events/${id}`
        );

        if (!response.ok) {
          throw new Error("Event not found.");
        }

        const data = await response.json();
        setEvent(data);
      } catch (err) {
        console.error("Failed to load event:", err);
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const increaseQuantity = () => {
    if (!event) return;
    if (quantity < 10 && quantity < event.available_tickets) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // ⬇️⬇️⬇️ ADD THESE HELPER FUNCTIONS ⬇️⬇️⬇️
  const getTicketPrice = () => {
    if (!event) return 0;
    
    switch(selectedTicketType) {
      case "couple":
        return event.couple_price || event.single_price || event.price;
      case "group3":
        return event.group3_price || event.single_price || event.price;
      case "single":
      default:
        return event.single_price || event.price;
    }
  };

  const getTicketLabel = () => {
    switch(selectedTicketType) {
      case "couple":
        return "Couple (2 People)";
      case "group3":
        return "Group of 3";
      case "single":
      default:
        return "Single Ticket";
    }
  };

  if (loading) {
    return (
      <div className="event-details-page">
        <h2>Loading event...</h2>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="not-found-event">
        <h1>Event not found</h1>
        <p>{error || "This event does not exist."}</p>
      </div>
    );
  }

  const price = getTicketPrice();
  const total = price * quantity;

  const continueToCheckout = () => {
    navigate("/checkout", {
      state: {
        event,
        eventId: event.id,
        ticket: {
          id: selectedTicketType,
          name: getTicketLabel(),
          price
        },
        quantity,
        total
      }
    });
  };

  return (
    <div className="event-details-page">

      <section className="event-details-hero">
        <div>
          <p className="event-category">UPCOMING EVENT</p>
          <h1>{event.title}</h1>
          <p>
            {event.date} • {event.venue}
          </p>
        </div>
      </section>

      <section className="event-details-content">

        <div className="event-description">

          <h2>About this event</h2>

          <p>
            {event.description || "No description available for this event."}
          </p>

          <div className="event-info">

            <div>
              <strong>Date</strong>
              <span>{event.date}</span>
            </div>

            <div>
              <strong>Time</strong>
              <span>{event.time}</span>
            </div>

            <div>
              <strong>Location</strong>
              <span>{event.venue}</span>
            </div>

            <div>
              <strong>Tickets Available</strong>
              <span>{event.available_tickets}</span>
            </div>

          </div>

        </div>

        <div className="ticket-selection">

          <h2>Select Tickets</h2>

          <div className="ticket-types">

            {/* ⬇️⬇️⬇️ REPLACE THE BUTTON WITH THESE ⬇️⬇️⬇️ */}
            
            {/* Single Ticket - Always show */}
            <button
              className={`ticket-option ${selectedTicketType === "single" ? "selected" : ""}`}
              type="button"
              onClick={() => setSelectedTicketType("single")}
            >
              <span>🎫 Single Ticket</span>
              <strong>
                KES {(event.single_price || event.price).toLocaleString()}
              </strong>
            </button>

            {/* Couple Ticket - Only show if couple_price exists */}
            {event.couple_price && event.couple_price > 0 && (
              <button
                className={`ticket-option ${selectedTicketType === "couple" ? "selected" : ""}`}
                type="button"
                onClick={() => setSelectedTicketType("couple")}
              >
                <span>👫 Couple (2 People)</span>
                <strong>
                  KES {event.couple_price.toLocaleString()}
                </strong>
              </button>
            )}

            {/* Group of 3 Ticket - Only show if group3_price exists */}
            {event.group3_price && event.group3_price > 0 && (
              <button
                className={`ticket-option ${selectedTicketType === "group3" ? "selected" : ""}`}
                type="button"
                onClick={() => setSelectedTicketType("group3")}
              >
                <span>👥 Group of 3</span>
                <strong>
                  KES {event.group3_price.toLocaleString()}
                </strong>
              </button>
            )}

          </div>

          <div className="quantity-section">

            <span>Quantity</span>

            <div className="quantity-controls">

              <button
                type="button"
                onClick={decreaseQuantity}
              >
                −
              </button>

              <strong>{quantity}</strong>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={
                  quantity >= 10 ||
                  quantity >= event.available_tickets
                }
              >
                +
              </button>

            </div>

          </div>

          <div className="checkout-summary">

            <span>Total ({quantity} × {getTicketLabel()})</span>

            <strong>
              KES {total.toLocaleString()}
            </strong>

          </div>

          <button
            className="checkout-button"
            onClick={continueToCheckout}
            disabled={event.available_tickets <= 0}
          >
            {event.available_tickets <= 0
              ? "Sold Out"
              : "Continue to Checkout"}
          </button>

        </div>

      </section>

    </div>
  );
}