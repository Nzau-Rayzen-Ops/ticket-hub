// routes/mpesaRoutes.js

const express = require("express");

const router = express.Router();

const {
  initiateSTKPush,
  querySTKPushStatus
} = require("../services/mpesaService");

const db = require("../database");

/* =========================
   INITIATE STK PUSH
========================= */

router.post("/stkpush", async (req, res) => {
  try {
    const {
      phoneNumber,
      amount,
      accountReference,
      transactionDesc
    } = req.body;

    if (
      !phoneNumber ||
      amount === undefined ||
      !accountReference
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number, amount, and account reference are required."
      });
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment amount."
      });
    }

    const result =
      await initiateSTKPush(
        phoneNumber,
        numericAmount,
        accountReference,
        transactionDesc
      );

    if (
      !result ||
      !result.CheckoutRequestID
    ) {
      console.error(
        "Invalid STK response:",
        result
      );

      return res.status(502).json({
        success: false,
        message:
          "Safaricom did not return a valid checkout request."
      });
    }

    const checkoutRequestID =
      result.CheckoutRequestID;

    const merchantRequestID =
      result.MerchantRequestID || "";

    /*
      Store the transaction so we can
      track its status.
    */
    db.prepare(`
      INSERT INTO mpesa_transactions
      (
        checkout_request_id,
        merchant_request_id,
        phone_number,
        amount,
        account_reference,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      checkoutRequestID,
      merchantRequestID,
      String(phoneNumber),
      numericAmount,
      String(accountReference),
      "PENDING"
    );

    return res.json({
      success: true,

      message:
        result.ResponseDescription ||
        "Payment prompt sent to your phone.",

      checkoutRequestID,

      merchantRequestID,

      customerMessage:
        result.CustomerMessage ||
        "Please check your phone and enter your M-Pesa PIN."
    });

  } catch (error) {
    console.error(
      "STK Push route error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "M-Pesa payment initiation failed."
    });
  }
});

/* =========================
   CHECK PAYMENT STATUS
========================= */

router.get(
  "/status/:checkoutRequestID",
  async (req, res) => {
    try {
      const {
        checkoutRequestID
      } = req.params;

      if (!checkoutRequestID) {
        return res.status(400).json({
          success: false,
          message:
            "Checkout Request ID is required."
        });
      }

      /*
        Check our database first.
      */
      const existingTransaction =
        db.prepare(`
          SELECT *
          FROM mpesa_transactions
          WHERE checkout_request_id = ?
        `).get(checkoutRequestID);

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message:
            "M-Pesa transaction not found."
        });
      }

      /*
        If already successful or failed,
        don't unnecessarily query Safaricom.
      */
      if (
        existingTransaction.status === "SUCCESS"
      ) {
        return res.json({
          success: true,
          status: "SUCCESS",
          result: {
            ResultCode: "0",
            ResultDesc:
              "Payment already confirmed."
          }
        });
      }

      if (
        existingTransaction.status === "FAILED"
      ) {
        return res.json({
          success: true,
          status: "FAILED",
          result: {
            ResultCode:
              existingTransaction.result_code ||
              "FAILED",

            ResultDesc:
              existingTransaction.result_desc ||
              "Payment failed."
          }
        });
      }

      /*
        Query Safaricom.
      */
      const result =
        await querySTKPushStatus(
          checkoutRequestID
        );

      const resultCode =
        String(
          result.ResultCode ??
          result.ResponseCode ??
          ""
        );

      const resultDesc =
        result.ResultDesc ||
        result.ResponseDescription ||
        "";

      /*
        SUCCESS
      */
      if (resultCode === "0") {

        db.prepare(`
          UPDATE mpesa_transactions

          SET
            status = 'SUCCESS',
            transaction_id =
              COALESCE(transaction_id, ?),
            updated_at =
              CURRENT_TIMESTAMP

          WHERE checkout_request_id = ?
        `).run(
          result.MpesaReceiptNumber ||
            null,
          checkoutRequestID
        );

        return res.json({
          success: true,
          status: "SUCCESS",
          result
        });
      }

      /*
        PENDING
      */

      /*
        Safaricom can return different
        pending/processing codes depending
        on the sandbox response.

        We therefore treat these as
        still pending rather than immediately
        declaring failure.
      */
      const pendingCodes = [
        "",
        "1037"
      ];

      if (
        pendingCodes.includes(resultCode)
      ) {
        return res.json({
          success: true,
          status: "PENDING",
          result
        });
      }

      /*
        FAILED / CANCELLED
      */
      db.prepare(`
        UPDATE mpesa_transactions

        SET
          status = 'FAILED',
          updated_at = CURRENT_TIMESTAMP

        WHERE checkout_request_id = ?
      `).run(checkoutRequestID);

      return res.json({
        success: true,
        status: "FAILED",
        result
      });

    } catch (error) {

      console.error(
        "STK status route error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to check payment status."
      });
    }
  }
);

/* =========================
   SAFARICOM CALLBACK
========================= */

router.post(
  "/callback",
  (req, res) => {

    try {

      const data = req.body;

      console.log(
        "M-Pesa callback received:"
      );

      console.log(
        JSON.stringify(
          data,
          null,
          2
        )
      );

      /*
        Always acknowledge Safaricom.
      */
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted"
      });

      const callback =
        data?.Body?.stkCallback;

      if (!callback) {
        return;
      }

      const {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
      } = callback;

      if (!CheckoutRequestID) {
        return;
      }

      /*
        Payment successful.
      */
      if (String(ResultCode) === "0") {

        let amount = null;
        let phone = null;
        let transactionId = null;

        const items =
          CallbackMetadata?.Item || [];

        items.forEach((item) => {

          if (
            item.Name === "Amount"
          ) {
            amount = item.Value;
          }

          if (
            item.Name === "PhoneNumber"
          ) {
            phone = item.Value;
          }

          if (
            item.Name === "MpesaReceiptNumber"
          ) {
            transactionId =
              item.Value;
          }
        });

        db.prepare(`
          UPDATE mpesa_transactions

          SET
            status = 'SUCCESS',
            transaction_id =
              COALESCE(?, transaction_id),
            updated_at =
              CURRENT_TIMESTAMP

          WHERE checkout_request_id = ?
        `).run(
          transactionId,
          CheckoutRequestID
        );

        console.log(
          "M-Pesa payment confirmed:",
          {
            CheckoutRequestID,
            transactionId,
            amount,
            phone
          }
        );

      } else {

        /*
          We don't immediately create
          or modify tickets here.

          PaymentSuccess will only create
          a ticket after the frontend has
          confirmed SUCCESS through /status.
        */

        console.log(
          "M-Pesa payment failed:",
          {
            CheckoutRequestID,
            ResultCode,
            ResultDesc
          }
        );

        db.prepare(`
          UPDATE mpesa_transactions

          SET
            status = 'FAILED',
            updated_at =
              CURRENT_TIMESTAMP

          WHERE checkout_request_id = ?
          AND status = 'PENDING'
        `).run(
          CheckoutRequestID
        );
      }

    } catch (error) {

      console.error(
        "M-Pesa callback error:",
        error
      );

      /*
        Safaricom should still receive
        an acknowledgement.
      */

      if (!res.headersSent) {
        res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted"
        });
      }
    }
  }
);

module.exports = router;