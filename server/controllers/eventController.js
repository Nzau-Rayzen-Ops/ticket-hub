const pool = require("../config/db");


/* ============================================================
   HELPERS
============================================================ */

function normalizeBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  return (
    normalized === "true" ||
    normalized === "1"
  );
}


function getValidEventId(req, res) {
  const rawId = req.params.id;

  if (
    rawId === undefined ||
    rawId === null ||
    String(rawId).trim() === ""
  ) {
    res.status(400).json({
      message: "Event ID is required."
    });

    return null;
  }

  const eventId =
    String(rawId).trim();

  if (!/^\d+$/.test(eventId)) {
    res.status(400).json({
      message: "Invalid event ID."
    });

    return null;
  }

  return eventId;
}


/* ============================================================
   GET ALL EVENTS
============================================================ */

async function getEvents(req, res) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM events
      WHERE status != 'ARCHIVED'
      ORDER BY date ASC, time ASC
    `);

    return res.json(result.rows);

  } catch (error) {
    console.error(
      "Get events error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to load events."
    });
  }
}


/* ============================================================
   GET SINGLE EVENT
============================================================ */

async function getEvent(req, res) {
  try {
    const eventId =
      getValidEventId(req, res);

    if (!eventId) {
      return;
    }

    const result =
      await pool.query(
        `
        SELECT *
        FROM events
        WHERE id = $1
        `,
        [eventId]
      );

    const event =
      result.rows[0];

    if (!event) {
      return res.status(404).json({
        message:
          "Event not found."
      });
    }

    return res.json(event);

  } catch (error) {
    console.error(
      "Get event error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to load event."
    });
  }
}


/* ============================================================
   CREATE EVENT
============================================================ */

async function createEvent(req, res) {
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


    const eventPrice =
      Number(price);

    const totalTickets =
      Number(total_tickets);


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


    const earlyBirdEnabled =
      normalizeBoolean(
        early_bird_enabled
      );


    let earlyBirdPrice =
      null;

    let earlyBirdExpiry =
      null;


    if (earlyBirdEnabled) {

      if (
        early_bird_single_price ===
          undefined ||
        early_bird_single_price === ""
      ) {
        return res.status(400).json({
          message:
            "Early Bird requires a single ticket price."
        });
      }


      earlyBirdPrice =
        Number(
          early_bird_single_price
        );


      earlyBirdExpiry =
        early_bird_expiry ||
        null;


      if (
        !Number.isFinite(
          earlyBirdPrice
        ) ||
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


    const result =
      await pool.query(
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
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16
        )
        RETURNING *
        `,
        [
          String(title).trim(),
          description || "",
          date,
          time,
          String(venue).trim(),
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
        ]
      );


    return res.status(201).json({
      message:
        "Event created successfully.",
      event:
        result.rows[0]
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


/* ============================================================
   UPDATE EVENT
============================================================ */

async function updateEvent(req, res) {
  const client =
    await pool.connect();

  try {

    const eventId =
      getValidEventId(req, res);

    if (!eventId) {
      client.release();
      return;
    }


    const existingResult =
      await client.query(
        `
        SELECT *
        FROM events
        WHERE id = $1
        `,
        [eventId]
      );


    const existingEvent =
      existingResult.rows[0];


    if (!existingEvent) {
      return res.status(404).json({
        message:
          "Event not found."
      });
    }


    const {
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
    } = req.body;


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


    const updatedPrice =
      price === undefined ||
      price === ""
        ? Number(existingEvent.price)
        : Number(price);


    const updatedTotalTickets =
      total_tickets === undefined ||
      total_tickets === ""
        ? Number(
            existingEvent.total_tickets
          )
        : Number(total_tickets);


    const updatedAvailableTickets =
      available_tickets === undefined ||
      available_tickets === ""
        ? Number(
            existingEvent.available_tickets
          )
        : Number(available_tickets);


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
      !Number.isFinite(
        updatedTotalTickets
      ) ||
      updatedTotalTickets <= 0
    ) {
      return res.status(400).json({
        message:
          "Total tickets must be greater than zero."
      });
    }


    if (
      !Number.isFinite(
        updatedAvailableTickets
      ) ||
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


    const updatedSinglePrice =
      single_price === undefined ||
      single_price === ""
        ? Number(
            existingEvent.single_price ??
            existingEvent.price
          )
        : Number(single_price);


    if (
      !Number.isFinite(
        updatedSinglePrice
      ) ||
      updatedSinglePrice < 0
    ) {
      return res.status(400).json({
        message:
          "Single ticket price must be valid."
      });
    }


    let updatedCouplePrice;

    if (
      couple_price === undefined
    ) {
      updatedCouplePrice =
        existingEvent.couple_price ??
        null;

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


    let updatedGroup3Price;

    if (
      group3_price === undefined
    ) {
      updatedGroup3Price =
        existingEvent.group3_price ??
        null;

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


    const updatedEarlyBirdEnabled =
      early_bird_enabled === undefined
        ? normalizeBoolean(
            existingEvent.early_bird_enabled
          )
        : normalizeBoolean(
            early_bird_enabled
          );


    let updatedEarlyBirdPrice;

    if (
      early_bird_single_price ===
      undefined
    ) {
      updatedEarlyBirdPrice =
        existingEvent
          .early_bird_single_price ??
        null;

    } else if (
      early_bird_single_price === ""
    ) {
      updatedEarlyBirdPrice = null;

    } else {
      updatedEarlyBirdPrice =
        Number(
          early_bird_single_price
        );
    }


    let updatedEarlyBirdExpiry;

    if (
      early_bird_expiry === undefined
    ) {
      updatedEarlyBirdExpiry =
        existingEvent
          .early_bird_expiry ??
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

      updatedEarlyBirdPrice =
        null;

      updatedEarlyBirdExpiry =
        null;
    }


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


    /*
    IMPORTANT:

    Capacity is allowed to come from
    the frontend, but if omitted it
    falls back to total tickets.
    */

    const updatedCapacity =
      capacity === undefined ||
      capacity === ""
        ? updatedTotalTickets
        : Number(capacity);


    if (
      !Number.isFinite(
        updatedCapacity
      ) ||
      updatedCapacity <= 0
    ) {
      return res.status(400).json({
        message:
          "Capacity must be greater than zero."
      });
    }


    const result =
      await client.query(
        `
        UPDATE events
        SET
          title = $1,
          description = $2,
          date = $3,
          time = $4,
          venue = $5,
          price = $6,
          capacity = $7,
          total_tickets = $8,
          available_tickets = $9,
          image = $10,
          single_price = $11,
          couple_price = $12,
          group3_price = $13,
          early_bird_enabled = $14,
          early_bird_single_price = $15,
          early_bird_expiry = $16
        WHERE id = $17
        RETURNING *
        `,
        [
          updatedTitle,
          updatedDescription,
          updatedDate,
          updatedTime,
          updatedVenue,
          updatedPrice,
          updatedCapacity,
          updatedTotalTickets,
          updatedAvailableTickets,
          updatedImage,

          updatedSinglePrice,
          updatedCouplePrice,
          updatedGroup3Price,

          updatedEarlyBirdEnabled
            ? 1
            : 0,

          updatedEarlyBirdPrice,
          updatedEarlyBirdExpiry,

          eventId
        ]
      );


    if (
      result.rows.length === 0
    ) {
      return res.status(500).json({
        message:
          "Event could not be updated."
      });
    }


    return res.json({
      message:
        "Event updated successfully.",
      event:
        result.rows[0]
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

    return res.status(500).json({
      message:
        error.message ||
        "Failed to update event."
    });

  } finally {
    client.release();
  }
}


/* ============================================================
   ARCHIVE EVENT
============================================================ */

async function deleteEvent(req, res) {

  const client =
    await pool.connect();

  try {

    const eventId =
      getValidEventId(req, res);

    if (!eventId) {
      client.release();
      return;
    }


    const eventResult =
      await client.query(
        `
        SELECT *
        FROM events
        WHERE id = $1
        `,
        [eventId]
      );


    const event =
      eventResult.rows[0];


    if (!event) {
      return res.status(404).json({
        message:
          "Event not found."
      });
    }


    await client.query(
      "BEGIN"
    );


    await client.query(
      `
      UPDATE events
      SET status = 'ARCHIVED'
      WHERE id = $1
      `,
      [eventId]
    );


    await client.query(
      `
      UPDATE tickets
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE event_id = $1
      AND deleted_at IS NULL
      `,
      [String(eventId)]
    );


    await client.query(
      "COMMIT"
    );


    return res.json({
      message:
        "Event and all associated tickets archived successfully."
    });

  } catch (error) {

    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (_) {}


    console.error(
      "Archive event error:",
      error
    );


    return res.status(500).json({
      message:
        error.message ||
        "Failed to archive event."
    });

  } finally {
    client.release();
  }
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
};
