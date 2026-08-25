import {
  useEffect,
  useState
} from "react";

import {
  Link
} from "react-router-dom";


export default function EventsManagement() {

  const [
    events,
    setEvents
  ] = useState([]);


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState("");


  async function loadEvents() {

    try {

      setLoading(true);
      setError("");


      const response =
        await fetch(
          "http://localhost:5000/api/events",
          {
            method: "GET",
            credentials: "include"
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load events."
        );

      }


      setEvents(
        Array.isArray(data)
          ? data
          : []
      );


    } catch (error) {

      console.error(
        "Events loading error:",
        error
      );

      setError(
        error.message
      );


    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    loadEvents();

  }, []);


  async function handleArchiveEvent(event) {

    const confirmed =
      window.confirm(
        `Archive "${event.title}"? This will also archive all tickets belonging to this event.`
      );


    if (!confirmed) {
      return;
    }


    try {

      const response =
        await fetch(
          `http://localhost:5000/api/events/${event.id}`,
          {
            method: "DELETE",

            credentials: "include"
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to archive event."
        );

      }


      setEvents(
        (currentEvents) =>
          currentEvents.filter(
            (item) =>
              item.id !== event.id
          )
      );


    } catch (error) {

      console.error(
        "Archive event error:",
        error
      );

      alert(
        error.message
      );

    }

  }


  return (

    <div className="admin-page">

      <aside className="admin-sidebar">

        <div className="admin-brand">

          Ticket<span>Hub</span>

          <small>
            ADMIN
          </small>

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
          ← Back to website
        </Link>

      </aside>


      <main className="admin-main">

        <header className="admin-header">

          <div>

            <p className="admin-label">
              EVENT MANAGEMENT
            </p>

            <h1>
              Events
            </h1>

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

              <h2>
                All Events
              </h2>

            </div>


            <span>
              {events.length} event
              {events.length === 1
                ? ""
                : "s"}
            </span>

          </div>


          {error && (

            <div className="admin-form-error">
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
                📅
              </div>

              <h3>
                No events yet
              </h3>

              <p>
                Create your first event to start
                selling tickets.
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

              {events.map((event) => (

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
                      {event.time} · {event.venue}
                    </span>

                  </div>


                  <div>

                    <strong>
                      KSh{" "}
                      {Number(
                        event.price
                      ).toLocaleString()}
                    </strong>

                    <span>
                      {event.available_tickets} /{" "}
                      {event.total_tickets}{" "}
                      tickets available
                    </span>

                  </div>


                  <div>

                    <Link
                      to={`/admin/events/edit/${event.id}`}
                      className="admin-secondary-button"
                    >
                      Edit
                    </Link>


                    <button
                      type="button"
                      className="admin-secondary-button"

                      onClick={() =>
                        handleArchiveEvent(
                          event
                        )
                      }
                    >
                      Archive
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>

  );

}