const TEXTWAVE_API_URL = "https://api.textwave.co.ke/v1/sms/send";

async function sendTextwaveSMS(to, message) {
  const apiKey = process.env.TEXTWAVE_API_KEY;

  if (!apiKey) {
    throw new Error("TEXTWAVE_API_KEY is not configured.");
  }

  const response = await fetch(TEXTWAVE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `ApiKey ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      message
    })
  });

  const data = await response.json();

  if (!response.ok || data.status === "failed" || data.status === "error") {
    throw new Error(
      data.message || `Textwave SMS request failed with HTTP ${response.status}`
    );
  }

  return data;
}

module.exports = {
  sendTextwaveSMS
};
