const axios = require("axios");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", ".env")
});

/* =========================================================
   SASAPAY CONFIGURATION
========================================================= */

const SASAPAY_ENVIRONMENT =
  String(process.env.SASAPAY_ENVIRONMENT || "sandbox")
    .trim()
    .toLowerCase();

const SASAPAY_BASE_URL =
  SASAPAY_ENVIRONMENT === "production"
    ? "https://sasapay.app"
    : "https://sandbox.sasapay.app";

const SASAPAY_WAAS_BASE_URL =
  `${SASAPAY_BASE_URL}/api/v2/waas`;

const SASAPAY_PAYMENT_BASE_URL =
  `${SASAPAY_BASE_URL}/api/v1`;

const CLIENT_ID =
  process.env.SASAPAY_CLIENT_ID;

const CLIENT_SECRET =
  process.env.SASAPAY_CLIENT_SECRET;

const MERCHANT_CODE =
  process.env.SASAPAY_MERCHANT_CODE;

/*
  SasaPay network code for M-Pesa Kenya.
*/
const MPESA_NETWORK_CODE = "63902";

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

  const authUrl =
    `${SASAPAY_BASE_URL}/api/v2/waas/auth/token/?grant_type=client_credentials`;

  try {

    console.log(
      `🔐 Requesting SasaPay access token (${SASAPAY_ENVIRONMENT})...`
    );

    console.log(
      "SasaPay auth URL:",
      authUrl
    );

    const response =
      await axios.get(
        authUrl,
        {
          headers: {
            Authorization:
              `Basic ${credentials}`,

            Accept:
              "application/json"
          },

          timeout: 30000
        }
      );

    if (
      !response.data ||
      !response.data.access_token
    ) {

      console.error(
        "❌ SasaPay authentication response:",
        response.data
      );

      throw new Error(
        "SasaPay did not return an access token."
      );
    }

    console.log(
      "✅ SasaPay authentication successful."
    );

    return response.data.access_token;

  } catch (error) {

    console.error(
      "❌ SasaPay authentication error:",
      error.response?.data ||
      error.message
    );

    throw new Error(
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Failed to authenticate with SasaPay."
    );
  }
}

/* =========================================================
   INITIATE SASAPAY M-PESA PAYMENT
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
    SasaPay C2B / M-Pesa payment request.
  */

  const payload = {

    MerchantCode:
      MERCHANT_CODE,

    NetworkCode:
      MPESA_NETWORK_CODE,

    Currency:
      "KES",

    Amount:
      numericAmount.toFixed(2),

    PhoneNumber:
      formattedPhone,

    AccountReference:
      reference,

    TransactionDesc:
      narration,

    CallBackURL:
      callbackUrl
  };

  const paymentUrl =
    `${SASAPAY_PAYMENT_BASE_URL}/payments/request-payment/`;

  try {

    console.log(
      "========================================"
    );

    console.log(
      "📲 SENDING SASAPAY M-PESA PAYMENT REQUEST"
    );

    console.log(
      "Environment:",
      SASAPAY_ENVIRONMENT
    );

    console.log(
      "Payment URL:",
      paymentUrl
    );

    console.log(
      "Merchant:",
      MERCHANT_CODE
    );

    console.log(
      "Network:",
      MPESA_NETWORK_CODE
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
        paymentUrl,
        payload,
        {
          headers: {

            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          timeout: 30000
        }
      );

    console.log(
      "📥 SasaPay payment response:",
      response.data
    );

    const data =
      response.data || {};

    if (
      data.status === false ||
      data.status === "false"
    ) {

      throw new Error(
        data.ResponseDescription ||
        data.detail ||
        data.message ||
        "SasaPay rejected the payment request."
      );
    }

    const checkoutRequestID =
      data.CheckoutRequestID ||
      data.CheckoutRequestId ||
      data.checkoutRequestID ||
      data.checkoutRequestId ||
      data.PaymentRequestID ||
      data.paymentRequestID;

    const merchantRequestID =
      data.MerchantRequestID ||
      data.MerchantRequestId ||
      data.merchantRequestID ||
      data.merchantRequestId ||
      "";

    const responseCode =
      data.ResponseCode ??
      data.responseCode ??
      "";

    const responseDescription =
      data.ResponseDescription ||
      data.ResponseDesc ||
      data.detail ||
      data.message ||
      "Payment request sent.";

    if (!checkoutRequestID) {

      console.error(
        "❌ SasaPay did not return a payment request ID:",
        data
      );

      throw new Error(
        responseDescription ||
        "SasaPay did not return a payment request ID."
      );
    }

    return {

      CheckoutRequestID:
        checkoutRequestID,

      MerchantRequestID:
        merchantRequestID,

      ResponseCode:
        String(responseCode),

      ResponseDescription:
        responseDescription,

      CustomerMessage:
        data.CustomerMessage ||
        data.customerMessage ||
        data.detail ||
        "Please check your phone and enter your M-Pesa PIN.",

      TransactionReference:
        data.TransactionReference ||
        data.transactionReference ||
        null,

      raw:
        data
    };

  } catch (error) {

    console.error(
      "❌ SasaPay payment request error:"
    );

    console.error(
      error.response?.data ||
      error.message
    );

    const providerData =
      error.response?.data || {};

    const message =
      providerData.ResponseDescription ||
      providerData.ResponseDesc ||
      providerData.detail ||
      providerData.message ||
      providerData.error ||
      error.message ||
      "SasaPay payment initiation failed.";

    throw new Error(message);
  }
}

/* =========================================================
   QUERY SASAPAY TRANSACTION STATUS
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

  const statusUrl =
    `${SASAPAY_WAAS_BASE_URL}/transactions/status/`;

  try {

    console.log(
      "🔎 Checking SasaPay payment status:",
      checkoutRequestID
    );

    const response =
      await axios.post(
        statusUrl,
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
              "application/json",

            Accept:
              "application/json"
          },

          timeout: 30000
        }
      );

    console.log(
      "📥 SasaPay status response:",
      response.data
    );

    const responseData =
      response.data || {};

    const data =
      responseData.data ||
      responseData;

    const resultCode =
      data.ResultCode ??
      data.responseCode ??
      responseData.responseCode ??
      "";

    const resultDescription =
      data.ResultDescription ||
      data.ResultDesc ||
      responseData.message ||
      data.message ||
      "Payment status received.";

    const paid =
      data.Paid === true ||
      data.Paid === "true" ||
      data.paid === true ||
      data.paid === "true";

    const transactionCode =
      data.TransactionCode ||
      data.SasaPayTransactionCode ||
      data.ThirdPartyTransactionCode ||
      data.MpesaReceiptNumber ||
      null;

    return {

      ResultCode:
        String(resultCode),

      ResultDesc:
        resultDescription,

      MpesaReceiptNumber:
        transactionCode,

      Paid:
        paid,

      AmountPaid:
        data.AmountPaid ??
        data.TransactionAmount ??
        data.amountPaid ??
        null,

      CheckoutRequestID:
        data.CheckoutRequestId ||
        data.CheckoutRequestID ||
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
