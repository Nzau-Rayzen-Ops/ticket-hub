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

  const verifySignature =
    String(
      process.env.SASAPAY_VERIFY_CALLBACK_SIGNATURE || "false"
    ).toLowerCase() === "true";

  /*
    IMPORTANT:
    SasaPay callbacks currently reaching this application
    do not contain X-SasaPay-Signature.

    Therefore signature verification is disabled by default.

    To enable it later:
      SASAPAY_VERIFY_CALLBACK_SIGNATURE=true
  */

  if (!verifySignature) {

    console.log(
      "ℹ️ SasaPay callback signature verification is disabled."
    );

    return true;
  }

  const signature =
    req.get("X-SasaPay-Signature");

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

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    const receivedBuffer =
      Buffer.from(
        String(signature),
        "utf8"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
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
        transactionDesc
      } = req.body;

      if (!phoneNumber) {

        return res.status(400).json({
          success: false,
          message: "Phone number is required."
        });
      }

      if (
        amount === undefined ||
        amount === null ||
        Number(amount) <= 0
      ) {

        return res.status(400).json({
          success: false,
          message: "A valid payment amount is required."
        });
      }

      if (!accountReference) {

        return res.status(400).json({
          success: false,
          message: "Account reference is required."
        });
      }

      console.log(
        "📲 Initiating SasaPay STK Push..."
      );

      const result =
        await initiateSTKPush({
          phoneNumber,
          amount,
          accountReference,
          transactionDesc:
            transactionDesc ||
            "TicketHub Payment"
        });

      console.log(
        "✅ SasaPay STK Push response:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      const checkoutRequestID =
        result.checkoutRequestID ||
        result.CheckoutRequestID ||
        result.checkout_request_id;

      const merchantRequestID =
        result.merchantRequestID ||
        result.MerchantRequestID ||
        result.merchant_request_id ||
        accountReference;

      if (!checkoutRequestID) {

        return res.status(500).json({

          success: false,

          message:
            "SasaPay did not return a CheckoutRequestID.",

          response: result
        });
      }

      /*
        Save the transaction immediately.
      */

      const transactionResult =
        await pool.query(
          `
          INSERT INTO mpesa_transactions (
            checkout_request_id,
            merchant_request_id,
            phone_number,
            amount,
            account_reference,
            status,
            transaction_desc
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'PENDING',
            $6
          )
          ON CONFLICT (checkout_request_id)
          DO UPDATE SET
            merchant_request_id =
              EXCLUDED.merchant_request_id,

            phone_number =
              EXCLUDED.phone_number,

            amount =
              EXCLUDED.amount,

            account_reference =
              EXCLUDED.account_reference,

            transaction_desc =
              EXCLUDED.transaction_desc,

            updated_at =
              CURRENT_TIMESTAMP

          RETURNING *
          `,
          [
            checkoutRequestID,
            merchantRequestID,
            phoneNumber,
            Number(amount),
            accountReference,
            transactionDesc ||
              "TicketHub Payment"
          ]
        );

      return res.json({

        success: true,

        message:
          result.message ||
          "Success",

        checkoutRequestID,

        merchantRequestID,

        customerMessage:
          result.customerMessage ||
          "MPESA STK sent. Enter your PIN",

        transaction:
          transactionResult.rows[0]
      });

    } catch (error) {

      console.error(
        "❌ SasaPay STK Push error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message ||
          "Failed to initiate M-Pesa payment."
      });
    }
  }
);

