const express = require("express");
const axios = require("axios");
const router = express.Router();
const db = require("../config/db"); // Your running Postgres connection helper

const SASAPAY_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://sasapay.app" 
  : "https://sasapay.app";

/* ==========================================
   HELPER: GENERATE ACCESS TOKEN (OAUTH 2.0)
========================================== */
async function getSasaPayToken() {
  try {
    const credentials = Buffer.from(
      `${process.env.SASAPAY_CLIENT_ID}:${process.env.SASAPAY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.get(`${SASAPAY_BASE_URL}/auth/token?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("❌ SasaPay OAuth Token Generation Failed:", error.response?.data || error.message);
    throw new Error("Payment authentication token mismatch error.");
  }
}

/* ==========================================
   ROUTE 1: INITIALIZE STK PUSH (PASSING CLIENT CONTEXT)
========================================== */
router.post("/stkpush", async (req, res) => {
  try {
    const { phoneNumber, amount, eventId, customerName, customerEmail } = req.body;

    if (!phoneNumber || !amount || !eventId || !customerEmail || !customerName) {
      return res.status(400).json({ success: false, message: "Missing required checkout parameters." });
    }

    // Clean and standardise phone number formatting to 2547XXXXXXXX / 2541XXXXXXXX
    let formattedPhone = phoneNumber.trim().replace(/^\+/, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    }

    /*
       Create a composite reference tracking string.
       We separate the variables using underscores so the callback can split them apart later!
       Format: ORD_[eventId]_[customerName]_[customerEmail]
    */
    const cleanEmail = customerEmail.trim().toLowerCase();
    const cleanName = customerName.trim().replace(/[^a-zA-Z0-9]/g, ""); // Strip spaces/special characters
    const orderRef = `ORD_${eventId}_${cleanName}_${cleanEmail}`;

    console.log(`🔑 Fetching Token to process prompt for Order metadata string: ${orderRef}...`);
    const token = await getSasaPayToken();

    // Call SasaPay Checkout API
    const response = await axios.post(
      `${SASAPAY_BASE_URL}/payments/request-payment`,
      {
        MerchantCode: process.env.SASAPAY_MERCHANT_CODE,
        Amount: Number(amount),
        PhoneNumber: formattedPhone,
        TransactionReference: orderRef.substring(0, 50), // SasaPay max characters safety cap
        CallBackUrl: `${process.env.BACKEND_URL}/api/mpesa/callback`,
        Narration: `Ticket Hub Event Buy`
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.status === "Success") {
      return res.json({
        success: true,
        message: "STK push triggered successfully.",
        merchantRequestID: response.data.MerchantRequestID,
        orderReference: orderRef
      });
    }

    throw new Error(response.data.message || "SasaPay gateway rejected payload components.");

  } catch (error) {
    console.error("❌ STK Push initialization crashed:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Could not trigger M-Pesa automated prompt." });
  }
});

/* ==========================================
   ROUTE 2: CALLBACK WEBHOOK (PARSES AND CREATES TICKET)
========================================== */
router.post("/callback", async (req, res) => {
  try {
    const { TransactionReference, ResultCode, MpesaReceiptNumber, Amount } = req.body;

    console.log(`📥 Payment callback received for Ref: ${TransactionReference}. ResultCode: ${ResultCode}`);

    // ResultCode 0 means transaction success in Safaricom/SasaPay ecosystems
    if (Number(ResultCode) === 0) {
      // Split our composite string back apart into variables: ['ORD', 'eventId', 'name', 'email']
      const parts = TransactionReference.split("_");
      const eventId = parseInt(parts[1], 10);
      const customerName = parts[2] || "TicketHub Buyer";
      const customerEmail = parts[3] || "buyer@mail.com";

      console.log(`🚀 Payment verified. Generating final Ticket row for: ${customerEmail}`);

      // Fetch the event title first to populate your native ticket history tracking data cleanly
      const eventCheck = await db.query("SELECT title FROM events WHERE id = $1", [eventId]);
      const eventTitle = eventCheck.rows[0]?.title || "Event Ticket";

      /* 
         INSERT ROW IN TICKET TABLE
         This query matches your system architecture exactly.
      */
      const newTicket = await db.query(
        `INSERT INTO tickets (
          event_id, 
          customer_name, 
          customer_email, 
          event_title,
          payment_status, 
          mpesa_receipt_number, 
          amount,
          created_at,
          updated_at
         ) VALUES ($1, $2, $3, $4, 'PAID', $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [eventId, customerName, customerEmail, eventTitle, MpesaReceiptNumber, Number(Amount)]
      );

      console.log(`✅ Ticket generated inside PostgreSQL successfully! New Ticket Record ID: ${newTicket.rows[0].id}`);
    }

    // Acknowledge receipt back to SasaPay securely to shut down retry loops
    res.status(200).json({ status: "ACKNOWLEDGED" });

  } catch (callbackError) {
    console.error("❌ Webhook processing error:", callbackError.message);
    res.status(500).send("Webhook handling failure.");
  }
});

module.exports = router;
