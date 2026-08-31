import {
  useEffect,
  useState
} from "react";

import {
  Link
} from "react-router-dom";


export default function AdminDashboard() {

  const [
    stats,
    setStats
  ] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    validTickets: 0,
    usedTickets: 0
  });


  const [
    recentTickets,
    setRecentTickets
  ] = useState([]);


  const [
    loading,
    setLoading
  ] = useState(true);


  function openGmail(ticket) {

    const customerEmail =
      ticket.customer_email || "";

    if (!customerEmail) {

      alert(
        "This ticket does not have a customer email address."
      );

      return;
    }


    const customerName =
      ticket.customer_name ||
      "Customer";

    const eventTitle =
      ticket.event_title ||
      "TicketHub Event";

    const ticketId =
      ticket.ticket_id ||
      ticket.id ||
      "";

    const ticketType =
      ticket.ticket_type ||
      "";

    const quantity =
      Number(ticket.quantity || 1);

    const total =
      Number(ticket.price || 0) *
      quantity;


    const subject =
      `Your Ticket - ${eventTitle}`;


    const body =
`Hello ${customerName},

Your payment has been confirmed and your TicketHub ticket is ready.

EVENT: ${eventTitle}
TICKET ID: ${ticketId}
TICKET TYPE: ${ticketType}
QUANTITY: ${quantity}
TOTAL PAID: KES ${total.toLocaleString()}

Please find your ticket/QR code attached to this email.

At the entrance you will need:
1. Your ticket QR code
2. Your 6-digit verification code

Your verification code will be sent to this email on the day of the event.

Gala arrival:
5:00 PM – 5:45 PM

Please keep your ticket and verification information private.

Thank you,
TicketHub`;


    const gmailUrl =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(customerEmail)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;


    window.open(
      gmailUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }


  useEffect(() => {

    async function loadDashboard() {

      try {

        const [
          statsResponse,
          ticketsResponse
        ] = await Promise.all([

          fetch(
            "/api/tickets/admin/dashboard",
            {
              method: "GET",
              credentials:
                "include"
            }
          ),

          fetch(
            "/api/tickets/admin/recent",
            {
              method: "GET",
              credentials:
                "include"
            }
          )

        ]);


        const statsData =
          await statsResponse.json();


        const ticketsData =
          await ticketsResponse.json();


        if (
          !statsResponse.ok ||
          !ticketsResponse.ok
        ) {

          throw new Error(
            statsData.message ||
            ticketsData.message ||
            `Dashboard API error: ${statsResponse.status} / ${ticketsResponse.status}`
          );

        }


        setStats({

          totalTickets:
            Number(
              statsData.totalTickets ||
              0
            ),

          totalRevenue:
            Number(
              statsData.totalRevenue ||
              0
            ),

          validTickets:
            Number(
              statsData.validTickets ||
              0
            ),

          usedTickets:
            Number(
              statsData.usedTickets ||
              0
            )

        });


        setRecentTickets(

          Array.isArray(
            ticketsData
          )
            ? ticketsData
            : []

        );


      } catch (error) {

        console.error(
          "Dashboard loading error:",
          error
        );


        setStats({

          totalTickets: 0,
          totalRevenue: 0,
          validTickets: 0,
          usedTickets: 0

        });


        setRecentTickets([]);


      } finally {

        setLoading(false);

      }

    }


    loadDashboard();

  }, []);


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

          <Link
            to="/admin"
            className="active"
          >
            Dashboard
          </Link>

          <Link to="/admin/events">
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
              ADMIN DASHBOARD
            </p>

            <h1>
              Overview
            </h1>

            <p>
              Manage your events,
              tickets and orders.
            </p>

          </div>


          <Link
            to="/admin/events/create"
            className="admin-primary-button"
          >
            + Create Event
          </Link>

        </header>


        <section className="admin-stats">

          <div className="admin-stat-card">

            <span>
              Total Tickets
            </span>

            <strong>
              {loading
                ? "..."
                : stats.totalTickets}
            </strong>

            <small>
              Tickets sold
            </small>

          </div>


          <div className="admin-stat-card">

            <span>
              Total Revenue
            </span>

            <strong>

              {loading
                ? "..."
                : `KSh ${Number(
                    stats.totalRevenue ||
                      0
                  ).toLocaleString()}`}

            </strong>

            <small>
              From ticket sales
            </small>

          </div>


          <div className="admin-stat-card">

            <span>
              Valid Tickets
            </span>

            <strong>
              {loading
                ? "..."
                : stats.validTickets}
            </strong>

            <small>
              Available for entry
            </small>

          </div>


          <div className="admin-stat-card">

            <span>
              Used Tickets
            </span>

            <strong>
              {loading
                ? "..."
                : stats.usedTickets}
            </strong>

            <small>
              Already scanned
            </small>

          </div>

        </section>


        <section className="admin-section">

          <div className="admin-section-header">

            <div>

              <p className="admin-label">
                TICKETS
              </p>

              <h2>
                Recent Tickets
              </h2>

            </div>


            <Link to="/admin/tickets">
              View all →
            </Link>

          </div>


          {loading ? (

            <div className="admin-empty">

              <h3>
                Loading tickets...
              </h3>

            </div>

          ) : recentTickets.length === 0 ? (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                🎟️
              </div>

              <h3>
                Ticket activity will
                appear here
              </h3>

              <p>
                Once customers purchase
                tickets, their information
                will appear in this
                dashboard.
              </p>


              <Link
                to="/admin/tickets"
                className="admin-secondary-button"
              >
                Manage Tickets
              </Link>

            </div>

          ) : (

            <div className="admin-ticket-list">

              {recentTickets.map(
                (ticket) => (

                  <div
                    className="admin-ticket-row"
                    key={
                      ticket.ticket_id
                    }
                  >

                    <div>

                      <strong>
                        {
                          ticket.ticket_id
                        }
                      </strong>

                      <span>
                        {
                          ticket.event_title
                        }
                      </span>

                    </div>


                    <div>

                      <strong>
                        {
                          ticket.customer_name
                        }
                      </strong>

                      <span>
                        {
                          ticket.customer_email
                        }
                      </span>

                    </div>


                    <div>

                      <strong>

                        KSh{" "}

                        {Number(
                          ticket.price *
                            ticket.quantity
                        ).toLocaleString()}

                      </strong>

                      <span>

                        {
                          ticket.ticket_type
                        }

                        {" × "}

                        {
                          ticket.quantity
                        }

                      </span>

                    </div>


                    <div>

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

                    </div>


                    <div>

                      <button
                        type="button"
                        onClick={() =>
                          openGmail(ticket)
                        }
                        style={{
                          background:
                            "#ea4335",
                          color:
                            "#fff",
                          border:
                            "none",
                          borderRadius:
                            "8px",
                          padding:
                            "9px 14px",
                          cursor:
                            "pointer",
                          fontWeight:
                            "600",
                          whiteSpace:
                            "nowrap"
                        }}
                      >
                        📧 Gmail
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>

  );

}
