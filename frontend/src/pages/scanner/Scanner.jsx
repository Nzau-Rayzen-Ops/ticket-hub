import { useEffect, useRef, useState } from "react";
import {
  Html5QrcodeScanner,
  Html5Qrcode
} from "html5-qrcode";

export default function Scanner() {

  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [qrToken, setQrToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [requiresCode, setRequiresCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const fileInputRef = useRef(null);


  /* =========================
     STEP 1
     VERIFY QR
  ========================= */

  const verifyQr = async (decodedText) => {

    try {

      setScanning(false);
      setUploading(false);

      let token = decodedText;

      /*
        Ticket QR codes are generated as:

        {
          "type": "TICKETHUB_ENTRY",
          "token": "ACTUAL_QR_TOKEN"
        }

        Older QR codes may potentially contain:

        {
          "qrToken": "..."
        }

        We support both formats.
      */

      try {

        const qrData = JSON.parse(decodedText);

        if (
          qrData &&
          typeof qrData === "object"
        ) {

          if (
            typeof qrData.token === "string" &&
            qrData.token.trim()
          ) {

            token = qrData.token;

          } else if (
            typeof qrData.qrToken === "string" &&
            qrData.qrToken.trim()
          ) {

            token = qrData.qrToken;

          } else if (
            typeof qrData.ticketId === "string" &&
            qrData.ticketId.trim()
          ) {

            /*
              Do NOT normally use ticketId for verification.
              This is only here so the scanner can give
              a clearer error instead of sending invalid JSON.
            */

            setResult({
              valid: false,
              requiresCode: false,
              message:
                "This QR code contains a ticket ID instead of the secure QR token."
            });

            return;
          }

        }

      } catch {
        /*
          QR is plain text.
          Use the decoded value directly.
        */
      }

      token = String(token).trim();

      if (!token) {

        setResult({
          valid: false,
          requiresCode: false,
          message: "Invalid QR code."
        });

        return;
      }

      console.log(
        "?? Sending QR token to server:",
        token
      );

      const response = await fetch(
        "/api/tickets/verify",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            qrToken: token
          })
        }
      );

      let data;

      try {

        data = await response.json();

      } catch {

        data = {
          valid: false,
          requiresCode: false,
          message:
            "The ticket server returned an invalid response."
        };

      }

      console.log(
        "?? QR verification response:",
        data
      );

      if (
        data.requiresCode === true
      ) {

        setQrToken(token);

        setRequiresCode(true);

        setResult(data);

        return;
      }

      setResult({
        ...data
      });

    } catch (error) {

      console.error(
        "QR verification error:",
        error
      );

      setResult({
        valid: false,
        requiresCode: false,
        message:
          "Unable to connect to the ticket server."
      });

    }
  };


  /* =========================
     STEP 2
     VERIFY 6-DIGIT CODE
  ========================= */

  const verifyCode = async () => {

    if (!verificationCode) {

      setResult({
        valid: false,
        requiresCode: true,
        message:
          "Please enter the 6-digit verification code."
      });

      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {

      setResult({
        valid: false,
        requiresCode: true,
        message:
          "Verification code must be exactly 6 digits."
      });

      return;
    }

    if (!qrToken) {

      setResult({
        valid: false,
        requiresCode: false,
        message:
          "QR token is missing. Please scan the ticket again."
      });

      return;
    }

    try {

      setVerifyingCode(true);

      const response = await fetch(
        "/api/tickets/verify-code",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            qrToken,
            verificationCode
          })
        }
      );

      let data;

      try {

        data = await response.json();

      } catch {

        data = {
          valid: false,
          message:
            "The ticket server returned an invalid response."
        };

      }

      console.log(
        "?? Verification code response:",
        data
      );

      setResult(data);

      if (data.valid) {

        setRequiresCode(false);
        setVerificationCode("");

      }

    } catch (error) {

      console.error(
        "Code verification error:",
        error
      );

      setResult({
        valid: false,
        requiresCode: true,
        message:
          "Unable to connect to the ticket server."
      });

    } finally {

      setVerifyingCode(false);

    }
  };


  /* =========================
     QR CAMERA SCANNER
  ========================= */

  useEffect(() => {

    if (!scanning) {
      return;
    }

    const scanner =
      new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,

          qrbox: {
            width: 250,
            height: 250
          }
        },
        false
      );

    scanner.render(
      (decodedText) => {

        verifyQr(decodedText);

        scanner
          .clear()
          .catch(() => {});

      },
      () => {}
    );

    return () => {

      scanner
        .clear()
        .catch(() => {});

    };

  }, [scanning]);


  /* =========================
     QR IMAGE UPLOAD
  ========================= */

  const handleFileUpload = async (event) => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {

      setScanning(false);
      setUploading(true);
      setResult(null);

      const html5QrCode =
        new Html5Qrcode(
          "qr-file-reader"
        );

      const decodedText =
        await html5QrCode.scanFile(
          file,
          true
        );

      await html5QrCode.clear();

      await verifyQr(decodedText);

    } catch (error) {

      console.error(
        "QR image scan error:",
        error
      );

      setUploading(false);

      setResult({
        valid: false,
        requiresCode: false,
        message:
          "Could not read the QR code from this image. Make sure the QR code is clear and fully visible."
      });

    }
  };


  /* =========================
     CHOOSE FILE
  ========================= */

  const chooseFile = () => {

    fileInputRef.current?.click();

  };


  /* =========================
     SCAN AGAIN
  ========================= */

  const scanAgain = () => {

    setResult(null);

    setScanning(true);

    setUploading(false);

    setQrToken("");

    setVerificationCode("");

    setRequiresCode(false);

    setVerifyingCode(false);

    if (fileInputRef.current) {

      fileInputRef.current.value = "";

    }
  };


  return (

    <div className="scanner-page">

      <div className="scanner-card">

        <p className="scanner-label">
          TICKETHUB SCANNER
        </p>

        <h1>
          Ticket Verification
        </h1>

        <p>
          Scan the customer's ticket QR code.
        </p>


        {/* =========================
            QR SCANNER
        ========================= */}

        {scanning && (

          <>

            <div id="qr-reader"></div>

            <div
              style={{
                marginTop: "20px",
                textAlign: "center"
              }}
            >

              <p>
                Camera not working?
              </p>

              <button
                className="ticket-button"
                onClick={chooseFile}
              >
                Upload QR Code
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{
                  display: "none"
                }}
              />

            </div>

          </>

        )}


        {/* =========================
            READING QR
        ========================= */}

        {uploading && (

          <div
            style={{
              textAlign: "center",
              marginTop: "20px"
            }}
          >

            <h3>
              Reading QR Code...
            </h3>

            <p>
              Please wait.
            </p>

          </div>

        )}


        <div
          id="qr-file-reader"
          style={{
            display: "none"
          }}
        ></div>


        {/* =========================
            STEP 2 — CODE ENTRY
        ========================= */}

        {requiresCode && (

          <div
            style={{
              marginTop: "25px",
              textAlign: "center"
            }}
          >

            <div
              className="scan-result"
            >

              <div className="scan-status-icon">
                ?
              </div>

              <h2>
                QR CODE RECOGNIZED
              </h2>

              <p>
                {result?.message}
              </p>


              {result?.ticket && (

                <div
                  className="scan-ticket-details"
                >

                  <p>

                    <strong>
                      Event:
                    </strong>

                    <br />

                    {result.ticket.event_title}

                  </p>


                  <p>

                    <strong>
                      Ticket Type:
                    </strong>

                    <br />

                    {result.ticket.ticket_type}

                  </p>


                  <p>

                    <strong>
                      Quantity:
                    </strong>

                    <br />

                    {result.ticket.quantity}

                  </p>

                </div>

              )}


              <div
                style={{
                  marginTop: "20px"
                }}
              >

                <label
                  htmlFor="verification-code"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600"
                  }}
                >
                  Enter 6-digit email code
                </label>

                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => {

                    const value =
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                    setVerificationCode(value);

                  }}
                  placeholder="000000"
                  style={{
                    width: "100%",
                    maxWidth: "250px",
                    padding: "14px",
                    fontSize: "24px",
                    textAlign: "center",
                    letterSpacing: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "8px"
                  }}
                />

              </div>


              <button
                className="ticket-button"
                onClick={verifyCode}
                disabled={
                  verifyingCode ||
                  verificationCode.length !== 6
                }
                style={{
                  marginTop: "15px"
                }}
              >

                {verifyingCode
                  ? "Verifying..."
                  : "Verify & Allow Entry"}

              </button>

            </div>

          </div>

        )}


        {/* =========================
            FINAL RESULT
        ========================= */}

        {result &&
          !requiresCode && (

          <div
            className={
              result.valid
                ? "scan-result valid"
                : "scan-result invalid"
            }
          >

            <div className="scan-status-icon">

              {result.valid
                ? "?"
                : "?"}

            </div>


            <h2>

              {result.valid
                ? "VALID TICKET"
                : "INVALID TICKET"}

            </h2>


            <p>
              {result.message}
            </p>


            {result.ticket && (

              <div
                className="scan-ticket-details"
              >

                <p>

                  <strong>
                    Ticket ID:
                  </strong>

                  <br />

                  {result.ticket.ticket_id}

                </p>


                <p>

                  <strong>
                    Event:
                  </strong>

                  <br />

                  {result.ticket.event_title}

                </p>


                <p>

                  <strong>
                    Customer:
                  </strong>

                  <br />

                  {result.ticket.customer_name}

                </p>


                <p>

                  <strong>
                    Ticket Type:
                  </strong>

                  <br />

                  {result.ticket.ticket_type}

                </p>


                <p>

                  <strong>
                    Quantity:
                  </strong>

                  <br />

                  {result.ticket.quantity}

                </p>


                <p>

                  <strong>
                    Payment:
                  </strong>

                  <br />

                  {result.ticket.payment_status}

                </p>


                <p>

                  <strong>
                    Status:
                  </strong>

                  <br />

                  {result.ticket.ticket_status}

                </p>

              </div>

            )}


            <button
              className="ticket-button"
              onClick={scanAgain}
            >
              Scan Another Ticket
            </button>

          </div>

        )}

      </div>

    </div>

  );
}
