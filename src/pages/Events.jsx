import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch("http://localhost:5000/api/events");

        if (!response.ok) {
          throw new Error("Failed to load events.");
        }

        const data = await response.json();

        setEvents(data);
      } catch (err) {
        console.error("Load events error:", err);
        setError("Unable to load events. Please try again.");
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
        <p>
          Loading events...
        </p>
      )}

      {error && (
        <p>
          {error}
        </p>
      )}

      {!loading && !error && events.length === 0 && (
        <p>
          No upcoming events available.
        </p>
      )}

      {!loading && !error && events.length > 0 && (
        <section className="events-grid">

          {events.map((event) => (

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
                          backgroundImage: `url(${event.image})`,
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
                    {event.venue}
                  </p>

                  <div className="event-bottom">

                    <strong>
                      From KES {Number(event.price).toLocaleString()}
                    </strong>

                    <span className="view-event">
                      Select Tickets →
                    </span>

                  </div>

                </div>

              </Link>

            </article>

          ))}

        </section>
      )}

    </div>
  );
}
