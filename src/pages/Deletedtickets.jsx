import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function DeletedTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchDeletedTickets();
  }, []);

  const fetchDeletedTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/tickets/deleted");
      
      if (!response.ok) {
        throw new Error("Failed to fetch deleted tickets");
      }
      
      const data = await response.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (ticketId) => {
    if (!confirm("Restore this ticket?")) return;
    
    try {
      setActionLoading(ticketId);
      const response = await fetch(`http://localhost:5000/api/tickets/${ticketId}/restore`, {
        method: "PUT"
      });
      
      if (!response.ok) {
        throw new Error("Failed to restore ticket");
      }
      
      await fetchDeletedTickets();
      alert("Ticket restored successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (ticketId) => {
    if (!confirm("⚠️ Permanently delete this ticket? This action cannot be undone!")) return;
    
    try {
      setActionLoading(ticketId);
      const response = await fetch(`http://localhost:5000/api/tickets/${ticketId}/permanent`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to permanently delete ticket");
      }
      
      await fetchDeletedTickets();
      alert("Ticket permanently deleted.");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ Permanently delete ALL deleted tickets? This cannot be undone!")) return;
    
    try {
      setLoading(true);
      
      for (const ticket of tickets) {
        await fetch(`http://localhost:5000/api/tickets/${ticket.ticket_id}/permanent`, {
          method: "DELETE"
        });
      }
      
      await fetchDeletedTickets();
      alert("All deleted tickets have been permanently removed.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-main">
          <div style={{ padding: "40px", textAlign: "center" }}>Loading deleted tickets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          Ticket<span>Hub</span>
          <small>ADMIN</small>
        </div>
        <nav className="admin-nav">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/events">Events</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/tickets">Tickets</Link>
          <Link to="/admin/deleted-tickets" className="active">🗑️ Deleted</Link>
          <Link to="/scanner">Scanner</Link>
        </nav>
        <Link to="/" className="admin-back">← Back to website</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="admin-label">TICKET MANAGEMENT</p>
            <h1>🗑️ Deleted Tickets</h1>
            <p>Tickets that have been soft-deleted. They can be restored or permanently deleted.</p>
          </div>
        </header>

        <section className="admin-section">
          {error && (
            <div className="admin-form-error">{error}</div>
          )}

          {tickets.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <button
                onClick={handleDeleteAll}
                style={{
                  background: "#dc3545",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                🗑️ Delete All Permanently
              </button>
            </div>
          )}

          {tickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
              <h3>🗑️ No deleted tickets</h3>
              <p>Tickets you delete from the Tickets page will appear here.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Event</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Deleted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td><strong>{ticket.ticket_id}</strong></td>
                      <td>{ticket.event_title}</td>
                      <td>
                        {ticket.customer_name}<br />
                        <small style={{ color: "#666" }}>{ticket.customer_email}</small>
                      </td>
                      <td>{ticket.ticket_type}</td>
                      <td>{ticket.quantity}</td>
                      <td>
                        <small>{new Date(ticket.deleted_at).toLocaleString()}</small>
                      </td>
                      <td>
                        <button
                          onClick={() => handleRestore(ticket.ticket_id)}
                          disabled={actionLoading === ticket.ticket_id}
                          style={{
                            marginRight: "8px",
                            padding: "5px 12px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          ↩️ Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(ticket.ticket_id)}
                          disabled={actionLoading === ticket.ticket_id}
                          style={{
                            padding: "5px 12px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}