import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    price: "",
    total_tickets: "",
    image: "",
    single_price: "",
    couple_price: "",
    group3_price: "",
    early_bird_enabled: false,
    early_bird_single_price: "",
    early_bird_expiry: ""
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Event title is required.");
      return;
    }

    if (!form.date) {
      setError("Event date is required.");
      return;
    }

    if (!form.time) {
      setError("Event time is required.");
      return;
    }

    if (!form.venue.trim()) {
      setError("Venue is required.");
      return;
    }

    if (!form.total_tickets || Number(form.total_tickets) <= 0) {
      setError("Total tickets must be greater than 0.");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      setError("Standard ticket price must be valid.");
      return;
    }

    if (
      form.single_price !== "" &&
      Number(form.single_price) < 0
    ) {
      setError("Single ticket price must be valid.");
      return;
    }

    if (
      form.couple_price !== "" &&
      Number(form.couple_price) < 0
    ) {
      setError("Couple ticket price must be valid.");
      return;
    }

    if (
      form.group3_price !== "" &&
      Number(form.group3_price) < 0
    ) {
      setError("Group of 3 ticket price must be valid.");
      return;
    }

    /* =========================
       EARLY BIRD VALIDATION
    ========================= */

    if (form.early_bird_enabled) {
      if (
        form.early_bird_single_price === "" ||
        Number(form.early_bird_single_price) < 0
      ) {
        setError("Please enter a valid Early Bird ticket price.");
        return;
      }

      if (!form.early_bird_expiry) {
        setError("Please select when Early Bird sales should end.");
        return;
      }

      const expiry = new Date(
        `${form.early_bird_expiry}T23:59:59`
      );

      const eventDate = new Date(
        `${form.date}T23:59:59`
      );

      if (expiry > eventDate) {
        setError(
          "Early Bird expiry cannot be after the event date."
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch("/api/events", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        credentials: "include",

        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          date: form.date,
          time: form.time,
          venue: form.venue.trim(),

          price: Number(form.price),

          total_tickets: Number(form.total_tickets),

          image: form.image.trim(),

          single_price:
            form.single_price === ""
              ? Number(form.price)
              : Number(form.single_price),

          couple_price:
            form.couple_price === ""
              ? null
              : Number(form.couple_price),

          group3_price:
            form.group3_price === ""
              ? null
              : Number(form.group3_price),

          early_bird_enabled:
            form.early_bird_enabled,

          early_bird_single_price:
            form.early_bird_enabled
              ? Number(form.early_bird_single_price)
              : null,

          early_bird_expiry:
            form.early_bird_enabled
              ? form.early_bird_expiry
              : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create event."
        );
      }

      navigate("/admin/events");

    } catch (error) {
      console.error(
        "Create event error:",
        error
      );

      setError(
        error.message ||
        "Failed to create event."
      );

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">

      <div className="admin-card">

        <h1>Create Event</h1>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* =========================
              BASIC EVENT INFORMATION
          ========================= */}

          <div>
            <label>Event Title</label>

            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Event title"
            />
          </div>

          <div>
            <label>Description</label>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the event"
              rows="5"
            />
          </div>

          <div>
            <label>Event Date</label>

            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Event Time</label>

            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Venue</label>

            <input
              type="text"
              name="venue"
              value={form.venue}
              onChange={handleChange}
              placeholder="Event venue"
            />
          </div>

          <div>
            <label>Event Image URL</label>

            <input
              type="text"
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div>
            <label>Total Tickets</label>

            <input
              type="number"
              min="1"
              name="total_tickets"
              value={form.total_tickets}
              onChange={handleChange}
              placeholder="Number of tickets"
            />
          </div>

          {/* =========================
              TICKET PRICING
          ========================= */}

          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "10px"
            }}
          >

            <h2>Ticket Pricing</h2>

            <div>
              <label>Standard Ticket Price</label>

              <input
                type="number"
                min="0"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="KES"
              />
            </div>

            <div>
              <label>Single Ticket Price</label>

              <input
                type="number"
                min="0"
                name="single_price"
                value={form.single_price}
                onChange={handleChange}
                placeholder="Leave empty to use standard price"
              />
            </div>

            <div>
              <label>Couple Ticket Price</label>

              <input
                type="number"
                min="0"
                name="couple_price"
                value={form.couple_price}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>

            <div>
              <label>Group of 3 Price</label>

              <input
                type="number"
                min="0"
                name="group3_price"
                value={form.group3_price}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>

          </div>

          {/* =========================
              EARLY BIRD TICKETS
          ========================= */}

          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "10px"
            }}
          >

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer"
              }}
            >

              <input
                type="checkbox"
                name="early_bird_enabled"
                checked={form.early_bird_enabled}
                onChange={handleChange}
              />

              <strong>
                Enable Early Bird Tickets
              </strong>

            </label>

            {form.early_bird_enabled && (
              <div
                style={{
                  marginTop: "18px"
                }}
              >

                <div>
                  <label>
                    Early Bird Ticket Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="early_bird_single_price"
                    value={form.early_bird_single_price}
                    onChange={handleChange}
                    placeholder="KES"
                  />
                </div>

                <div
                  style={{
                    marginTop: "15px"
                  }}
                >

                  <label>
                    Early Bird Ends On
                  </label>

                  <input
                    type="date"
                    name="early_bird_expiry"
                    value={form.early_bird_expiry}
                    onChange={handleChange}
                    min={undefined}
                    max={form.date || undefined}
                  />

                </div>

                <p
                  style={{
                    marginTop: "12px",
                    color: "#666",
                    lineHeight: "1.5"
                  }}
                >
                  Early Bird pricing applies only until
                  the selected date. After this date,
                  normal ticket pricing will automatically
                  apply.
                </p>

              </div>
            )}

          </div>

          {/* =========================
              SUBMIT
          ========================= */}

          <div
            style={{
              marginTop: "25px"
            }}
          >

            <button
              type="submit"
              disabled={saving}
              className="ticket-button"
            >
              {saving
                ? "Creating Event..."
                : "Create Event"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}
