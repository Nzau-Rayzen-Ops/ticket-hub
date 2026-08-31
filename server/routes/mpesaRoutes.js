// server/routes/mpesaRoutes.js

const express = require("express");

const router = express.Router();

const {
  initiateSTKPush,
  querySTKPushStatus
} = require("../services/mpesaService");

const pool = require("../config/db");

/* =========================================================
   INITIATE STK PUSH
========================================================= */

router.post(
  "/stkpush",
  async (req, res) => {

    try {

      const {
        phoneNumber,
        amount,
        accountReference,
        transactionDesc,
        eventId,
        idempotencyKey
      } = req.body;

      /* -----------------------------------------------------
         VALIDATION
      ----------------------------------------------------- */

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
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid payment amount."
        });
      }

      /* -----------------------------------------------------
         IDEMPOTENCY
      ----------------------------------------------------- */

      if (idempotencyKey) {

        const existing =
          await pool.query(
            `
            SELECT *
            FROM mpesa_transactions
            WHERE idempotency_key = $1
            LIMIT 1
            `,
            [
              String(
                idempotencyKey
              )
            ]
          );

        if (
          existing.rows.length > 0
        ) {

          const transaction =
            existing.rows[0];

          return res.json({

            success: true,

            alreadyExists: true,

            status:
              transaction.status,

            checkoutRequestID:
              transaction.checkout_request_id,

            merchantRequestID:
              transaction.merchant_request_id,

            transaction
          });
        }
      }

      /* -----------------------------------------------------
         INITIATE SAFARICOM STK
      ----------------------------------------------------- */

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
          "❌ Invalid STK response:",
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
        result.MerchantRequestID ||
        "";

      /* -----------------------------------------------------
         SAVE TRANSACTION
      ----------------------------------------------------- */

      const insertResult =
        await pool.query(
          `
          INSERT INTO mpesa_transactions
          (
            checkout_request_id,
            merchant_request_id,
            phone_number,
            amount,
            account_reference,
            transaction_desc,
            status,
            result_code,
            result_desc,
            event_id,
            idempotency_key
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
          RETURNING *
          `,
          [

            checkoutRequestID,

            merchantRequestID,

            String(
              phoneNumber
            ),

            numericAmount,

            String(
              accountReference
            ),

            transactionDesc
              ? String(
                  transactionDesc
                )
              : null,

            "PENDING",

            result.ResponseCode
              ? String(
                  result.ResponseCode
                )
              : null,

            result.ResponseDescription
              ? String(
                  result.ResponseDescription
                )
              : null,

            eventId
              ? Number(eventId)
              : null,

            idempotencyKey
              ? String(
                  idempotencyKey
                )
              : null
          ]
        );

      /* -----------------------------------------------------
         RESPONSE
      ----------------------------------------------------- */

      return res.json({

        success: true,

        message:
          result.ResponseDescription ||
          "Payment prompt sent to your phone.",

        checkoutRequestID,

        merchantRequestID,

        customerMessage:
          result.CustomerMessage ||
          "Please check your phone and enter your M-Pesa PIN.",

        transaction:
          insertResult.rows[0]
      });

    } catch (error) {

      console.error(
        "❌ STK Push route error:",
        error
      );

      /*
        PostgreSQL unique constraint.

        23505 = duplicate key.
      */

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({
          success: false,
          message:
            "This payment request already exists."
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "M-Pesa payment initiation failed."
      });
    }
  }
);

/* =========================================================
   CHECK PAYMENT STATUS
========================================================= */

