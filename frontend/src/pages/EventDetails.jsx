import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTicketType, setSelectedTicketType] =
    useState("single");

  const [quantity, setQuantity] = useState(1);

  /*
  ============================================================
  FETCH EVENT
  ============================================================
  */

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/events/${id}`);

        if (!response.ok) {
          throw new Error("Event not found.");
        }

        const data = await response.json();

        console.log("=================================");
        console.log("EVENT DETAILS");
        console.log(data);
        console.log("=================================");

        console.log("EARLY BIRD DATA", {
          enabled: data.early_bird_enabled,
          price: data.early_bird_single_price,
          expiry: data.early_bird_expiry
        });

        setEvent(data);
      } catch (err) {
        console.error("Failed to load event:", err);

        setError(
          err.message || "Failed to load event."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

  /*
  ============================================================
  NORMALIZE BOOLEAN
  ============================================================
  */

  function isEarlyBirdEnabled() {
    if (!event) {
      return false;
    }

    const value = event.early_bird_enabled;

    return (
      value === true ||
      value === 1 ||
      value === "1" ||
      value === "true" ||
      value === "TRUE" ||
      value === "True"
    );
  }

  /*
  ============================================================
  EARLY BIRD PRICE
  ============================================================
  */

  function getEarlyBirdPrice() {
    if (!event) {
      return 0;
    }

    const price = Number(
      event.early_bird_single_price
    );

    if (!Number.isFinite(price) || price <= 0) {
      return 0;
    }

    return price;
  }

  /*
  ============================================================
  NORMAL PRICE
  ============================================================
  */

  function getSinglePrice() {
    if (!event) {
      return 0;
    }

    return Number(
      event.single_price ||
      event.price ||
      0
    );
  }

  /*
  ============================================================
  EARLY BIRD EXPIRY
  ============================================================
  */

  function getEarlyBirdExpiry() {
    if (!event) {
      return null;
    }

    if (!event.early_bird_expiry) {
      return null;
    }

    const raw = String(
      event.early_bird_expiry
    ).trim();

    if (!raw) {
      return null;
    }

    /*
      PostgreSQL DATE example:

      2026-11-20

      PostgreSQL timestamp example:

      2026-11-20T00:00:00.000Z

      We only need the YYYY-MM-DD portion.
    */

    const match = raw.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

    if (!match) {
      console.warn(
        "Could not parse early bird expiry:",
        raw
      );

      return null;
    }

    const datePart = match[1];

    /*
      Use the END of the expiry day.
    */

    const expiry = new Date(
      `${datePart}T23:59:59`
    );

    if (Number.isNaN(expiry.getTime())) {
      return null;
    }

    return expiry;
  }

  /*
  ============================================================
  EARLY BIRD ACTIVE
  ============================================================
  */

  function isEarlyBirdActive() {
    if (!event) {
      return false;
    }

    /*
      Feature must be enabled.
    */

    if (!isEarlyBirdEnabled()) {
      return false;
    }

    /*
      Early Bird must have a valid price.
    */

    const earlyBirdPrice =
      getEarlyBirdPrice();

    if (earlyBirdPrice <= 0) {
      return false;
    }

    /*
      If there is NO expiry date,
      keep Early Bird active because the
      feature itself is enabled and has
      a valid price.

      This also prevents PostgreSQL date
      formatting from accidentally hiding
      the ticket.
    */

    const expiry =
      getEarlyBirdExpiry();

    if (!expiry) {
      console.warn(
        "Early Bird enabled but expiry is missing/unreadable. Showing Early Bird."
      );

      return true;
    }

    const now = new Date();

    return now <= expiry;
  }

  /*
  ============================================================
  TICKET PRICE
  ============================================================
  */

  function getTicketPrice() {
    if (!event) {
      return 0;
    }

    switch (selectedTicketType) {
      case "early_bird":
        return isEarlyBirdActive()
          ? getEarlyBirdPrice()
          : getSinglePrice();

      case "couple":
        return Number(
          event.couple_price || 0
        );

      case "group3":
        return Number(
          event.group3_price || 0
        );

      case "single":
      default:
        return getSinglePrice();
    }
  }

  /*
  ============================================================
  TICKET LABEL
  ============================================================
  */

  function getTicketLabel() {
    switch (selectedTicketType) {
      case "early_bird":
        return "Early Bird";

      case "couple":
        return "Couple (2 People)";

      case "group3":
        return "Group of 3";

      case "single":
      default:
        return "Single Ticket";
    }
  }

  /*
  ============================================================
  QUANTITY
  ============================================================
  */

  function increaseQuantity() {
    if (!event) {
      return;
    }

    const available =
      Number(event.available_tickets || 0);

    if (
      quantity < 10 &&
      quantity < available
    ) {
      setQuantity(
        current => current + 1
      );
    }
  }

  function decreaseQuantity() {
    if (quantity > 1) {
      setQuantity(
        current => current - 1
      );
    }
  }

  /*
  ============================================================
  RESET INVALID EARLY BIRD SELECTION
  ============================================================
  */

  useEffect(() => {
    if (
      selectedTicketType === "early_bird" &&
      !isEarlyBirdActive()
    ) {
      setSelectedTicketType("single");
    }
  }, [
    event,
    selectedTicketType
  ]);

  /*
  ============================================================
  LOADING
  ============================================================
  */

  if (loading) {
    return (
      <div className="event-details-page">
        <h2>Loading event...</h2>
      </div>
    );
  }

  /*
  ============================================================
  ERROR
  ============================================================
  */

  if (error || !event) {
    return (
      <div className="not-found-event">
        <h1>Event not found</h1>

        <p>
          {error ||
            "This event does not exist."}
        </p>
      </div>
    );
  }

  /*
  ============================================================
  VALUES
  ============================================================
  */

  const availableTickets =
    Number(
      event.available_tickets || 0
    );

  const earlyBirdActive =
    isEarlyBirdActive();

  const earlyBirdPrice =
    getEarlyBirdPrice();

  const singlePrice =
    getSinglePrice();

  const price =
    getTicketPrice();

  const total =
    price * quantity;

  /*
  ============================================================
  CHECKOUT
  ============================================================
  */

  function continueToCheckout() {
    if (
      availableTickets <= 0 ||
      price <= 0
    ) {
      return;
    }

    console.log(
      "CHECKOUT TICKET:",
      {
        type: selectedTicketType,
        name: getTicketLabel(),
        price,
        quantity,
        total
      }
    );

    navigate("/checkout", {
      state: {
        event,
        eventId: event.id,

        ticket: {
          id: selectedTicketType,
          name: getTicketLabel(),
          price: price
        },

        quantity,
        total
      }
    });
  }

  /*
  ============================================================
  PAGE
  ============================================================
  */

  return (
    <div className="event-details-page">

      {/* ======================================================
          HERO
      ====================================================== */}

      <section
        className="event-details-hero"
        style={
          event.image
            ? {
                backgroundImage:
                  `linear-gradient(
                    rgba(0,0,0,0.45),
                    rgba(0,0,0,0.45)
                  ),
                  url("${event.image}")`,

                backgroundSize: "cover",
                backgroundPosition: "center"
              }
            : {}
        }
      >
        <div>

          <p className="event-category">
            UPCOMING EVENT
          </p>

          <h1>
            {event.title}
          </h1>

          <p>
            {event.date} • {event.venue}
          </p>

        </div>
      </section>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <section className="event-details-content">

        {/* ====================================================
            DESCRIPTION
        ==================================================== */}

        <div className="event-description">

          <h2>
            About this event
          </h2>

          <p>
            {event.description ||
              "No description available for this event."}
          </p>

          <div className="event-info">

            <div>
              <strong>
                Date
              </strong>

              <span>
                {event.date}
              </span>
            </div>

            <div>
              <strong>
                Time
              </strong>

              <span>
                {event.time}
              </span>
            </div>

            <div>
              <strong>
                Location
              </strong>

              <span>
                {event.venue}
              </span>
            </div>

            <div>
              <strong>
                Tickets Available
              </strong>

              <span>
                {availableTickets}
              </span>
            </div>

          </div>

        </div>

        {/* ====================================================
            TICKET SELECTION
        ==================================================== */}

        <div className="ticket-selection">

          <h2>
            Select Tickets
          </h2>

          <div className="ticket-types">

            {/* ================================================
                EARLY BIRD
            ================================================= */}

            {earlyBirdActive && (
              <button
                type="button"
                className={
                  `ticket-option ${
                    selectedTicketType ===
                    "early_bird"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setSelectedTicketType(
                    "early_bird"
                  )
                }
              >

                <span>
                  Early Bird
                </span>

                <strong>
                  KES{" "}
                  {earlyBirdPrice.toLocaleString()}
                </strong>

              </button>
            )}

            {/* ================================================
                SINGLE
            ================================================= */}

            <button
              type="button"
              className={
                `ticket-option ${
                  selectedTicketType ===
                  "single"
                    ? "selected"
                    : ""
                }`
              }
              onClick={() =>
                setSelectedTicketType(
                  "single"
                )
              }
            >

              <span>
                Single Ticket
              </span>

              <strong>
                KES{" "}
                {singlePrice.toLocaleString()}
              </strong>

            </button>

            {/* ================================================
                COUPLE
            ================================================= */}

            {Number(
              event.couple_price
            ) > 0 && (

              <button
                type="button"
                className={
                  `ticket-option ${
                    selectedTicketType ===
                    "couple"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setSelectedTicketType(
                    "couple"
                  )
                }
              >

                <span>
                  Couple (2 People)
                </span>

                <strong>
                  KES{" "}
                  {Number(
                    event.couple_price
                  ).toLocaleString()}
                </strong>

              </button>

            )}

            {/* ================================================
                GROUP OF 3
            ================================================= */}

            {Number(
              event.group3_price
            ) > 0 && (

              <button
                type="button"
                className={
                  `ticket-option ${
                    selectedTicketType ===
                    "group3"
                      ? "selected"
                      : ""
                  }`
                }
                onClick={() =>
                  setSelectedTicketType(
                    "group3"
                  )
                }
              >

                <span>
                  Group of 3
                </span>

                <strong>
                  KES{" "}
                  {Number(
                    event.group3_price
                  ).toLocaleString()}
                </strong>

              </button>

            )}

          </div>

          {/* ==================================================
              EARLY BIRD INFORMATION
          ================================================== */}

          {earlyBirdActive && (
            <div
              style={{
                marginTop: "12px",
                marginBottom: "18px",
                padding: "14px 16px",
                borderRadius: "8px",
                background: "#fff7e6",
                border: "1px solid #f0c36d",
                color: "#7a5200",
                fontSize: "14px"
              }}
            >

              <strong>
                Early Bird Available
              </strong>

              <div>
                Get your ticket at the
                Early Bird price of{" "}
                <strong>
                  KES{" "}
                  {earlyBirdPrice.toLocaleString()}
                </strong>
                .
              </div>

              {event.early_bird_expiry && (
                <div
                  style={{
                    marginTop: "4px"
                  }}
                >
                  Offer ends:
                  {" "}
                  {String(
                    event.early_bird_expiry
                  ).substring(0, 10)}
                </div>
              )}

            </div>
          )}

          {/* ==================================================
              QUANTITY
          ================================================== */}

          <div className="quantity-section">

            <span>
              Quantity
            </span>

            <div className="quantity-controls">

              <button
                type="button"
                onClick={
                  decreaseQuantity
                }
                disabled={
                  quantity <= 1
                }
              >
                −
              </button>

              <strong>
                {quantity}
              </strong>

              <button
                type="button"
                onClick={
                  increaseQuantity
                }
                disabled={
                  quantity >= 10 ||
                  quantity >=
                    availableTickets
                }
              >
                +
              </button>

            </div>

          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="checkout-summary">

            <span>
              Total ({quantity} ×{" "}
              {getTicketLabel()})
            </span>

            <strong>
              KES{" "}
              {total.toLocaleString()}
            </strong>

          </div>

          {/* ==================================================
              CHECKOUT BUTTON
          ================================================== */}

          <button
            type="button"
            className="checkout-button"
            onClick={
              continueToCheckout
            }
            disabled={
              availableTickets <= 0 ||
              price <= 0
            }
          >

            {availableTickets <= 0
              ? "Sold Out"
              : price <= 0
                ? "Ticket Unavailable"
                : "Continue to Checkout"}

          </button>

        </div>

      </section>

    </div>
  );
}
