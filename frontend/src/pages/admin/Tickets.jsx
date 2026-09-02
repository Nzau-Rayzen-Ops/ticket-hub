import {
  useEffect,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import jsPDF from "jspdf";

import QRCode from "qrcode";


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
        err.message ||
        "Failed to load tickets."
      );


    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    loadTickets();

  }, []);


  async function downloadTicketPDF(ticket) {

    try {

      const ticketId =
        ticket.ticket_id ||
        "TICKET";


      const customerName =
        ticket.customer_name ||
        "Customer";


      const eventTitle =
        ticket.event_title ||
        "Event";


      const ticketType =
        ticket.ticket_type ||
        "Standard";


      const quantity =
        Number(ticket.quantity || 1);


      const price =
        Number(ticket.price || 0);


      const paymentStatus =
        ticket.payment_status ||
        "PAID";


      const ticketStatus =
        ticket.ticket_status ||
        "VALID";
      /* =========================
         GET SECURE QR TOKEN
      ========================= */

      const qrResponse =
        await fetch(
          `/api/tickets/admin/qr/${encodeURIComponent(ticketId)}`,
          {
            method: "GET",
            credentials: "include"
          }
        );

      const qrData =
        await qrResponse.json();

      if (!qrResponse.ok) {
        throw new Error(
          qrData.message ||
          "Failed to generate QR code."
        );
      }

      const qrToken =
        qrData?.ticket?.qrToken ||
        "";


      const pdf =
        new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });


      /* =========================
         HEADER
      ========================= */

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(24);

      pdf.text(
        "TicketHub",
        20,
        25
      );


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(10);

      pdf.text(
        "OFFICIAL EVENT ENTRY TICKET",
        20,
        32
      );


      pdf.line(
        20,
        38,
        190,
        38
      );


      /* =========================
         EVENT
      ========================= */

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(18);

      pdf.text(
        eventTitle,
        20,
        52
      );


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(11);

      pdf.text(
        "Ticket ID:",
        20,
        65
      );


      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.text(
        ticketId,
        55,
        65
      );


      /* =========================
         CUSTOMER DETAILS
      ========================= */

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(12);

      pdf.text(
        "Customer Details",
        20,
        82
      );


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(11);

      pdf.text(
        `Name: ${customerName}`,
        20,
        91
      );


      pdf.text(
        `Email: ${ticket.customer_email || "N/A"}`,
        20,
        99
      );


      pdf.text(
        `Phone: ${ticket.customer_phone || "N/A"}`,
        20,
        107
      );


      /* =========================
         TICKET DETAILS
      ========================= */

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(12);

      pdf.text(
        "Ticket Details",
        20,
        123
      );


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(11);

      pdf.text(
        `Ticket Type: ${ticketType}`,
        20,
        132
      );


      pdf.text(
        `Quantity: ${quantity}`,
        20,
        140
      );


      pdf.text(
        `Price: KSh ${price.toLocaleString()}`,
        20,
        148
      );


      pdf.text(
        `Total: KSh ${(price * quantity).toLocaleString()}`,
        20,
        156
      );


      pdf.text(
        `Payment Status: ${paymentStatus}`,
        20,
        164
      );


      pdf.text(
        `Ticket Status: ${ticketStatus}`,
        20,
        172
      );


      /* =========================
         QR CODE
      ========================= */

      if (qrToken) {

        const qrData =
          JSON.stringify({
            type: "TICKETHUB_ENTRY",
            token: qrToken
          });


        const qrImage =
          await QRCode.toDataURL(
            qrData,
            {
              width: 500,
              margin: 2,
              errorCorrectionLevel: "H"
            }
          );


        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(14);

        pdf.text(
          "ENTRY QR CODE",
          20,
          190
        );


        pdf.addImage(
          qrImage,
          "PNG",
          20,
          197,
          65,
          65
        );


      } else {

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(10);

        pdf.text(
          "QR code unavailable for this ticket.",
          20,
          195
        );

      }


      /* =========================
         ENTRY INSTRUCTIONS
      ========================= */

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(13);

      pdf.text(
        "Entry Instructions",
        105,
        198
      );


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(10);

      pdf.text(
        "1. Present this ticket at the entrance.",
        105,
        208
      );


      pdf.text(
        "2. Present your QR code for scanning.",
        105,
        216
      );


      pdf.text(
        "3. You may also be asked for your",
        105,
        224
      );


      pdf.text(
        "6-digit verification code.",
        105,
        232
      );


      /* =========================
         ARRIVAL
      ========================= */

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.text(
        "Gala Arrival:",
        105,
        245
      );


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.text(
        "5:00 PM - 5:45 PM",
        105,
        253
      );


      /* =========================
         FOOTER
      ========================= */

      pdf.line(
        20,
        270,
        190,
        270
      );


      pdf.setFontSize(9);

      pdf.text(
        "Keep this ticket and your verification code private.",
        20,
        280
      );


      pdf.text(
        "TicketHub - Official Event Entry Ticket",
        20,
        287
      );


      pdf.save(
        `${ticketId}.pdf`
      );


    } catch (err) {

      console.error(
        "PDF download error:",
        err
      );


      alert(
        "Could not generate the ticket PDF."
      );

    }

  }


  function openGmail(ticket) {

    const email =
      ticket.customer_email ||
      "";


    const ticketId =
      ticket.ticket_id ||
      "Ticket";


    const eventTitle =
      ticket.event_title ||
      "your event";


    const subject =
      `Ticket ${ticketId} - ${eventTitle}`;


    const body =
      `Hello ${ticket.customer_name || "there"},

Please find your TicketHub ticket details below.

Ticket ID: ${ticketId}
Event: ${eventTitle}
Ticket Type: ${ticket.ticket_type || "Standard"}
Quantity: ${ticket.quantity || 1}
Payment Status: ${ticket.payment_status || "PAID"}

Please attach the downloaded PDF ticket to this email before sending.

Please present your ticket QR code at the entrance.

Thank you,
TicketHub`;


    const gmailUrl =
      "https://mail.google.com/mail/?view=cm" +
      "&fs=1" +
      `&to=${encodeURIComponent(email)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;


    window.open(
      gmailUrl,
      "_blank",
      "noopener,noreferrer"
    );

  }


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
            credentials: "include"
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
        err.message ||
        "Failed to delete ticket."
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
            ðŸ—‘ Deleted
          </Link>


          <Link to="/scanner">
            Scanner
          </Link>

        </nav>


        <Link
          to="/"
          className="admin-back"
        >
          â† Back to website
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
              View, download and manage
              purchased tickets.
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
                ðŸŽŸ
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
                        textAlign: "left",
                        padding: "12px"
                      }}
                    >
                      Ticket
                    </th>


                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px"
                      }}
                    >
                      Customer
                    </th>


                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px"
                      }}
                    >
                      Event
                    </th>


                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px"
                      }}
                    >
                      Type
                    </th>


                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px"
                      }}
                    >
                      Quantity
                    </th>


                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px"
                      }}
                    >
                      Status
                    </th>


                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px"
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
                            padding: "12px"
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
                            padding: "12px"
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
                            padding: "12px"
                          }}
                        >

                          {
                            ticket.event_title
                          }

                        </td>


                        <td
                          style={{
                            padding: "12px"
                          }}
                        >

                          {
                            ticket.ticket_type
                          }

                        </td>


                        <td
                          style={{
                            padding: "12px"
                          }}
                        >

                          {
                            ticket.quantity
                          }

                        </td>


                        <td
                          style={{
                            padding: "12px"
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
                            padding: "12px",
                            whiteSpace:
                              "nowrap"
                          }}
                        >

                          <button
                            type="button"
                            className="admin-primary-button"
                            style={{
                              marginRight:
                                "8px"
                            }}
                            onClick={() =>
                              downloadTicketPDF(
                                ticket
                              )
                            }
                          >
                            ðŸ“„ Download PDF
                          </button>


                          <button
                            type="button"
                            className="admin-secondary-button"
                            style={{
                              marginRight:
                                "8px"
                            }}
                            onClick={() =>
                              openGmail(
                                ticket
                              )
                            }
                          >
                            âœ‰ Open Gmail
                          </button>


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

                            {
                              actionLoading ===
                              ticket.ticket_id
                                ? "Deleting..."
                                : "Delete"
                            }

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
