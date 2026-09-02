import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/events");

        if (!response.ok) {
          throw new Error("Failed to load events.");
        }

        const data = await response.json();

        const eventList = Array.isArray(data)
          ? data
          : Array.isArray(data.events)
            ? data.events
            : [];

        setEvents(eventList);
      } catch (err) {
        console.error("Load events error:", err);
        setError(
          err.message ||
          "Unable to load events. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  return (
    <div className="events-page">

      <section className="events-header">
        <p className="section-label">
          DISCOVER WHAT'S HAPPENING
        </p>

        <h1>
          Upcoming Events
        </h1>

        <p>
          Find your next experience.
        </p>
      </section>

      {loading && (
        <div className="admin-empty">
          <p>Loading events...</p>
        </div>
      )}

      {error && (
        <div className="admin-empty">
          <h3>Unable to load events</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="admin-empty">
          <h3>No upcoming events</h3>
          <p>
            There are currently no upcoming events available.
          </p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <section className="events-grid">

          {events.map((event) => {

            const price = Number(
              event.early_bird_enabled &&
              event.early_bird_single_price
                ? event.early_bird_single_price
                : event.single_price ||
                  event.price ||
                  0
            );

            const hasEarlyBird =
              Boolean(event.early_bird_enabled) &&
              Number(event.early_bird_single_price) > 0;

            return (
              <article
                className="event-card"
                key={event.id}
              >

                <Link
                  to={`/events/${event.id}`}
                  className="event-card-link"
                >

                  <div
                    className="event-image"
                    style={
                      event.image
                        ? {
                            backgroundImage:
                              `url("${event.image}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center"
                          }
                        : {}
                    }
                  >
                    {!event.image && (
                      <span>EVENT</span>
                    )}
                  </div>

                  <div className="event-content">

                    <p className="event-category">
                      UPCOMING EVENT
                    </p>

                    <h2>
                      {event.title}
                    </h2>

                    <p>
                      {event.date}
                    </p>

                    <p>
                      {event.time}
                    </p>

                    <p>
                      {event.venue}
                    </p>

                    <div className="event-bottom">

                      <strong>
                        From KES{" "}
                        {price.toLocaleString()}
                      </strong>

                      <span className="view-event">
                        Select Tickets
                      </span>

                    </div>

                    {hasEarlyBird && (
                      <small>
                        Early Bird available
                      </small>
                    )}

                  </div>

                </Link>

              </article>
            );
          })}

        </section>
      )}

    </div>
  );
}
