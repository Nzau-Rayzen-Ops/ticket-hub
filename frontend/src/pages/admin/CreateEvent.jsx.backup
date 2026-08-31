import {
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";


export default function CreateEvent() {

  const navigate =
    useNavigate();


  const [
    form,
    setForm
  ] = useState({

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
    group3_price: ""

  });


  const [
    saving,
    setSaving
  ] = useState(false);


  const [
    error,
    setError
  ] = useState("");


  function handleChange(event) {

    const {
      name,
      value
    } = event.target;


    setForm(
      (previous) => ({

        ...previous,

        [name]:
          value

      })
    );

  }


  async function handleSubmit(event) {

    event.preventDefault();

    setError("");


    if (
      !form.title ||
      !form.date ||
      !form.time ||
      !form.venue ||
      !form.price ||
      !form.total_tickets
    ) {

      setError(
        "Please fill in all required fields."
      );

      return;

    }


    try {

      setSaving(true);


      const response =
        await fetch(
          "/api/events",
          {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials:
              "include",

            body:
              JSON.stringify({

                title:
                  form.title,

                description:
                  form.description,

                date:
                  form.date,

                time:
                  form.time,

                venue:
                  form.venue,

                price:
                  Number(form.price),

                total_tickets:
                  Number(
                    form.total_tickets
                  ),

                image:
                  form.image,

                single_price:
                  form.single_price
                    ? Number(
                        form.single_price
                      )
                    : Number(
                        form.price
                      ),

                couple_price:
                  form.couple_price
                    ? Number(
                        form.couple_price
                      )
                    : null,

                group3_price:
                  form.group3_price
                    ? Number(
                        form.group3_price
                      )
                    : null,

                early_bird_enabled:
                  0,

                early_bird_single_price:
                  null,

                early_bird_expiry:
                  null

              })

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


      navigate(
        "/admin/events"
      );


    } catch (error) {

      console.error(
        "Create event error:",
        error
      );

      setError(
        error.message
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
          ? Back to website
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
              Add a new event to your
              ticketing system.
            </p>

          </div>

        </header>


        <section className="admin-section">

          {error && (

            <div className="admin-form-error">
              {error}
            </div>

          )}


          <form
            onSubmit={handleSubmit}
            className="admin-event-form"
          >

            <div className="admin-form-grid">


              <div className="admin-form-group admin-form-full">

                <label htmlFor="title">
                  Event Title *
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Nairobi Music Festival"
                  required
                />

              </div>


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
                  onChange={
                    handleChange
                  }
                  placeholder="Describe your event..."
                  rows="5"
                />

              </div>


              <div className="admin-form-group">

                <label htmlFor="date">
                  Date *
                </label>

                <input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              <div className="admin-form-group">

                <label htmlFor="time">
                  Time *
                </label>

                <input
                  id="time"
                  name="time"
                  type="time"
                  value={form.time}
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>


              <div className="admin-form-group admin-form-full">

                <label htmlFor="venue">
                  Venue *
                </label>

                <input
                  id="venue"
                  name="venue"
                  type="text"
                  value={form.venue}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Uhuru Gardens"
                  required
                />

              </div>


              <div className="admin-form-group">

                <label htmlFor="price">
                  Ticket Price (KSh) *
                </label>

                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={
                    handleChange
                  }
                  placeholder="1000"
                  required
                />

              </div>


              <div className="admin-form-group">

                <label htmlFor="total_tickets">
                  Total Tickets *
                </label>

                <input
                  id="total_tickets"
                  name="total_tickets"
                  type="number"
                  min="1"
                  value={
                    form.total_tickets
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="100"
                  required
                />

              </div>


              <div className="admin-form-group admin-form-full">

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
                  Leave blank to use
                  the base price.
                </p>

              </div>


              <div className="admin-form-group">

                <label htmlFor="single_price">
                  Single Ticket Price (KSh)
                </label>

                <input
                  id="single_price"
                  name="single_price"
                  type="number"
                  min="0"
                  value={
                    form.single_price
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Leave blank for base price"
                />

              </div>


              <div className="admin-form-group">

                <label htmlFor="couple_price">
                  Couple Ticket (2 People) KSh
                </label>

                <input
                  id="couple_price"
                  name="couple_price"
                  type="number"
                  min="0"
                  value={
                    form.couple_price
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 1800"
                />

              </div>


              <div className="admin-form-group">

                <label htmlFor="group3_price">
                  Group of 3 Ticket KSh
                </label>

                <input
                  id="group3_price"
                  name="group3_price"
                  type="number"
                  min="0"
                  value={
                    form.group3_price
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 2500"
                />

              </div>


              <div className="admin-form-group admin-form-full">

                <label htmlFor="image">
                  Image URL
                </label>

                <input
                  id="image"
                  name="image"
                  type="url"
                  value={form.image}
                  onChange={
                    handleChange
                  }
                  placeholder="https://example.com/event-image.jpg"
                />

              </div>


            </div>


            <div className="admin-form-actions">

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
