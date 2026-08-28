const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const {
  initiateSTKPush,
  querySTKPushStatus
} = require("../services/mpesaService");

const pool = require("../config/db");

/* =========================================================
   SASAPAY CALLBACK SIGNATURE VERIFICATION
========================================================= */

function verifySasaPaySignature(req) {

  const signature =
    req.get("X-SasaPay-Signature");

  /*
    Signature verification is enabled by default.

    During initial testing you can set:
      SASAPAY_VERIFY_CALLBACK_SIGNATURE=false

    Once confirmed, keep it true.
  */

  const verifySignature =
    String(
      process.env.SASAPAY_VERIFY_CALLBACK_SIGNATURE || "true"
    ).toLowerCase() === "true";

  if (!verifySignature) {
    return true;
  }

  if (!signature) {

    console.warn(
      "⚠️ SasaPay callback has no X-SasaPay-Signature header."
    );

    return false;
  }

  const data =
    req.body || {};

  const transactionCode =
    data.sasapay_transaction_code ||
    data.TransactionCode ||
    data.TransID ||
    data.SasaPayTransactionCode ||
    "";

  const merchantCode =
    data.merchant_code ||
    data.merchantCode ||
    data.MerchantCode ||
    data.BusinessShortCode ||
    process.env.SASAPAY_MERCHANT_CODE ||
    "";

  const accountNumber =
    data.account_number ||
    data.accountNumber ||
    data.AccountNumber ||
    data.CustomerMobile ||
    data.MSISDN ||
    "";

  const paymentReference =
    data.payment_reference ||
    data.BillRefNumber ||
    data.InvoiceNumber ||
    data.MerchantReference ||
    data.MerchantTransactionReference ||
    data.TransactionReference ||
    data.PaymentRequestID ||
    data.MerchantRequestID ||
    "";

  const amount =
    data.amount ??
    data.TransactionAmount ??
    data.TransAmount ??
    data.AmountPaid ??
    data.PaidAmount ??
    data.Amount ??
    "";

  if (
    !transactionCode ||
    !merchantCode ||
    !accountNumber ||
    !paymentReference ||
    amount === ""
  ) {

    console.warn(
      "⚠️ Cannot verify SasaPay callback signature because required fields are missing."
    );

    return false;
  }

  const message =
    `${transactionCode}-${merchantCode}-${accountNumber}-${paymentReference}-${amount}`;

  const secret =
    process.env.SASAPAY_CLIENT_ID;

  if (!secret) {

    console.error(
      "❌ SASAPAY_CLIENT_ID is missing. Cannot verify callback signature."
    );

    return false;
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha512",
        secret
      )
      .update(message, "utf8")
      .digest("hex");

  try {

    return crypto.timingSafeEqual(
      Buffer.from(
        expectedSignature,
        "utf8"
      ),
      Buffer.from(
        String(signature),
        "utf8"
      )
    );

  } catch {

    return false;
  }
}