/* =========================================================
   CHECK TRANSACTION STATUS
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
          error.message ||
          "Failed to get transaction."
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
      Acknowledge SasaPay immediately.
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
        "✅ SasaPay callback accepted."
      );

      /* =====================================================
         GET CHECKOUT REQUEST ID
      ===================================================== */

      const checkoutRequestID =
        data.CheckoutRequestID ||
        data.CheckoutRequestId ||
        data.checkoutRequestID ||
        data.checkoutRequestId;

      /*
        Some SasaPay callback formats may not return the
        CheckoutRequestID.

        In that situation try the merchant reference.
      */

      const paymentReference =
        data.BillRefNumber ||
        data.account_reference ||
        data.AccountReference ||
        data.MerchantReference ||
        data.TransactionReference ||
        null;

      if (!checkoutRequestID) {

        console.warn(
          "⚠️ SasaPay callback has no CheckoutRequestID."
        );

        /*
          Try to locate transaction using BillRefNumber.
        */

        if (paymentReference) {

          const lookup =
            await pool.query(
              `
              SELECT *
              FROM mpesa_transactions
              WHERE account_reference = $1
              ORDER BY created_at DESC
              LIMIT 1
              `,
              [
                paymentReference
              ]
            );

          if (
            lookup.rows.length === 0
          ) {

            console.warn(
              "⚠️ No transaction found using payment reference:",
              paymentReference
            );

            return;
          }

          /*
            Continue using the database transaction.
          */

          const transaction =
            lookup.rows[0];

          const resultCode =
            String(
              data.ResultCode ??
              data.resultCode ??
              data.responseCode ??
              "0"
            );

          const resultDesc =
            data.ResultDesc ||
            data.ResultDescription ||
            data.ResponseDescription ||
            data.message ||
            "Payment result received.";

          const transactionId =
            data.TransactionCode ||
            data.SasaPayTransactionCode ||
            data.sasapay_transaction_code ||
            data.ThirdPartyTransID ||
            data.ThirdPartyTransactionCode ||
            null;

          if (
            resultCode === "0"
          ) {

            await pool.query(
              `
              UPDATE mpesa_transactions
              SET
                status = 'SUCCESS',

                transaction_id =
                  COALESCE($1, transaction_id),

                result_code = '0',

                result_desc = $2,

                updated_at =
                  CURRENT_TIMESTAMP

              WHERE id = $3
              `,
              [
                transactionId,
                resultDesc,
                transaction.id
              ]
            );

            console.log(
              "✅ SasaPay payment confirmed using account reference:",
              paymentReference
            );

          } else {

            await pool.query(
              `
              UPDATE mpesa_transactions
              SET
                status = 'FAILED',

                result_code = $1,

                result_desc = $2,

                updated_at =
                  CURRENT_TIMESTAMP

              WHERE id = $3
              AND status = 'PENDING'
              `,
              [
                resultCode,
                resultDesc,
                transaction.id
              ]
            );

            console.log(
              "❌ SasaPay payment failed:",
              paymentReference,
              resultCode,
              resultDesc
            );
          }

          return;
        }

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
         TRANSACTION ID
      ===================================================== */

      const transactionId =
        data.TransactionCode ||
        data.SasaPayTransactionCode ||
        data.sasapay_transaction_code ||
        data.ThirdPartyTransID ||
        data.ThirdPartyTransactionCode ||
        null;

      /* =====================================================
         SUCCESS
      ===================================================== */

      if (
        resultCode === "0"
      ) {

        const updateResult =
          await pool.query(
            `
            UPDATE mpesa_transactions
            SET
              status = 'SUCCESS',

              transaction_id =
                COALESCE($1, transaction_id),

              result_code = '0',

              result_desc = $2,

              updated_at =
                CURRENT_TIMESTAMP

            WHERE checkout_request_id = $3

            RETURNING *
            `,
            [
              transactionId,
              resultDesc,
              checkoutRequestID
            ]
          );

        if (
          updateResult.rows.length === 0
        ) {

          console.warn(
            "⚠️ Callback received but transaction was not found:",
            checkoutRequestID
          );

          return;
        }

        console.log(
          "✅ SasaPay payment confirmed:",
          checkoutRequestID
        );

        console.log(
          "💰 Transaction ID:",
          transactionId
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

            updated_at =
              CURRENT_TIMESTAMP

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

        return;
      }

      /*
        If SasaPay does not provide a result code,
        log the callback without incorrectly marking
        it as successful.
      */

      console.warn(
        "⚠️ SasaPay callback did not contain a recognizable ResultCode."
      );

    } catch (error) {

      console.error(
        "❌ SasaPay callback processing error:",
        error
      );
    }
  }
);

module.exports = router;