router.get(
  "/status/:checkoutRequestID",
  async (req, res) => {

    try {

      const {
        checkoutRequestID
      } = req.params;

      if (
        !checkoutRequestID
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Checkout Request ID is required."
        });
      }

      /* -----------------------------------------------------
         CHECK DATABASE FIRST
      ----------------------------------------------------- */

      const existingResult =
        await pool.query(
          `
          SELECT *
          FROM mpesa_transactions
          WHERE checkout_request_id = $1
          LIMIT 1
          `,
          [
            checkoutRequestID
          ]
        );

      if (
        existingResult.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "M-Pesa transaction not found."
        });
      }

      const transaction =
        existingResult.rows[0];

      /* -----------------------------------------------------
         ALREADY SUCCESSFUL
      ----------------------------------------------------- */

      if (
        transaction.status ===
        "SUCCESS"
      ) {

        return res.json({

          success: true,

          status:
            "SUCCESS",

          transaction,

          result: {

            ResultCode:
              "0",

            ResultDesc:
              transaction.result_desc ||
              "Payment already confirmed."
          }
        });
      }

      /* -----------------------------------------------------
         ALREADY FAILED
      ----------------------------------------------------- */

      if (
        transaction.status ===
        "FAILED"
      ) {

        return res.json({

          success: true,

          status:
            "FAILED",

          transaction,

          result: {

            ResultCode:
              transaction.result_code ||
              "FAILED",

            ResultDesc:
              transaction.result_desc ||
              "Payment failed."
          }
        });
      }

      /* -----------------------------------------------------
         QUERY SAFARICOM
      ----------------------------------------------------- */

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

      /* -----------------------------------------------------
         SUCCESS
      ----------------------------------------------------- */

      if (
        resultCode === "0"
      ) {

        const receipt =
          result.MpesaReceiptNumber ||
          result.MpesaReceipt ||
          null;

        await pool.query(
          `
          UPDATE mpesa_transactions

          SET
            status = 'SUCCESS',

            transaction_id =
              COALESCE(
                $1,
                transaction_id
              ),

            result_code = $2,

            result_desc = $3,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE checkout_request_id = $4
          `,
          [
            receipt,

            resultCode,

            resultDesc ||
              "Payment successful.",

            checkoutRequestID
          ]
        );

        const updated =
          await pool.query(
            `
            SELECT *
            FROM mpesa_transactions
            WHERE checkout_request_id = $1
            LIMIT 1
            `,
            [
              checkoutRequestID
            ]
          );

        return res.json({

          success: true,

          status:
            "SUCCESS",

          transaction:
            updated.rows[0],

          result
        });
      }

      /* -----------------------------------------------------
         PENDING
      ----------------------------------------------------- */

      const pendingCodes = [
        "",
        "1037"
      ];

      if (
        pendingCodes.includes(
          resultCode
        )
      ) {

        await pool.query(
          `
          UPDATE mpesa_transactions

          SET
            result_code = $1,
            result_desc = $2,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE checkout_request_id = $3
          `,
          [
            resultCode || null,

            resultDesc ||
              "Payment is still pending.",

            checkoutRequestID
          ]
        );

        return res.json({

          success: true,

          status:
            "PENDING",

          result
        });
      }

      /* -----------------------------------------------------
         FAILED / CANCELLED
      ----------------------------------------------------- */

      await pool.query(
        `
        UPDATE mpesa_transactions

        SET
          status = 'FAILED',

          result_code = $1,

          result_desc = $2,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE checkout_request_id = $3
        `,
        [
          resultCode,

          resultDesc ||
            "Payment failed or was cancelled.",

          checkoutRequestID
        ]
      );

      return res.json({

        success: true,

        status:
          "FAILED",

        result
      });

    } catch (error) {

      console.error(
        "❌ STK status route error:",
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

/* =========================================================
   SAFARICOM CALLBACK
========================================================= */

router.post(
  "/callback",
  async (req, res) => {

    /*
      Safaricom needs a quick acknowledgement.

      We acknowledge immediately before processing
      the database update.
    */

    res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted"
    });

    try {

      const data =
        req.body;

      console.log(
        "📥 M-Pesa callback received:"
      );

      console.log(
        JSON.stringify(
          data,
          null,
          2
        )
      );

      const callback =
        data?.Body?.stkCallback;

      if (!callback) {

        console.warn(
          "⚠️ Callback did not contain stkCallback."
        );

        return;
      }

      const {
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata
      } = callback;

      if (
        !CheckoutRequestID
      ) {

        console.warn(
          "⚠️ Callback missing CheckoutRequestID."
        );

        return;
      }

      const callbackCode =
        String(
          ResultCode
        );

      /* -----------------------------------------------------
         SUCCESS CALLBACK
      ----------------------------------------------------- */

      if (
        callbackCode === "0"
      ) {

        let amount = null;

        let phone = null;

        let transactionId = null;

        const items =
          CallbackMetadata?.Item ||
          [];

        items.forEach(
          (item) => {

            if (
              item.Name ===
              "Amount"
            ) {
              amount =
                item.Value;
            }

            if (
              item.Name ===
              "PhoneNumber"
            ) {
              phone =
                item.Value;
            }

            if (
              item.Name ===
              "MpesaReceiptNumber"
            ) {
              transactionId =
                item.Value;
            }
          }
        );

        await pool.query(
          `
          UPDATE mpesa_transactions

          SET
            status = 'SUCCESS',

            transaction_id =
              COALESCE(
                $1,
                transaction_id
              ),

            result_code = $2,

            result_desc = $3,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE checkout_request_id = $4
          `,
          [

            transactionId,

            callbackCode,

            ResultDesc ||
              "Payment successful.",

            CheckoutRequestID
          ]
        );

        console.log(
          "✅ M-Pesa payment confirmed:",
          {
            CheckoutRequestID,

            transactionId,

            amount,

            phone
          }
        );

        return;
      }

      /* -----------------------------------------------------
         FAILED CALLBACK
      ----------------------------------------------------- */

      await pool.query(
        `
        UPDATE mpesa_transactions

        SET
          status = 'FAILED',

          result_code = $1,

          result_desc = $2,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE checkout_request_id = $3

        AND status = 'PENDING'
        `,
        [

          callbackCode,

          ResultDesc ||
            "Payment failed or was cancelled.",

          CheckoutRequestID
        ]
      );

      console.log(
        "❌ M-Pesa payment failed:",
        {
          CheckoutRequestID,

          ResultCode,

          ResultDesc
        }
      );

    } catch (error) {

      /*
        We already acknowledged Safaricom,
        so don't attempt another response.
      */

      console.error(
        "❌ M-Pesa callback processing error:",
        error
      );
    }
  }
);

/* =========================================================
   GET TRANSACTION
========================================================= */

router.get(
  "/transaction/:checkoutRequestID",
  async (req, res) => {

    try {

      const {
        checkoutRequestID
      } = req.params;

      const result =
        await pool.query(
          `
          SELECT *
          FROM mpesa_transactions
          WHERE checkout_request_id = $1
          LIMIT 1
          `,
          [
            checkoutRequestID
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Transaction not found."
        });
      }

      return res.json({
        success: true,
        transaction:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "Get transaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve transaction."
      });
    }
  }
);

module.exports = router;