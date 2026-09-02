import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import "./Admin.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const initialForm = {
  title: "",
  description: "",
  date: "",
  time: "",
  venue: "",
  price: "",
  capacity: "",
  total_tickets: "",
  available_tickets: "",
  image: "",
  single_price: "",
  couple_price: "",
  group3_price: "",
  early_bird_enabled: false,
  early_bird_single_price: "",
  early_bird_expiry: "",
};

export default function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState(initialForm);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handleEarlyBirdChange(event) {
    const enabled =
      event.target.checked;

    setForm((current) => ({
      ...current,
      early_bird_enabled:
        enabled,

      early_bird_single_price:
        enabled
          ? current.early_bird_single_price
          : "",

      early_bird_expiry:
        enabled
          ? current.early_bird_expiry
          : "",
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.title.trim()) {
        throw new Error(
          "Event title is required."
        );
      }

      if (!form.venue.trim()) {
        throw new Error(
          "Venue is required."
        );
      }

      if (!form.date) {
        throw new Error(
          "Event date is required."
        );
      }

      if (!form.time) {
        throw new Error(
          "Event time is required."
        );
      }

      if (
        form.price === "" ||
        !Number.isFinite(
          Number(form.price)
        ) ||
        Number(form.price) < 0
      ) {
        throw new Error(
          "Please enter a valid ticket price."
        );
      }

      if (
        form.total_tickets === "" ||
        !Number.isFinite(
          Number(form.total_tickets)
        ) ||
        Number(form.total_tickets) < 1
      ) {
        throw new Error(
          "Total tickets must be at least 1."
        );
      }

      const totalTickets =
        Number(form.total_tickets);

      const availableTickets =
        form.available_tickets === ""
          ? totalTickets
          : Number(
              form.available_tickets
            );

      if (
        !Number.isFinite(
          availableTickets
        ) ||
        availableTickets < 0
      ) {
        throw new Error(
          "Available tickets cannot be negative."
        );
      }

      if (
        availableTickets >
        totalTickets
      ) {
        throw new Error(
          "Available tickets cannot exceed total tickets."
        );
      }

      if (form.early_bird_enabled) {
        const earlyBirdPrice =
          Number(
            form.early_bird_single_price
          );

        if (
          form.early_bird_single_price ===
            "" ||
          !Number.isFinite(
            earlyBirdPrice
          ) ||
          earlyBirdPrice <= 0
        ) {
          throw new Error(
            "Please enter a valid Early Bird price."
          );
        }

        if (!form.early_bird_expiry) {
          throw new Error(
            "Early Bird expiry date is required."
          );
        }
      }

      const payload = {
        title:
          form.title.trim(),

        description:
          form.description.trim(),

        date:
          form.date,

        time:
          form.time,

        venue:
          form.venue.trim(),

        price:
          Number(form.price),

        capacity:
          form.capacity === ""
            ? totalTickets
            : Number(
                form.capacity
              ),

        total_tickets:
          totalTickets,

        available_tickets:
          availableTickets,

        image:
          form.image.trim(),

        single_price:
          form.single_price === ""
            ? null
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
              ),

        early_bird_enabled:
          Boolean(
            form.early_bird_enabled
          ),

        early_bird_single_price:
          form.early_bird_enabled
            ? Number(
                form.early_bird_single_price
              )
            : null,

        early_bird_expiry:
          form.early_bird_enabled
            ? form.early_bird_expiry
            : null,
      };

      const response =
        await fetch(
          `${API_BASE}/api/events`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create event."
        );
      }

      setSuccess(
        "Event created successfully."
      );

      setTimeout(() => {
        navigate(
          "/admin/events"
        );
      }, 1000);
    } catch (err) {
      console.error(
        "Create event error:",
        err
      );

      setError(
        err.message ||
          "Failed to create event."
      );
    } finally {
      setSaving(false);
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
              Create Event
            </h1>

            <p>
              Create a new event and
              start selling tickets.
            </p>

          </div>

        </header>

        <section className="admin-section">

          <form
            onSubmit={handleSubmit}
            className="admin-event-form"
          >

            <div className="admin-form-grid">

              <FormInput
                label="Event Title"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Venue"
                name="venue"
                value={form.venue}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Date"
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Time"
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Base Ticket Price (KSh)"
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                min="0"
                required
              />

              <FormInput
                label="Total Tickets"
                type="number"
                name="total_tickets"
                value={
                  form.total_tickets
                }
                onChange={handleChange}
                min="1"
                required
              />

              <FormInput
                label="Available Tickets"
                type="number"
                name="available_tickets"
                value={
                  form.available_tickets
                }
                onChange={handleChange}
                min="0"
                placeholder="Defaults to total tickets"
              />

              <FormInput
                label="Capacity"
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                min="1"
                placeholder="Defaults to total tickets"
              />

              <FormInput
                label="Image URL"
                name="image"
                value={form.image}
                onChange={handleChange}
              />

              {/* TICKET TYPES */}

              <div className="admin-form-group admin-form-full">

                <h3>
                  Ticket Types
                </h3>

                <p>
                  Set individual prices
                  for different ticket
                  types.
                </p>

              </div>

              <FormInput
                label="Single Ticket Price (KSh)"
                type="number"
                name="single_price"
                value={
                  form.single_price
                }
                onChange={handleChange}
                min="0"
              />

              <FormInput
                label="Couple Ticket - 2 People (KSh)"
                type="number"
                name="couple_price"
                value={
                  form.couple_price
                }
                onChange={handleChange}
                min="0"
              />

              <FormInput
                label="Group of 3 Ticket (KSh)"
                type="number"
                name="group3_price"
                value={
                  form.group3_price
                }
                onChange={handleChange}
                min="0"
              />

              {/* EARLY BIRD */}

              <div className="admin-form-group admin-form-full">

                <h3>
                  Early Bird
                </h3>

                <p>
                  Offer a discounted
                  price for single
                  tickets until a
                  specific date.
                </p>

              </div>

              <div className="admin-form-group">

                <label
                  htmlFor="early_bird_enabled"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >

                  <input
                    id="early_bird_enabled"
                    type="checkbox"
                    checked={
                      form.early_bird_enabled
                    }
                    onChange={
                      handleEarlyBirdChange
                    }
                  />

                  Enable Early Bird

                </label>

              </div>

              <FormInput
                label="Early Bird Single Price (KSh)"
                type="number"
                name="early_bird_single_price"
                value={
                  form.early_bird_single_price
                }
                onChange={handleChange}
                min="1"
                step="0.01"
                disabled={
                  !form.early_bird_enabled
                }
              />

              <FormInput
                label="Early Bird Expiry Date"
                type="date"
                name="early_bird_expiry"
                value={
                  form.early_bird_expiry
                }
                onChange={handleChange}
                disabled={
                  !form.early_bird_enabled
                }
              />

              {/* DESCRIPTION */}

              <div className="admin-form-group admin-form-full">

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

            {error && (
              <div
                className="admin-form-error"
                style={{
                  marginTop: "20px",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="admin-form-success"
                style={{
                  marginTop: "20px",
                }}
              >
                {success}
              </div>
            )}

            <div
              className="admin-form-actions"
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "25px",
              }}
            >

              <button
                type="submit"
                className="admin-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create Event"}
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

function FormInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  min,
  step,
  required,
  disabled,
  placeholder,
}) {
  return (
    <div className="admin-form-group">

      <label htmlFor={name}>
        {label}
      </label>

      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />

    </div>
  );
}