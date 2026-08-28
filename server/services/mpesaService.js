const axios = require("axios");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", ".env")
});

/* =========================================================
   SASAPAY CONFIGURATION
========================================================= */

const SASAPAY_BASE_URL =
  process.env.SASAPAY_ENVIRONMENT === "production"
    ? "https://sasapay.app"
    : "https://sandbox.sasapay.app";

const CLIENT_ID =
  process.env.SASAPAY_CLIENT_ID;

const CLIENT_SECRET =
  process.env.SASAPAY_CLIENT_SECRET;

const MERCHANT_CODE =
  process.env.SASAPAY_MERCHANT_CODE;

/* =========================================================
   VALIDATE CONFIG
========================================================= */

function validateConfig() {

  const missing = [];

  if (!CLIENT_ID) {
    missing.push("SASAPAY_CLIENT_ID");
  }

  if (!CLIENT_SECRET) {
    missing.push("SASAPAY_CLIENT_SECRET");
  }

  if (!MERCHANT_CODE) {
    missing.push("SASAPAY_MERCHANT_CODE");
  }

  if (missing.length > 0) {

    throw new Error(
      `Missing SasaPay configuration: ${missing.join(", ")}`
    );
  }
}

/* =========================================================
   FORMAT PHONE
========================================================= */

function formatPhoneNumber(phoneNumber) {

  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  let phone =
    String(phoneNumber)
      .replace(/\D/g, "");

  if (phone.startsWith("0")) {

    phone =
      "254" +
      phone.substring(1);

  } else if (
    phone.startsWith("7") ||
    phone.startsWith("1")
  ) {

    phone =
      "254" +
      phone;
  }

  if (!/^254[0-9]{9}$/.test(phone)) {

    throw new Error(
      "Invalid Kenyan phone number. Use a number such as 0712345678."
    );
  }

  return phone;
}

/* =========================================================
   GET SASAPAY ACCESS TOKEN
========================================================= */

