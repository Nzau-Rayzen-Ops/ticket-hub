// server/services/mpesaService.js

const axios = require("axios");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", ".env")
});

/* =========================================================
   SAFARICOM DARaja CONFIGURATION
========================================================= */

const API_URL =
  process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const CONSUMER_KEY =
  process.env.MPESA_CONSUMER_KEY;

const CONSUMER_SECRET =
  process.env.MPESA_CONSUMER_SECRET;

const PASSKEY =
  process.env.MPESA_PASSKEY;

const SHORTCODE =
  process.env.MPESA_SHORTCODE;

/* =========================================================
   VALIDATE CONFIG
========================================================= */

function validateConfig() {
  const missing = [];

  if (!CONSUMER_KEY) {
    missing.push("MPESA_CONSUMER_KEY");
  }

  if (!CONSUMER_SECRET) {
    missing.push("MPESA_CONSUMER_SECRET");
  }

  if (!PASSKEY) {
    missing.push("MPESA_PASSKEY");
  }

  if (!SHORTCODE) {
    missing.push("MPESA_SHORTCODE");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing M-Pesa configuration: ${missing.join(", ")}`
    );
  }
}

/* =========================================================
   FORMAT KENYAN PHONE NUMBER
========================================================= */

function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  let phone = String(phoneNumber)
    .replace(/\D/g, "");

  /*
    0712345678
    -> 254712345678
  */

  if (phone.startsWith("0")) {
    phone =
      "254" +
      phone.substring(1);
  }

  /*
    712345678
    -> 254712345678

    112345678
    -> 254112345678
  */

  else if (
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
   TIMESTAMP
========================================================= */

function getTimestamp() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  const hours =
    String(
      now.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes()
    ).padStart(2, "0");

  const seconds =
    String(
      now.getSeconds()
    ).padStart(2, "0");

  return (
    `${year}${month}${day}` +
    `${hours}${minutes}${seconds}`
  );
}

/* =========================================================
   ACCESS TOKEN
========================================================= */

async function getAccessToken() {
  validateConfig();

  const auth =
    Buffer.from(
      `${CONSUMER_KEY}:${CONSUMER_SECRET}`
    ).toString("base64");

  try {
    const response =
      await axios.get(
        `${API_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization:
              `Basic ${auth}`
          },

          timeout: 30000
        }
      );

    if (
      !response.data ||
      !response.data.access_token
    ) {
      throw new Error(
        "No access token returned by Safaricom."
      );
    }

    return response.data.access_token;

  } catch (error) {

    console.error(
      "M-Pesa access token error:",
      error.response?.data ||
      error.message
    );

    throw new Error(
      "Failed to get M-Pesa access token."
    );
  }
}

/* =========================================================
   INITIATE STK PUSH
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
    formatPhoneNumber(
      phoneNumber
    );

  const numericAmount =
    Math.round(
      Number(amount)
    );

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  const timestamp =
    getTimestamp();

  /*
    Safaricom password:
    Base64(
      BusinessShortCode +
      Passkey +
      Timestamp
    )
  */

  const password =
    Buffer.from(
      `${SHORTCODE}${PASSKEY}${timestamp}`
    ).toString("base64");

  /*
    Safaricom allows a limited-length
    AccountReference.

    Remove special characters.
  */

  const safeAccountReference =
    String(
      accountReference ||
      "TICKET"
    )
      .replace(
        /[^A-Za-z0-9]/g,
        ""
      )
      .substring(0, 12) ||
    "TICKET";

  /*
    TransactionDesc should be short.
  */

  const safeTransactionDesc =
    String(
      transactionDesc ||
      "Ticket"
    )
      .replace(
        /[^\w\s-]/g,
        ""
      )
      .substring(0, 13) ||
    "Ticket";

  /*
    IMPORTANT:

    This MUST be publicly reachable by
    Safaricom when deployed.

    Locally you can use Cloudflare Tunnel.
    On Railway this becomes:

    https://your-backend-domain/api/mpesa/callback
  */

  const backendUrl =
    process.env.BACKEND_URL;

  if (!backendUrl) {
    throw new Error(
      "BACKEND_URL is not configured."
    );
  }

  const callbackUrl =
    `${backendUrl.replace(/\/$/, "")}/api/mpesa/callback`;

  const payload = {

    BusinessShortCode:
      SHORTCODE,

    Password:
      password,

    Timestamp:
      timestamp,

    TransactionType:
      "CustomerPayBillOnline",

    Amount:
      numericAmount,

    PartyA:
      formattedPhone,

    PartyB:
      SHORTCODE,

    PhoneNumber:
      formattedPhone,

    CallBackURL:
      callbackUrl,

    AccountReference:
      safeAccountReference,

    TransactionDesc:
      safeTransactionDesc
  };

  try {

    console.log(
      "========================================"
    );

    console.log(
      "Sending M-Pesa STK Push"
    );

    console.log(
      "Environment:",
      process.env.MPESA_ENVIRONMENT ||
      "sandbox"
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
      "Account Reference:",
      safeAccountReference
    );

    console.log(
      "Callback URL:",
      callbackUrl
    );

    console.log(
      "========================================"
    );

    const response =
      await axios.post(
        `${API_URL}/mpesa/stkpush/v1/processrequest`,
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
      "STK Push response:",
      response.data
    );

    return response.data;

  } catch (error) {

    console.error(
      "STK Push error:",
      error.response?.data ||
      error.message
    );

    const message =
      error.response?.data?.errorMessage ||
      error.response?.data?.ResponseDescription ||
      error.response?.data?.error_description ||
      "M-Pesa payment initiation failed.";

    throw new Error(
      message
    );
  }
}

/* =========================================================
   QUERY STK PUSH
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

  const timestamp =
    getTimestamp();

  const password =
    Buffer.from(
      `${SHORTCODE}${PASSKEY}${timestamp}`
    ).toString("base64");

  const payload = {

    BusinessShortCode:
      SHORTCODE,

    Password:
      password,

    Timestamp:
      timestamp,

    CheckoutRequestID:
      checkoutRequestID
  };

  try {

    const response =
      await axios.post(
        `${API_URL}/mpesa/stkpushquery/v1/query`,
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
      "STK Query response:",
      response.data
    );

    return response.data;

  } catch (error) {

    console.error(
      "STK Query error:",
      error.response?.data ||
      error.message
    );

    const message =
      error.response?.data?.errorMessage ||
      error.response?.data?.ResponseDescription ||
      "Failed to query M-Pesa payment status.";

    throw new Error(
      message
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