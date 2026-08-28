import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState([]);
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

        setFeaturedEvents(data.slice(0, 3));
      } catch (err) {
        console.error("Load homepage events error:", err);
        setError("Unable to load events.");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  return (
    <div className="home-page">

      <section className="hero-section">

        <div className="hero-content">

          <p className="hero-label">
            TICKETHUB
          </p>

          <h1>
            Discover experiences.
            <br />
            Book your next event.
          </h1>

          <p className="hero-description">
            Find concerts, festivals, comedy shows and
            unforgettable experiences happening near you.
          </p>

          <div className="hero-actions">

            <Link
              to="/events"
              className="hero-button primary"
            >
              Explore Events
            </Link>

            <Link
              to="/events"
              className="hero-button secondary"
            >
              Buy Tickets
            </Link>

          </div>

        </div>

      </section>

      <section className="featured-section">

        <div className="section-heading">

          <div>

            <p className="section-label">
              DON'T MISS OUT
            </p>

            <h2>
              Upcoming Events
            </h2>

          </div>

          <Link to="/events">
            View All Events ?
          </Link>

        </div>

        {loading && (
          <p>Loading events...</p>
        )}

        {error && (
          <p>{error}</p>
        )}

        {!loading && !error && featuredEvents.length === 0 && (
          <p>
            No upcoming events available.
          </p>
        )}

        {!loading && !error && featuredEvents.length > 0 && (

          <div className="events-grid">

            {featuredEvents.map((event) => (

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
                      <span>
                        EVENT
                      </span>
                    )}
                  </div>

                  <div className="event-content">

                    <p className="event-category">
                      UPCOMING EVENT
                    </p>

                    <h3>
                      {event.title}
                    </h3>

                    <p>
                      {event.date}
                    </p>

                    <p>
                      {event.venue}
                    </p>

                    <div className="event-bottom">

                      <strong>
                        From KES{" "}
                        {Number(event.price).toLocaleString()}
                      </strong>

                      <span>
                        View Event
                      </span>

                    </div>

                  </div>

                </Link>

              </article>

            ))}

          </div>

        )}

      </section>

      <section className="home-cta">

        <p className="section-label">
          READY?
        </p>

        <h2>
          Your next experience is waiting.
        </h2>

        <Link
          to="/events"
          className="hero-button primary"
        >
          Browse All Events
        </Link>

      </section>

    </div>
  );
}