/* =========================================================
   INITIATE SASAPAY M-PESA PAYMENT
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

      /* =====================================================
         IDEMPOTENCY
      ===================================================== */

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
              String(idempotencyKey)
            ]
          );

        if (existing.rows.length > 0) {

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

      /* =====================================================
         SEND PAYMENT REQUEST
      ===================================================== */

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
          "❌ Invalid SasaPay response:",
          result
        );

        return res.status(502).json({

          success: false,

          message:
            "SasaPay did not return a valid payment request."
        });
      }

      const checkoutRequestID =
        result.CheckoutRequestID;

      const merchantRequestID =
        result.MerchantRequestID || "";

      /* =====================================================
         SAVE TRANSACTION
      ===================================================== */

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

            String(phoneNumber),

            numericAmount,

            String(accountReference),

            transactionDesc
              ? String(transactionDesc)
              : null,

            "PENDING",

            result.ResponseCode
              ? String(result.ResponseCode)
              : null,

            result.ResponseDescription
              ? String(result.ResponseDescription)
              : null,

            eventId
              ? Number(eventId)
              : null,

            idempotencyKey
              ? String(idempotencyKey)
              : null
          ]
        );

      return res.json({

        success: true,

        message:
          result.ResponseDescription ||
          "Payment prompt sent.",

        checkoutRequestID,

        merchantRequestID,

        customerMessage:
          result.CustomerMessage ||
          "Please check your phone and complete the payment.",

        transaction:
          insertResult.rows[0]
      });

    } catch (error) {

      console.error(
        "❌ SasaPay payment route error:",
        error
      );

      if (error.code === "23505") {

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
          "Payment initiation failed."
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

      if (!checkoutRequestID) {

        return res.status(400).json({

          success: false,

          message:
            "Checkout Request ID is required."
        });
      }

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
            "Payment transaction not found."
        });
      }

      const transaction =
        existingResult.rows[0];

      /* =====================================================
         ALREADY SUCCESSFUL
      ===================================================== */

      if (
        transaction.status === "SUCCESS"
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

      /* =====================================================
         ALREADY FAILED
      ===================================================== */

      if (
        transaction.status === "FAILED"
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

      /* =====================================================
         ASK SASAPAY
      ===================================================== */

      const result =
        await querySTKPushStatus(
          checkoutRequestID
        );

      const resultCode =
        String(
          result.ResultCode ?? ""
        );

      const resultDesc =
        result.ResultDesc ||
        "";

      /* =====================================================
         SUCCESS
      ===================================================== */

      if (
        resultCode === "0" ||
        result.Paid === true
      ) {

        const receipt =
          result.MpesaReceiptNumber ||
          null;

        await pool.query(
          `
          UPDATE mpesa_transactions
          SET
            status = 'SUCCESS',
            transaction_id =
              COALESCE($1, transaction_id),
            result_code = '0',
            result_desc = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE checkout_request_id = $3
          `,
          [

            receipt,

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

      /* =====================================================
         FAILED
      ===================================================== */

      if (
        resultCode &&
        resultCode !== "0"
      ) {

        await pool.query(
          `
          UPDATE mpesa_transactions
          SET
            status = 'FAILED',
            result_code = $1,
            result_desc = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE checkout_request_id = $3
          AND status = 'PENDING'
          `,
          [

            resultCode,

            resultDesc ||
              "Payment failed.",

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
            "FAILED",

          transaction:
            updated.rows[0],

          result
        });
      }

      /* =====================================================
         STILL PENDING
      ===================================================== */

      return res.json({

        success: true,

        status:
          "PENDING",

        transaction,

        result
      });

    } catch (error) {

      console.error(
        "❌ Payment status route error:",
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
   SASAPAY CALLBACK
========================================================= */

router.post(
  "/callback",
  async (req, res) => {

    /*
      Acknowledge the callback immediately.
    */

    res.status(200).json({

      ResultCode: 0,

      ResultDesc:
        "Accepted"
    });

    try {

      const data =
        req.body || {};

      console.log(
        "📥 SasaPay callback received:"
      );

      console.log(
        JSON.stringify(
          data,
          null,
          2
        )
      );

      /* =====================================================
         VERIFY CALLBACK SIGNATURE
      ===================================================== */

      const signatureValid =
        verifySasaPaySignature(req);

      if (!signatureValid) {

        console.error(
          "❌ Invalid SasaPay callback signature."
        );

        return;
      }

      console.log(
        "✅ SasaPay callback signature verified."
      );

      /* =====================================================
         GET CHECKOUT REQUEST ID
      ===================================================== */

      const checkoutRequestID =
        data.CheckoutRequestID ||
        data.CheckoutRequestId ||
        data.checkoutRequestID ||
        data.checkoutRequestId;

      if (!checkoutRequestID) {

        console.warn(
          "⚠️ SasaPay callback missing CheckoutRequestID."
        );

        return;
      }

      /* =====================================================
         RESULT CODE
      ===================================================== */

      const resultCode =
        String(
          data.ResultCode ??
          data.resultCode ??
          data.responseCode ??
          ""
        );

      const resultDesc =
        data.ResultDesc ||
        data.ResultDescription ||
        data.ResponseDescription ||
        data.message ||
        "Payment result received.";

      /* =====================================================
         SUCCESS
      ===================================================== */

      if (
        resultCode === "0"
      ) {

        const transactionId =
          data.TransactionCode ||
          data.SasaPayTransactionCode ||
          data.sasapay_transaction_code ||
          data.ThirdPartyTransID ||
          data.ThirdPartyTransactionCode ||
          data.BillRefNumber ||
          null;

        await pool.query(
          `
          UPDATE mpesa_transactions
          SET
            status = 'SUCCESS',
            transaction_id =
              COALESCE($1, transaction_id),
            result_code = '0',
            result_desc = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE checkout_request_id = $3
          `,
          [

            transactionId,

            resultDesc,

            checkoutRequestID
          ]
        );

        console.log(
          "✅ SasaPay payment confirmed:",
          checkoutRequestID
        );

        return;
      }

      /* =====================================================
         FAILED
      ===================================================== */

      if (
        resultCode &&
        resultCode !== "0"
      ) {

        await pool.query(
          `
          UPDATE mpesa_transactions
          SET
            status = 'FAILED',
            result_code = $1,
            result_desc = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE checkout_request_id = $3
          AND status = 'PENDING'
          `,
          [

            resultCode,

            resultDesc,

            checkoutRequestID
          ]
        );

        console.log(
          "❌ SasaPay payment failed:",
          checkoutRequestID,
          resultCode,
          resultDesc
        );
      }

    } catch (error) {

      console.error(
        "❌ SasaPay callback processing error:",
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
