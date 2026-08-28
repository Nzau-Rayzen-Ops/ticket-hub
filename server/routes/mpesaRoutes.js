const express = require("express");
const router = express.Router();
const db = require("../config/db"); // Your active Postgres configuration helper

/* ========================================================
   PRODUCTION SIMULATOR: AUTO-APPROVE PAYMENTS INSTANTLY
======================================================== */
router.post("/stkpush", async (req, res) => {
  try {
    const { phoneNumber, amount, ticketId } = req.body;
    
    console.log(`[SIMULATOR] Processing instant payment bypass for ticket ID: ${ticketId}`);

    // Generate a clean mock M-Pesa receipt number sequence (e.g., SKA749201X)
    const mockReceipt = "SK" + Math.floor(100000 + Math.random() * 900000).toString() + "X";

    // DIRECTLY FLAG YOUR POSTGRESQL TABLE AS 'PAID' IN ONE RAW PASS
    await db.query(
      `UPDATE tickets 
       SET payment_status = 'PAID', mpesa_receipt_number = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [mockReceipt, parseInt(ticketId, 10)]
    );

    console.log(`✅ Ticket ID ${ticketId} auto-approved. Receipt: ${mockReceipt}`);

    // Return a perfect success response to your React frontend context
    return res.json({
      success: true,
      message: "Ticket purchase transaction handled and approved successfully!",
      receipt: mockReceipt
    });

  } catch (error) {
    console.error("❌ Core transaction simulation error:", error.message);
    res.status(500).json({ success: false, message: "Internal transaction handling failure." });
  }
});

/* ========================================================
   CALLBACK ROUTE (MAINTAIN FOR PATH LIFECYCLES)
======================================================== */
router.post("/callback", (req, res) => {
  res.status(200).json({ status: "ACKNOWLEDGED" });
});

module.exports = router;
