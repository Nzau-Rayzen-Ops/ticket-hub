import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        /*
          Orders are currently based on ticket purchases.

          We use the admin tickets endpoint because your
          current backend does not yet have a dedicated
          /api/orders admin endpoint.
        */
        const response = await fetch(
          "http://localhost:5000/api/tickets/admin/all",
          {
            method: "GET",
            credentials: "include"
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load orders."
          );
        }

        /*
          Make sure we always work with an array.
        */
        const ticketList = Array.isArray(data)
          ? data
          : [];

        /*
          Group tickets by customer + event.

          This gives us an order-like view even though
          the current database/API is ticket based.
        */
        const groupedOrders = {};

        ticketList.forEach((ticket) => {
          const customerEmail =
            ticket.customer_email || "unknown";

          const eventId =
            ticket.event_id ||
            ticket.event_title ||
            "unknown-event";

          const key =
            `${customerEmail}-${eventId}`;

          if (!groupedOrders[key]) {
            groupedOrders[key] = {
              id: key,

              customer_name:
                ticket.customer_name ||
                "Unknown Customer",

              customer_email:
                customerEmail,

              event_title:
                ticket.event_title ||
                "Unknown Event",

              tickets: [],

              totalQuantity: 0,

              totalAmount: 0,

              status: "VALID",

              latestTicket: ticket
            };
          }

          groupedOrders[key].tickets.push(ticket);

          const quantity =
            Number(ticket.quantity) || 0;

          const price =
            Number(ticket.price) || 0;

          groupedOrders[key].totalQuantity +=
            quantity;

          groupedOrders[key].totalAmount +=
            price * quantity;

          /*
            If any ticket is used, show the order
            as having used tickets.
          */
          if (
            ticket.ticket_status === "USED"
          ) {
            groupedOrders[key].status = "USED";
          }
        });

        setOrders(
          Object.values(groupedOrders)
        );

      } catch (err) {
        console.error(
          "Load orders error:",
          err
        );

        setError(
          err.message ||
          "Failed to load orders."
        );

      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <div className="admin-page">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="admin-sidebar">

        <div className="admin-brand">
          Ticket<span>Hub</span>
          <small>ADMIN</small>
        </div>

        <nav className="admin-nav">

          <Link to="/admin">
            Dashboard
          </Link>

          <Link to="/admin/events">
            Events
          </Link>

          <Link
            to="/admin/orders"
            className="active"
          >
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


      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="admin-main">

        <header className="admin-header">

          <div>

            <p className="admin-label">
              ORDER MANAGEMENT
            </p>

            <h1>
              Orders
            </h1>

            <p>
              View customer purchases and
              ticket orders.
            </p>

          </div>

        </header>


        {/* =========================
            ORDERS SECTION
        ========================= */}

        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                CUSTOMER ORDERS
              </p>

              <h2>
                All Orders
              </h2>

            </div>

            <span>
              {orders.length} order
              {orders.length === 1
                ? ""
                : "s"}
            </span>

          </div>


          {/* =========================
              LOADING
          ========================= */}

          {loading && (

            <div className="admin-empty">

              <h3>
                Loading orders...
              </h3>

              <p>
                Please wait while we retrieve
                the customer orders.
              </p>

            </div>

          )}


          {/* =========================
              ERROR
          ========================= */}

          {!loading && error && (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                !
              </div>

              <h3>
                Unable to load orders
              </h3>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="admin-secondary-button"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>

            </div>

          )}


          {/* =========================
              NO ORDERS
          ========================= */}

          {!loading &&
            !error &&
            orders.length === 0 && (

              <div className="admin-empty">

                <div className="admin-empty-icon">
                  🧾
                </div>

                <h3>
                  No orders yet
                </h3>

                <p>
                  Customer purchases will
                  appear here once tickets
                  are sold.
                </p>

                <Link
                  to="/admin/tickets"
                  className="admin-secondary-button"
                >
                  View Tickets
                </Link>

              </div>

            )}


          {/* =========================
              ORDERS LIST
          ========================= */}

          {!loading &&
            !error &&
            orders.length > 0 && (

              <div className="admin-event-list">

                {orders.map((order) => (

                  <div
                    className="admin-event-row"
                    key={order.id}
                  >

                    {/* CUSTOMER */}

                    <div>

                      <strong>
                        {order.customer_name}
                      </strong>

                      <span>
                        {order.customer_email}
                      </span>

                    </div>


                    {/* EVENT */}

                    <div>

                      <strong>
                        {order.event_title}
                      </strong>

                      <span>
                        {order.totalQuantity} ticket
                        {order.totalQuantity === 1
                          ? ""
                          : "s"}
                      </span>

                    </div>


                    {/* AMOUNT */}

                    <div>

                      <strong>
                        KSh{" "}
                        {Number(
                          order.totalAmount
                        ).toLocaleString()}
                      </strong>

                      <span>
                        Total order value
                      </span>

                    </div>


                    {/* STATUS */}

                    <div>

                      <span
                        className={
                          order.status === "USED"
                            ? "ticket-status used"
                            : "ticket-status valid"
                        }
                      >
                        {order.status}
                      </span>

                      <span>
                        {order.tickets.length} ticket
                        {order.tickets.length === 1
                          ? ""
                          : "s"}
                      </span>

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