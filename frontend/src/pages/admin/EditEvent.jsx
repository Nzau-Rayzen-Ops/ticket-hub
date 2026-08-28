import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    price: "",
    total_tickets: "",
    available_tickets: "",
    image: "",
    single_price: "",
    couple_price: "",
    group3_price: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =========================
     LOAD EVENT
  ========================= */

  useEffect(() => {
    let mounted = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/events/${id}`,
          {
            method: "GET",
            credentials: "include"
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to load event."
          );
        }

        if (!mounted) {
          return;
        }

        setForm({
          title: data.title || "",
          description: data.description || "",
          date: data.date || "",
          time: data.time || "",
          venue: data.venue || "",
          price: data.price ?? "",
          total_tickets:
            data.total_tickets ?? "",
          available_tickets:
            data.available_tickets ?? "",
          image: data.image || "",

          single_price:
            data.single_price ?? "",

          couple_price:
            data.couple_price ?? "",

          group3_price:
            data.group3_price ?? ""
        });

      } catch (err) {
        console.error(
          "Load event error:",
          err
        );

        if (mounted) {
          setError(
            err.message ||
            "Failed to load event."
          );
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      mounted = false;
    };
  }, [id]);


  /* =========================
     HANDLE INPUT
  ========================= */

  function handleChange(event) {
    const {
      name,
      value
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }


  /* =========================
     SAVE EVENT
  ========================= */

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          /*
            IMPORTANT:

            This sends the admin_token cookie
            created during admin login.

            Without this, the backend's
            requireAdmin middleware rejects
            the update.
          */
          credentials: "include",

          body: JSON.stringify({
            title: form.title,
            description: form.description,
            date: form.date,
            time: form.time,
            venue: form.venue,

            price:
              Number(form.price),

            total_tickets:
              Number(form.total_tickets),

            available_tickets:
              Number(
                form.available_tickets
              ),

            image: form.image,

            single_price:
              form.single_price === ""
                ? Number(form.price)
                : Number(
                    form.single_price
                  ),

            couple_price:
              form.couple_price === ""
                ? null
                : Number(
                    form.couple_price
                  ),

            group3_price:
              form.group3_price === ""
                ? null
                : Number(
                    form.group3_price
                  )
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to update event."
        );
      }

      /*
        Successfully updated.
      */

      navigate(
        "/admin/events",
        {
          replace: true
        }
      );

    } catch (err) {
      console.error(
        "Update event error:",
        err
      );

      setError(
        err.message ||
        "Failed to update event."
      );

    } finally {
      setSaving(false);
    }
  }


  /* =========================
     LOADING
  ========================= */

  if (loading) {
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
            ? Back to website
          </Link>

        </aside>

        <main className="admin-main">

          <section className="admin-section">

            <div className="admin-empty">

              <h3>
                Loading event...
              </h3>

              <p>
                Please wait while the event
                information is loaded.
              </p>

            </div>

          </section>

        </main>

      </div>
    );
  }


  /* =========================
     ERROR WHILE LOADING
  ========================= */

  if (error && !form.title) {
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
            ? Back to website
          </Link>

        </aside>

        <main className="admin-main">

          <section className="admin-section">

            <div className="admin-empty">

              <h3>
                Something went wrong
              </h3>

              <p>
                {error}
              </p>

              <Link
                to="/admin/events"
                className="admin-secondary-button"
              >
                Back to Events
              </Link>

            </div>

          </section>

        </main>

      </div>
    );
  }


  /* =========================
     EDIT PAGE
  ========================= */

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
          ? Back to website
        </Link>

      </aside>


      {/* =========================
          MAIN
      ========================= */}

      <main className="admin-main">

        <header className="admin-header">

          <div>

            <p className="admin-label">
              EVENT MANAGEMENT
            </p>

            <h1>
              Edit Event
            </h1>

            <p>
              Update the details of your event.
            </p>

          </div>

        </header>


        <section className="admin-section">

          <form
            onSubmit={handleSubmit}
            className="admin-event-form"
          >

            <div className="admin-form-grid">

              {/* =========================
                  TITLE
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="title">
                  Event Title
                </label>

                <input
                  id="title"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                />

              </div>


              {/* =========================
                  VENUE
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="venue">
                  Venue
                </label>

                <input
                  id="venue"
                  type="text"
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  required
                />

              </div>


              {/* =========================
                  DATE
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="date">
                  Date
                </label>

                <input
                  id="date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />

              </div>


              {/* =========================
                  TIME
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="time">
                  Time
                </label>

                <input
                  id="time"
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  required
                />

              </div>


              {/* =========================
                  BASE PRICE
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="price">
                  Base Ticket Price (KSh)
                </label>

                <input
                  id="price"
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  required
                />

              </div>


              {/* =========================
                  TOTAL TICKETS
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="total_tickets">
                  Total Tickets
                </label>

                <input
                  id="total_tickets"
                  type="number"
                  name="total_tickets"
                  value={form.total_tickets}
                  onChange={handleChange}
                  min="1"
                  required
                />

              </div>


              {/* =========================
                  AVAILABLE TICKETS
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="available_tickets">
                  Available Tickets
                </label>

                <input
                  id="available_tickets"
                  type="number"
                  name="available_tickets"
                  value={
                    form.available_tickets
                  }
                  onChange={handleChange}
                  min="0"
                  required
                />

              </div>


              {/* =========================
                  IMAGE
              ========================= */}

              <div className="admin-form-group">

                <label htmlFor="image">
                  Image URL
                </label>

                <input
                  id="image"
                  type="text"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                />

              </div>


              {/* =========================
                  TICKET TYPES
              ========================= */}

              <div
                className="admin-form-group admin-form-full"
              >

                <h3
                  style={{
                    marginTop: "20px",
                    marginBottom: "10px"
                  }}
                >
                  Ticket Types
                </h3>

                <p
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "15px"
                  }}
                >
                  Set individual prices for
                  different ticket types.
                </p>

              </div>


              {/* SINGLE */}

              <div className="admin-form-group">

                <label htmlFor="single_price">
                  Single Ticket Price (KSh)
                </label>

                <input
                  id="single_price"
                  type="number"
                  name="single_price"
                  value={
                    form.single_price
                  }
                  onChange={handleChange}
                  min="0"
                  placeholder="Uses base price if blank"
                />

              </div>


              {/* COUPLE */}

              <div className="admin-form-group">

                <label htmlFor="couple_price">
                  Couple Ticket � 2 People (KSh)
                </label>

                <input
                  id="couple_price"
                  type="number"
                  name="couple_price"
                  value={
                    form.couple_price
                  }
                  onChange={handleChange}
                  min="0"
                  placeholder="Optional"
                />

              </div>


              {/* GROUP 3 */}

              <div className="admin-form-group">

                <label htmlFor="group3_price">
                  Group of 3 Ticket (KSh)
                </label>

                <input
                  id="group3_price"
                  type="number"
                  name="group3_price"
                  value={
                    form.group3_price
                  }
                  onChange={handleChange}
                  min="0"
                  placeholder="Optional"
                />

              </div>


              {/* =========================
                  DESCRIPTION
              ========================= */}

              <div
                className="admin-form-group admin-form-full"
              >

                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  rows="5"
                />

              </div>

            </div>


            {/* =========================
                ERROR
            ========================= */}

            {error && (

              <div
                className="admin-form-error"
                style={{
                  marginTop: "20px"
                }}
              >
                {error}
              </div>

            )}


            {/* =========================
                ACTIONS
            ========================= */}

            <div
              className="admin-form-actions"
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "25px"
              }}
            >

              <button
                type="submit"
                className="admin-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <Link
                to="/admin/events"
                className="admin-secondary-button"
              >
                Cancel
              </Link>

            </div>

          </form>

        </section>

      </main>

    </div>
  );
}
