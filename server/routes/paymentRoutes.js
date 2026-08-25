const express = require("express");

const router = express.Router();

/*
  Payment routes placeholder.

  M-Pesa payment functionality is handled separately
  by /api/mpesa in mpesaRoutes.js.
*/

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Payment API is available"
  });
});

module.exports = router;