async function getAccessToken() {

  validateConfig();

  const credentials =
    Buffer.from(
      `${CLIENT_ID}:${CLIENT_SECRET}`
    ).toString("base64");

  try {

    const response =
      await axios.get(
        `${SASAPAY_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization:
              `Basic ${credentials}`
          },
          timeout: 30000
        }
      );

    if (
      !response.data ||
      !response.data.access_token
    ) {

      throw new Error(
        "SasaPay did not return an access token."
      );
    }

    return response.data.access_token;

  } catch (error) {

    console.error(
      "❌ SasaPay authentication error:",
      error.response?.data ||
      error.message
    );

    throw new Error(
      "Failed to authenticate with SasaPay."
    );
  }
}

/* =========================================================
   INITIATE PAYMENT
========================================================= */

async function initiateSTKPush(
  phoneNumber,
  amount,
  accountReference,
  transactionDesc
) {

  validateConfig();

  const token =
    await getAccessToken();

  const formattedPhone =
    formatPhoneNumber(phoneNumber);

  const numericAmount =
    Math.round(Number(amount));

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {

    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  const backendUrl =
    process.env.BACKEND_URL;

  if (!backendUrl) {

    throw new Error(
      "BACKEND_URL is not configured."
    );
  }

  const callbackUrl =
    `${backendUrl.replace(/\/$/, "")}/api/mpesa/callback`;

  const reference =
    String(
      accountReference || "TICKET"
    )
      .replace(
        /[^A-Za-z0-9]/g,
        ""
      )
      .substring(0, 50);

  const narration =
    String(
      transactionDesc || "Ticket Payment"
    )
      .substring(0, 50);

  /*
    SasaPay payment request.

    The customer phone is supplied to SasaPay
    and SasaPay handles the payment prompt.
  */

  const payload = {

    MerchantCode:
      MERCHANT_CODE,

    Amount:
      numericAmount,

    PhoneNumber:
      formattedPhone,

    TransactionReference:
      reference,

    CallBackUrl:
      callbackUrl,

    Narration:
      narration
  };

  try {

    console.log(
      "========================================"
    );

    console.log(
      "Sending SasaPay payment request"
    );

    console.log(
      "Phone:",
      formattedPhone
    );

    console.log(
      "Amount:",
      numericAmount
    );

    console.log(
      "Reference:",
      reference
    );

    console.log(
      "Callback:",
      callbackUrl
    );

    console.log(
      "========================================"
    );

    const response =
      await axios.post(
        `${SASAPAY_BASE_URL}/payments/request-payment`,
        payload,
        {
          headers: {

            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json"
          },

          timeout: 30000
        }
      );

    console.log(
      "SasaPay payment response:",
      response.data
    );

    /*
      Normalize the response so the rest of
      your existing application does not need
      to know the SasaPay response structure.
    */

    const data =
      response.data || {};

    const checkoutRequestID =
      data.CheckoutRequestID ||
      data.CheckoutRequestId ||
      data.checkoutRequestID ||
      data.checkoutRequestId ||
      data.MerchantRequestID ||
      data.merchantRequestId;

    if (!checkoutRequestID) {

      throw new Error(
        data.message ||
        data.detail ||
        data.ResponseDescription ||
        "SasaPay did not return a payment request ID."
      );
    }

    return {

      CheckoutRequestID:
        checkoutRequestID,

      MerchantRequestID:
        data.MerchantRequestID ||
        data.merchantRequestId ||
        "",

      ResponseCode:
        data.ResponseCode ||
        data.responseCode ||
        "0",

      ResponseDescription:
        data.ResponseDescription ||
        data.message ||
        data.detail ||
        "Payment request sent.",

      CustomerMessage:
        data.CustomerMessage ||
        data.message ||
        "Please check your phone and complete the payment.",

      raw:
        data
    };

  } catch (error) {

    console.error(
      "❌ SasaPay payment error:",
      error.response?.data ||
      error.message
    );

    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.response?.data?.ResponseDescription ||
      error.message ||
      "SasaPay payment initiation failed.";

    throw new Error(message);
  }
}

/* =========================================================
   QUERY PAYMENT STATUS
========================================================= */

async function querySTKPushStatus(
  checkoutRequestID
) {

  validateConfig();

  if (!checkoutRequestID) {

    throw new Error(
      "Checkout Request ID is required."
    );
  }

  const token =
    await getAccessToken();

  try {

    const response =
      await axios.post(
        `${SASAPAY_BASE_URL}/api/v2/waas/transactions/status/`,
        {

          merchantCode:
            MERCHANT_CODE,

          checkoutRequestId:
            checkoutRequestID

        },
        {
          headers: {

            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json"
          },

          timeout: 30000
        }
      );

    console.log(
      "SasaPay status response:",
      response.data
    );

    const responseData =
      response.data || {};

    const data =
      responseData.data ||
      responseData;

    /*
      Convert SasaPay status into the same
      structure your existing route expects.
    */

    return {

      ResultCode:
        data.ResultCode ??
        responseData.responseCode ??
        "",

      ResultDesc:
        data.ResultDescription ||
        data.ResultDesc ||
        responseData.message ||
        "Payment status received.",

      MpesaReceiptNumber:
        data.TransactionCode ||
        data.SasaPayTransactionCode ||
        null,

      Paid:
        data.Paid,

      AmountPaid:
        data.AmountPaid,

      CheckoutRequestID:
        data.CheckoutRequestId ||
        checkoutRequestID,

      raw:
        responseData
    };

  } catch (error) {

    console.error(
      "❌ SasaPay status error:",
      error.response?.data ||
      error.message
    );

    throw new Error(
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Failed to check SasaPay payment status."
    );
  }
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

  initiateSTKPush,

  querySTKPushStatus,

  getAccessToken,

  formatPhoneNumber
};
