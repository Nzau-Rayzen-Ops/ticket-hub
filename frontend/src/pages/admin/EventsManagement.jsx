import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Admin.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function EventsManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        API_BASE + "/api/events",
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load events"
        );
      }

      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Events loading error:", err);
      setError(
        err.message || "Failed to load events"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(event) {
    const confirmed = window.confirm(
      'Are you sure you want to delete "' +
        event.title +
        '"?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(event.id);
      setError("");

      const response = await fetch(
        API_BASE + "/api/events/" + event.id,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json"
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete event"
        );
      }

      setEvents(function (currentEvents) {
        return currentEvents.filter(function (item) {
          return item.id !== event.id;
        });
      });
    } catch (err) {
      console.error("Delete event error:", err);

      setError(
        err.message || "Failed to delete event"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          Ticket<span>Hub</span>
          <small>ADMIN</small>
        </div>

        <nav className="admin-nav">
          <Link to="/admin">
            Dashboard
          </Link>

          <Link
            to="/admin/events"
            className="active"
          >
            Events
          </Link>

          <Link to="/admin/orders">
            Orders
          </Link>

          <Link to="/admin/tickets">
            Tickets
          </Link>

          <Link to="/scanner">
            Scanner
          </Link>
        </nav>

        <Link
          to="/"
          className="admin-back"
        >
          Back to website
        </Link>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-label">
              EVENT MANAGEMENT
            </p>

            <h1>Events</h1>

            <p>
              Create and manage your events.
            </p>
          </div>

          <Link
            to="/admin/events/create"
            className="admin-primary-button"
          >
            + Create Event
          </Link>
        </header>

        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <p className="admin-label">
                EVENTS
              </p>

              <h2>All Events</h2>
            </div>

            <span>
              {events.length} event
              {events.length === 1 ? "" : "s"}
            </span>
          </div>

          {error && (
            <div
              className="admin-form-error"
              style={{
                marginBottom: "20px"
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="admin-empty">
              <h3>
                Loading events...
              </h3>
            </div>
          ) : events.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon">
                Calendar
              </div>

              <h3>
                No events yet
              </h3>

              <p>
                Create your first event to
                start selling tickets.
              </p>

              <Link
                to="/admin/events/create"
                className="admin-primary-button"
              >
                + Create Event
              </Link>
            </div>
          ) : (
            <div className="admin-event-list">
              {events.map(function (event) {
                return (
                  <div
                    className="admin-event-row"
                    key={event.id}
                  >
                    <div>
                      <strong>
                        {event.title}
                      </strong>

                      <span>
                        {event.description ||
                          "No description"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {event.date}
                      </strong>

                      <span>
                        {event.time || "Time not set"}{" "}
                        -{" "}
                        {event.venue ||
                          "Venue not set"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        KSh{" "}
                        {Number(
                          event.price || 0
                        ).toLocaleString()}
                      </strong>

                      <span>
                        {event.available_tickets ??
                          0}{" "}
                        /{" "}
                        {event.total_tickets ??
                          0}{" "}
                        tickets available
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap"
                      }}
                    >
                      <Link
                        to={
                          "/admin/events/edit/" +
                          event.id
                        }
                        className="admin-secondary-button"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={function () {
                          handleDelete(event);
                        }}
                        disabled={
                          deletingId === event.id
                        }
                      >
                        {deletingId === event.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
