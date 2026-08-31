import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Orders() {

  const [orders, setOrders] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);

  const [error, setError] = useState("");
  const [pendingError, setPendingError] = useState("");

  const [processingTicket, setProcessingTicket] = useState("");

  const [actionMessage, setActionMessage] = useState({
    type: "",
    text: ""
  });


  /* =========================
     LOAD ALL ORDERS
  ========================= */

  async function loadOrders() {

    try {

      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/tickets/admin/all",
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load orders."
        );

      }

      const ticketList =
        Array.isArray(data)
          ? data
          : [];

      const groupedOrders = {};

      ticketList.forEach((ticket) => {

        const customerEmail =
          ticket.customer_email ||
          "unknown";

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

            status:
              ticket.payment_status === "PENDING"
                ? "PENDING"
                : "VALID",

            latestTicket:
              ticket

          };

        }

        groupedOrders[key].tickets.push(
          ticket
        );

        const quantity =
          Number(ticket.quantity) || 0;

        const price =
          Number(ticket.price) || 0;

        groupedOrders[key].totalQuantity +=
          quantity;

        groupedOrders[key].totalAmount +=
          price * quantity;


        if (
          ticket.ticket_status === "USED"
        ) {

          groupedOrders[key].status =
            "USED";

        }


        if (
          ticket.payment_status ===
          "PENDING"
        ) {

          groupedOrders[key].status =
            "PENDING";

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


  /* =========================
     LOAD PENDING PAYMENTS
  ========================= */

  async function loadPendingPayments() {

    try {

      setPendingLoading(true);
      setPendingError("");

      const response = await fetch(
        "/api/tickets/admin/pending-payments",
        {
          method: "GET",
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load pending payments."
        );

      }

      setPendingPayments(
        Array.isArray(data.payments)
          ? data.payments
          : []
      );

    } catch (err) {

      console.error(
        "Load pending payments error:",
        err
      );

      setPendingError(
        err.message ||
        "Failed to load pending payments."
      );

    } finally {

      setPendingLoading(false);

    }

  }


  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {

    loadOrders();
    loadPendingPayments();

  }, []);


  /* =========================
     CONFIRM PAYMENT
  ========================= */

  async function confirmPayment(ticketId) {

    if (!ticketId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure this M-Pesa payment has been verified? This will activate the ticket and send the ticket to the customer."
      );

    if (!confirmed) {
      return;
    }

    try {

      setProcessingTicket(ticketId);

      setActionMessage({
        type: "",
        text: ""
      });


      const response =
        await fetch(
          "/api/tickets/admin/confirm-payment",
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              ticketId
            })

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to confirm payment."
        );

      }


      setActionMessage({

        type: "success",

        text:
          data.message ||
          "Payment confirmed successfully."

      });


      /*
        Remove the payment immediately
        from the pending list.
      */

      setPendingPayments(
        (current) =>
          current.filter(
            (payment) =>
              payment.ticket_id !==
              ticketId
          )
      );


      /*
        Refresh orders so the newly
        confirmed ticket appears.
      */

      await loadOrders();


    } catch (err) {

      console.error(
        "Confirm payment error:",
        err
      );

      setActionMessage({

        type: "error",

        text:
          err.message ||
          "Failed to confirm payment."

      });

    } finally {

      setProcessingTicket("");

    }

  }


  /* =========================
     REJECT PAYMENT
  ========================= */

  async function rejectPayment(ticketId) {

    if (!ticketId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to reject this payment? The reserved tickets will be returned to inventory."
      );

    if (!confirmed) {
      return;
    }

    try {

      setProcessingTicket(ticketId);

      setActionMessage({
        type: "",
        text: ""
      });


      const response =
        await fetch(
          `/api/tickets/admin/reject-payment/${encodeURIComponent(ticketId)}`,
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
          "Failed to reject payment."
        );

      }


      setActionMessage({

        type: "success",

        text:
          data.message ||
          "Payment rejected successfully."

      });


      /*
        Remove it from pending payments.
      */

      setPendingPayments(
        (current) =>
          current.filter(
            (payment) =>
              payment.ticket_id !==
              ticketId
          )
      );


      /*
        Refresh orders/inventory-related
        information.
      */

      await loadOrders();


    } catch (err) {

      console.error(
        "Reject payment error:",
        err
      );

      setActionMessage({

        type: "error",

        text:
          err.message ||
          "Failed to reject payment."

      });

    } finally {

      setProcessingTicket("");

    }

  }


  return (

    <div className="admin-page">


      {/* =========================
          SIDEBAR
      ========================= */}

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
              Review M-Pesa payments
              and manage customer
              ticket orders.
            </p>

          </div>

        </header>


        {/* =========================
            ACTION MESSAGE
        ========================= */}

        {actionMessage.text && (

          <div
            style={{
              padding: "14px 18px",
              marginBottom: "20px",
              borderRadius: "8px",

              background:
                actionMessage.type ===
                "success"
                  ? "#eaf8ee"
                  : "#fee",

              color:
                actionMessage.type ===
                "success"
                  ? "#176b35"
                  : "#b00020",

              border:
                actionMessage.type ===
                "success"
                  ? "1px solid #b9e5c5"
                  : "1px solid #f2bcbc"
            }}
          >

            {actionMessage.text}

          </div>

        )}


        {/* =========================
            PENDING PAYMENTS
        ========================= */}

        <section className="admin-section">

          <div
            className="admin-section-header"
          >

            <div>

              <p className="admin-label">
                PAYMENT VERIFICATION
              </p>

              <h2>
                Pending M-Pesa Payments
              </h2>

            </div>


            <span
              style={{
                fontWeight: "700"
              }}
            >

              {pendingPayments.length}

              {" "}

              pending

            </span>

          </div>


          {pendingLoading && (

            <div className="admin-empty">

              <h3>
                Loading pending payments...
              </h3>

              <p>
                Checking for customer
                M-Pesa submissions.
              </p>

            </div>

          )}


          {!pendingLoading &&
            pendingError && (

              <div className="admin-empty">

                <div className="admin-empty-icon">
                  !
                </div>

                <h3>
                  Unable to load pending
                  payments
                </h3>

                <p>
                  {pendingError}
                </p>

                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={
                    loadPendingPayments
                  }
                >
                  Try Again
                </button>

              </div>

            )}


          {!pendingLoading &&
            !pendingError &&
            pendingPayments.length === 0 && (

              <div className="admin-empty">

                <div className="admin-empty-icon">
                  ✓
                </div>

                <h3>
                  No pending payments
                </h3>

                <p>
                  New M-Pesa payments
                  submitted by customers
                  will appear here.
                </p>

              </div>

            )}


          {!pendingLoading &&
            !pendingError &&
            pendingPayments.length > 0 && (

              <div
                className="admin-event-list"
              >

                {pendingPayments.map(
                  (payment) => {

                    const isProcessing =
                      processingTicket ===
                      payment.ticket_id;

                    const amount =
                      Number(payment.price || 0) *
                      Number(payment.quantity || 0);


                    return (

                      <div
                        className="admin-event-row"
                        key={
                          payment.ticket_id
                        }
                        style={{
                          alignItems:
                            "center"
                        }}
                      >


                        {/* CUSTOMER */}

                        <div>

                          <strong>
                            {
                              payment.customer_name ||
                              "Unknown Customer"
                            }
                          </strong>

                          <span>
                            {
                              payment.customer_email ||
                              "No email"
                            }
                          </span>

                          <span>
                            {
                              payment.customer_phone ||
                              "No phone"
                            }
                          </span>

                        </div>


                        {/* EVENT */}

                        <div>

                          <strong>
                            {
                              payment.event_title ||
                              "Unknown Event"
                            }
                          </strong>

                          <span>
                            {
                              payment.ticket_type ||
                              "Ticket"
                            }
                            {" × "}
                            {
                              payment.quantity
                            }
                          </span>

                        </div>


                        {/* AMOUNT */}

                        <div>

                          <strong>
                            KSh{" "}
                            {amount.toLocaleString()}
                          </strong>

                          <span>
                            Payment amount
                          </span>

                        </div>


                        {/* RECEIPT */}

                        <div>

                          <strong
                            style={{
                              fontFamily:
                                "monospace",
                              letterSpacing:
                                "1px"
                            }}
                          >
                            {
                              payment.mpesa_receipt_number ||
                              "No receipt"
                            }
                          </strong>

                          <span>
                            M-Pesa receipt
                          </span>

                        </div>


                        {/* ACTIONS */}

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                            flexWrap:
                              "wrap"
                          }}
                        >

                          <button
                            type="button"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              confirmPayment(
                                payment.ticket_id
                              )
                            }
                            style={{
                              padding:
                                "10px 14px",
                              border:
                                "none",
                              borderRadius:
                                "6px",
                              cursor:
                                isProcessing
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight:
                                "700",
                              opacity:
                                isProcessing
                                  ? 0.6
                                  : 1
                            }}
                          >

                            {isProcessing
                              ? "Processing..."
                              : "Confirm"}

                          </button>


                          <button
                            type="button"
                            disabled={
                              isProcessing
                            }
                            onClick={() =>
                              rejectPayment(
                                payment.ticket_id
                              )
                            }
                            style={{
                              padding:
                                "10px 14px",
                              border:
                                "none",
                              borderRadius:
                                "6px",
                              cursor:
                                isProcessing
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight:
                                "700",
                              opacity:
                                isProcessing
                                  ? 0.6
                                  : 1
                            }}
                          >

                            {isProcessing
                              ? "Processing..."
                              : "Reject"}

                          </button>

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            )}

        </section>


        {/* =========================
            ALL ORDERS
        ========================= */}

        <section className="admin-section">

          <div
            className="admin-section-header"
          >

            <div>

              <p className="admin-label">
                CUSTOMER ORDERS
              </p>

              <h2>
                All Orders
              </h2>

            </div>


            <span>

              {orders.length}

              {" "}

              order
              {orders.length === 1
                ? ""
                : "s"}

            </span>

          </div>


          {/* LOADING */}

          {loading && (

            <div className="admin-empty">

              <h3>
                Loading orders...
              </h3>

              <p>
                Please wait while we
                retrieve customer
                orders.
              </p>

            </div>

          )}


          {/* ERROR */}

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
                onClick={
                  loadOrders
                }
              >
                Try Again
              </button>

            </div>

          )}


          {/* NO ORDERS */}

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
                  Customer purchases
                  will appear here once
                  tickets are sold.
                </p>

                <Link
                  to="/admin/tickets"
                  className="admin-secondary-button"
                >
                  View Tickets
                </Link>

              </div>

            )}


          {/* ORDERS LIST */}

          {!loading &&
            !error &&
            orders.length > 0 && (

              <div className="admin-event-list">

                {orders.map(
                  (order) => (

                    <div
                      className="admin-event-row"
                      key={order.id}
                    >


                      {/* CUSTOMER */}

                      <div>

                        <strong>
                          {
                            order.customer_name
                          }
                        </strong>

                        <span>
                          {
                            order.customer_email
                          }
                        </span>

                      </div>


                      {/* EVENT */}

                      <div>

                        <strong>
                          {
                            order.event_title
                          }
                        </strong>

                        <span>

                          {
                            order.totalQuantity
                          }

                          {" "}

                          ticket
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
                            order.status ===
                            "USED"
                              ? "ticket-status used"
                              : order.status ===
                                "PENDING"
                                ? "ticket-status pending"
                                : "ticket-status valid"
                          }
                        >

                          {
                            order.status
                          }

                        </span>

                        <span>

                          {
                            order.tickets.length
                          }

                          {" "}

                          ticket
                          {order.tickets.length === 1
                            ? ""
                            : "s"}

                        </span>

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
