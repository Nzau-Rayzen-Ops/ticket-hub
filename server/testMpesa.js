// server/testMpesa.js
const { getAccessToken } = require("./services/mpesaService");

async function test() {
  console.log("🔑 Testing M-Pesa connection...");
  try {
    const token = await getAccessToken();
    console.log("✅ SUCCESS! Access Token received:", token.slice(0, 20) + "...");
  } catch (error) {
    console.error("❌ FAILED:", error.message);
    console.log("🔴 Check that your Consumer Key and Secret are correct.");
  }
}

test();