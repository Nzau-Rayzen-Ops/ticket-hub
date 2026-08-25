const db = require("../database");

/* =========================
   GET ALL EVENTS
========================= */

function getEvents(req, res) {
  try {
    const events = db
      .prepare(
        `
        SELECT *
        FROM events
        WHERE status != 'ARCHIVED'
        ORDER BY date ASC, time ASC
        `
      )
      .all();

    res.json(events);
  } catch (error) {
    console.error("Get events error:", error);

    res.status(500).json({
      message: "Failed to load events."
    });
  }
}


/* =========================
   GET SINGLE EVENT
========================= */

function getEvent(req, res) {
  try {
    const event = db
      .prepare(
        `
        SELECT *
        FROM events
        WHERE id = ?
        `
      )
      .get(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    res.json(event);
  } catch (error) {
    console.error("Get event error:", error);

    res.status(500).json({
      message: "Failed to load event."
    });
  }
}


/* =========================
   CREATE EVENT
========================= */

function createEvent(req, res) {
  try {
    const {
      title,
      description,
      date,
      time,
      venue,
      price,
      total_tickets,
      image,

      single_price,
      couple_price,
      group3_price,

      early_bird_enabled,
      early_bird_single_price,
      early_bird_expiry
    } = req.body;

    /* =========================
       REQUIRED FIELDS
    ========================= */

    if (
      !title ||
      !date ||
      !time ||
      !venue ||
      price === undefined ||
      price === "" ||
      total_tickets === undefined ||
      total_tickets === ""
    ) {
      return res.status(400).json({
        message:
          "Title, date, time, venue, price and total tickets are required."
      });
    }

    /* =========================
       NUMBERS
    ========================= */

    const eventPrice = Number(price);
    const totalTickets = Number(total_tickets);

    if (
      !Number.isFinite(eventPrice) ||
      !Number.isFinite(totalTickets)
    ) {
      return res.status(400).json({
        message:
          "Price and total tickets must be valid numbers."
      });
    }

    if (eventPrice < 0) {
      return res.status(400).json({
        message:
          "Event price cannot be negative."
      });
    }

    if (totalTickets <= 0) {
      return res.status(400).json({
        message:
          "Total tickets must be greater than zero."
      });
    }

    /* =========================
       TICKET TYPE PRICES
    ========================= */

    const singlePrice =
      single_price === undefined ||
      single_price === ""
        ? eventPrice
        : Number(single_price);

    const couplePrice =
      couple_price === undefined ||
      couple_price === ""
        ? null
        : Number(couple_price);

    const group3Price =
      group3_price === undefined ||
      group3_price === ""
        ? null
        : Number(group3_price);

    if (
      !Number.isFinite(singlePrice) ||
      singlePrice < 0
    ) {
      return res.status(400).json({
        message:
          "Single ticket price must be valid."
      });
    }

    if (
      couplePrice !== null &&
      (
        !Number.isFinite(couplePrice) ||
        couplePrice < 0
      )
    ) {
      return res.status(400).json({
        message:
          "Couple ticket price must be valid."
      });
    }

    if (
      group3Price !== null &&
      (
        !Number.isFinite(group3Price) ||
        group3Price < 0
      )
    ) {
      return res.status(400).json({
        message:
          "Group of 3 ticket price must be valid."
      });
    }

    /* =========================
       EARLY BIRD
    ========================= */

    const earlyBirdEnabled =
      early_bird_enabled === true ||
      early_bird_enabled === 1 ||
      early_bird_enabled === "1";

    let earlyBirdPrice = null;
    let earlyBirdExpiry = null;

    if (earlyBirdEnabled) {
      if (
        early_bird_single_price === undefined ||
        early_bird_single_price === ""
      ) {
        return res.status(400).json({
          message:
            "Early Bird requires a single ticket price."
        });
      }

      earlyBirdPrice =
        Number(early_bird_single_price);

      earlyBirdExpiry =
        early_bird_expiry || null;

      if (
        !Number.isFinite(earlyBirdPrice) ||
        earlyBirdPrice < 0
      ) {
        return res.status(400).json({
          message:
            "Early Bird price must be valid."
        });
      }

      if (!earlyBirdExpiry) {
        return res.status(400).json({
          message:
            "Early Bird requires an expiry date/time."
        });
      }
    }

    /* =========================
       CREATE EVENT
    ========================= */

    const result = db
      .prepare(
        `
        INSERT INTO events (
          title,
          description,
          date,
          time,
          venue,
          price,
          capacity,
          total_tickets,
          available_tickets,
          image,
          single_price,
          couple_price,
          group3_price,
          early_bird_enabled,
          early_bird_single_price,
          early_bird_expiry
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
        `
      )
      .run(
        title,
        description || "",
        date,
        time,
        venue,
        eventPrice,
        totalTickets,
        totalTickets,
        totalTickets,
        image || "",

        singlePrice,
        couplePrice,
        group3Price,

        earlyBirdEnabled ? 1 : 0,
        earlyBirdPrice,
        earlyBirdExpiry
      );

    const event = db
      .prepare(
        `
        SELECT *
        FROM events
        WHERE id = ?
        `
      )
      .get(result.lastInsertRowid);

    return res.status(201).json({
      message:
        "Event created successfully.",
      event
    });

  } catch (error) {
    console.error(
      "Create event error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to create event."
    });
  }
}


