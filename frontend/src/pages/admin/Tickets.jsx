import {
  useEffect,
  useState
} from "react";

import {
  Link
} from "react-router-dom";


export default function Tickets() {

  const [
    tickets,
    setTickets
  ] = useState([]);


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState("");


  const [
    actionLoading,
    setActionLoading
  ] = useState(null);


  async function loadTickets() {

    try {

      setLoading(true);
      setError("");


      const response =
        await fetch(
          "/api/tickets/admin/all",
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
          "Failed to load tickets."
        );

      }


      setTickets(
        Array.isArray(data)
          ? data
          : []
      );


    } catch (err) {

      console.error(
        "Load tickets error:",
        err
      );

      setError(
        err.message
      );


    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    loadTickets();

  }, []);


  async function handleSoftDelete(
    ticketId
  ) {

    if (
      !window.confirm(
        "Move this ticket to deleted items?"
      )
    ) {
      return;
    }


    try {

      setActionLoading(
        ticketId
      );


      const response =
        await fetch(
          `/api/tickets/${ticketId}/soft`,
          {
            method: "DELETE",

            credentials:
              "include"
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to delete ticket."
        );

      }


      await loadTickets();


      alert(
        "Ticket moved to deleted items."
      );


    } catch (err) {

      console.error(
        "Delete ticket error:",
        err
      );

      alert(
        err.message
      );


    } finally {

      setActionLoading(
        null
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

          <Link to="/admin/events">
            Events
          </Link>

          <Link to="/admin/orders">
            Orders
          </Link>

          <Link
            to="/admin/tickets"
            className="active"
          >
            Tickets
          </Link>

          <Link to="/admin/deleted-tickets">
            🗑 Deleted
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
              TICKET MANAGEMENT
            </p>

            <h1>
              Tickets
            </h1>

            <p>
              View and manage purchased
              tickets.
            </p>

          </div>

        </header>


        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                TICKETS
              </p>

              <h2>
                All Tickets
              </h2>

            </div>


            <span>
              {tickets.length} ticket
              {tickets.length === 1
                ? ""
                : "s"}
            </span>

          </div>


          {loading ? (

            <div className="admin-empty">

              <h3>
                Loading tickets...
              </h3>

            </div>

          ) : error ? (

            <div className="admin-empty">

              <h3>
                Unable to load tickets
              </h3>

              <p>
                {error}
              </p>


              <button
                type="button"
                className="admin-secondary-button"
                onClick={
                  loadTickets
                }
              >
                Try Again
              </button>

            </div>

          ) : tickets.length === 0 ? (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                🎟
              </div>

              <h3>
                No tickets found
              </h3>

              <p>
                Purchased tickets will
                appear here.
              </p>

            </div>

          ) : (

            <div
              className="admin-ticket-list"
              style={{
                overflowX: "auto"
              }}
            >

              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse"
                }}
              >

                <thead>

                  <tr>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Ticket
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Customer
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Event
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Type
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Quantity
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Status
                    </th>

                    <th
                      style={{
                        textAlign:
                          "left",
                        padding:
                          "12px"
                      }}
                    >
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {tickets.map(
                    (ticket) => (

                      <tr
                        key={
                          ticket.ticket_id
                        }
                      >

                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          <strong>
                            {
                              ticket.ticket_id
                            }
                          </strong>

                        </td>


                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          <strong>
                            {
                              ticket.customer_name
                            }
                          </strong>

                          <br />

                          <span>
                            {
                              ticket.customer_email
                            }
                          </span>

                        </td>


                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          {
                            ticket.event_title
                          }

                        </td>


                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          {
                            ticket.ticket_type
                          }

                        </td>


                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          {
                            ticket.quantity
                          }

                        </td>


                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          <span
                            className={
                              ticket.ticket_status ===
                              "USED"
                                ? "ticket-status used"
                                : "ticket-status valid"
                            }
                          >
                            {
                              ticket.ticket_status
                            }
                          </span>

                        </td>


                        <td
                          style={{
                            padding:
                              "12px"
                          }}
                        >

                          <button
                            type="button"
                            className="admin-secondary-button"

                            disabled={
                              actionLoading ===
                              ticket.ticket_id
                            }

                            onClick={() =>
                              handleSoftDelete(
                                ticket.ticket_id
                              )
                            }
                          >

                            {actionLoading ===
                            ticket.ticket_id
                              ? "Deleting..."
                              : "Delete"}

                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>

    </div>

  );

}