/* =========================
   UPDATE EVENT
========================= */

function updateEvent(req, res) {
  try {
    const eventId = req.params.id;

    /* =========================
       GET EXISTING EVENT
    ========================= */

    const existingEvent = db
      .prepare(
        `
        SELECT *
        FROM events
        WHERE id = ?
        `
      )
      .get(eventId);

    if (!existingEvent) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    const {
      title,
      description,
      date,
      time,
      venue,
      price,
      total_tickets,
      available_tickets,
      image,

      single_price,
      couple_price,
      group3_price,

      early_bird_enabled,
      early_bird_single_price,
      early_bird_expiry
    } = req.body;


    /* =========================
       BASIC VALUES
    ========================= */

    const updatedTitle =
      title === undefined
        ? existingEvent.title
        : String(title).trim();

    const updatedDescription =
      description === undefined
        ? existingEvent.description || ""
        : String(description);

    const updatedDate =
      date === undefined
        ? existingEvent.date
        : date;

    const updatedTime =
      time === undefined
        ? existingEvent.time
        : time;

    const updatedVenue =
      venue === undefined
        ? existingEvent.venue
        : String(venue).trim();

    const updatedImage =
      image === undefined
        ? existingEvent.image || ""
        : image;


    /* =========================
       PRICE
    ========================= */

    const updatedPrice =
      price === undefined ||
      price === ""
        ? Number(existingEvent.price)
        : Number(price);


    /* =========================
       TOTAL TICKETS
    ========================= */

    const updatedTotalTickets =
      total_tickets === undefined ||
      total_tickets === ""
        ? Number(existingEvent.total_tickets)
        : Number(total_tickets);


    /* =========================
       AVAILABLE TICKETS
    ========================= */

    const updatedAvailableTickets =
      available_tickets === undefined ||
      available_tickets === ""
        ? Number(existingEvent.available_tickets)
        : Number(available_tickets);


    /* =========================
       VALIDATE MAIN NUMBERS
    ========================= */

    if (
      !Number.isFinite(updatedPrice) ||
      updatedPrice < 0
    ) {
      return res.status(400).json({
        message:
          "Ticket price must be a valid number."
      });
    }

    if (
      !Number.isFinite(updatedTotalTickets) ||
      updatedTotalTickets <= 0
    ) {
      return res.status(400).json({
        message:
          "Total tickets must be greater than zero."
      });
    }

    if (
      !Number.isFinite(updatedAvailableTickets) ||
      updatedAvailableTickets < 0
    ) {
      return res.status(400).json({
        message:
          "Available tickets cannot be negative."
      });
    }

    if (
      updatedAvailableTickets >
      updatedTotalTickets
    ) {
      return res.status(400).json({
        message:
          "Available tickets cannot be greater than total tickets."
      });
    }


    /* =========================
       SINGLE PRICE
    ========================= */

    const updatedSinglePrice =
      single_price === undefined ||
      single_price === ""
        ? Number(
            existingEvent.single_price ??
            existingEvent.price
          )
        : Number(single_price);

    if (
      !Number.isFinite(updatedSinglePrice) ||
      updatedSinglePrice < 0
    ) {
      return res.status(400).json({
        message:
          "Single ticket price must be valid."
      });
    }


    /* =========================
       COUPLE PRICE
    ========================= */

    let updatedCouplePrice;

    if (
      couple_price === undefined
    ) {
      updatedCouplePrice =
        existingEvent.couple_price ?? null;

    } else if (
      couple_price === ""
    ) {
      updatedCouplePrice = null;

    } else {
      updatedCouplePrice =
        Number(couple_price);
    }

    if (
      updatedCouplePrice !== null &&
      (
        !Number.isFinite(
          updatedCouplePrice
        ) ||
        updatedCouplePrice < 0
      )
    ) {
      return res.status(400).json({
        message:
          "Couple ticket price must be valid."
      });
    }


    /* =========================
       GROUP OF 3 PRICE
    ========================= */

    let updatedGroup3Price;

    if (
      group3_price === undefined
    ) {
      updatedGroup3Price =
        existingEvent.group3_price ?? null;

    } else if (
      group3_price === ""
    ) {
      updatedGroup3Price = null;

    } else {
      updatedGroup3Price =
        Number(group3_price);
    }

    if (
      updatedGroup3Price !== null &&
      (
        !Number.isFinite(
          updatedGroup3Price
        ) ||
        updatedGroup3Price < 0
      )
    ) {
      return res.status(400).json({
        message:
          "Group of 3 ticket price must be valid."
      });
    }


    /* =========================
       EARLY BIRD
    ========================= */

    let updatedEarlyBirdEnabled;

    if (
      early_bird_enabled === undefined
    ) {
      updatedEarlyBirdEnabled =
        Number(
          existingEvent.early_bird_enabled || 0
        ) === 1;

    } else {
      updatedEarlyBirdEnabled =
        early_bird_enabled === true ||
        early_bird_enabled === 1 ||
        early_bird_enabled === "1";
    }


    let updatedEarlyBirdPrice;

    if (
      early_bird_single_price === undefined
    ) {
      updatedEarlyBirdPrice =
        existingEvent.early_bird_single_price ??
        null;

    } else if (
      early_bird_single_price === ""
    ) {
      updatedEarlyBirdPrice = null;

    } else {
      updatedEarlyBirdPrice =
        Number(early_bird_single_price);
    }


    let updatedEarlyBirdExpiry;

    if (
      early_bird_expiry === undefined
    ) {
      updatedEarlyBirdExpiry =
        existingEvent.early_bird_expiry ??
        null;

    } else {
      updatedEarlyBirdExpiry =
        early_bird_expiry || null;
    }


    if (updatedEarlyBirdEnabled) {

      if (
        updatedEarlyBirdPrice === null ||
        !Number.isFinite(
          updatedEarlyBirdPrice
        ) ||
        updatedEarlyBirdPrice < 0
      ) {
        return res.status(400).json({
          message:
            "Early Bird price must be valid."
        });
      }

      if (!updatedEarlyBirdExpiry) {
        return res.status(400).json({
          message:
            "Early Bird requires an expiry date/time."
        });
      }
    } else {
      /*
        If Early Bird is disabled,
        keep the database clean.
      */

      updatedEarlyBirdPrice = null;
      updatedEarlyBirdExpiry = null;
    }


    /* =========================
       REQUIRED TEXT
    ========================= */

    if (!updatedTitle) {
      return res.status(400).json({
        message:
          "Event title is required."
      });
    }

    if (!updatedDate) {
      return res.status(400).json({
        message:
          "Event date is required."
      });
    }

    if (!updatedTime) {
      return res.status(400).json({
        message:
          "Event time is required."
      });
    }

    if (!updatedVenue) {
      return res.status(400).json({
        message:
          "Event venue is required."
      });
    }


    /* =========================
       UPDATE DATABASE
    ========================= */

    const update = db.prepare(
      `
      UPDATE events
      SET
        title = ?,
        description = ?,
        date = ?,
        time = ?,
        venue = ?,
        price = ?,
        capacity = ?,
        total_tickets = ?,
        available_tickets = ?,
        image = ?,
        single_price = ?,
        couple_price = ?,
        group3_price = ?,
        early_bird_enabled = ?,
        early_bird_single_price = ?,
        early_bird_expiry = ?
      WHERE id = ?
      `
    );

    const result = update.run(
      updatedTitle,
      updatedDescription,
      updatedDate,
      updatedTime,
      updatedVenue,

      updatedPrice,

      /*
        Keep capacity synchronized
        with total tickets.
      */
      updatedTotalTickets,

      updatedTotalTickets,
      updatedAvailableTickets,

      updatedImage,

      updatedSinglePrice,
      updatedCouplePrice,
      updatedGroup3Price,

      updatedEarlyBirdEnabled ? 1 : 0,
      updatedEarlyBirdPrice,
      updatedEarlyBirdExpiry,

      eventId
    );


    /* =========================
       VERIFY UPDATE
    ========================= */

    if (result.changes === 0) {
      return res.status(500).json({
        message:
          "Event could not be updated."
      });
    }


    /* =========================
       RETURN UPDATED EVENT
    ========================= */

    const updatedEvent = db
      .prepare(
        `
        SELECT *
        FROM events
        WHERE id = ?
        `
      )
      .get(eventId);

    return res.json({
      message:
        "Event updated successfully.",
      event: updatedEvent
    });

  } catch (error) {

    console.error(
      "===================================="
    );

    console.error(
      "UPDATE EVENT DATABASE ERROR"
    );

    console.error(
      "Event ID:",
      req.params.id
    );

    console.error(
      "Request body:",
      req.body
    );

    console.error(
      "Error:",
      error
    );

    console.error(
      "===================================="
    );

    /*
      IMPORTANT:
      During development we return
      the actual database error so
      we can identify the exact
      problem instead of just seeing
      "Failed to update event."
    */

    return res.status(500).json({
      message:
        error.message ||
        "Failed to update event."
    });
  }
}


/* =========================
   ARCHIVE EVENT
========================= */

function deleteEvent(req, res) {
  try {
    const event = db
      .prepare(
        `
        SELECT *
        FROM events
        WHERE id = ?
        `
      )
      .get(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    const archiveEvent =
      db.transaction(() => {

        /* =========================
           ARCHIVE EVENT
        ========================= */

        db.prepare(
          `
          UPDATE events
          SET status = 'ARCHIVED'
          WHERE id = ?
          `
        ).run(req.params.id);


        /* =========================
           ARCHIVE TICKETS
        ========================= */

        db.prepare(
          `
          UPDATE tickets
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE event_id = ?
          AND deleted_at IS NULL
          `
        ).run(String(req.params.id));

      });

    archiveEvent();

    res.json({
      message:
        "Event and all associated tickets archived successfully."
    });

  } catch (error) {
    console.error(
      "Archive event error:",
      error
    );

    res.status(500).json({
      message:
        error.message ||
        "Failed to archive event."
    });
  }
}


/* =========================
   EXPORTS
========================= */

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
};