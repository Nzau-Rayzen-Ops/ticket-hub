import {
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";


export default function AdminLogin() {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const [
    email,
    setEmail
  ] = useState("");


  const [
    password,
    setPassword
  ] = useState("");


  const [
    loading,
    setLoading
  ] = useState(false);


  const [
    error,
    setError
  ] = useState("");


  async function handleSubmit(event) {

    event.preventDefault();

    setError("");
    setLoading(true);


    try {

      const response =
        await fetch(
          "http://localhost:5000/api/admin/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials: "include",

            body:
              JSON.stringify({
                email:
                  email.trim(),

                password
              })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Admin login failed."
        );

      }


      /*
        Verify that the newly-created
        admin session can actually be
        read by the browser.
      */

      const sessionResponse =
        await fetch(
          "http://localhost:5000/api/admin/session",
          {
            method: "GET",
            credentials: "include"
          }
        );


      const sessionData =
        await sessionResponse.json();


      if (!sessionResponse.ok) {

        console.error(
          "Login succeeded but session check failed:",
          sessionData
        );

        throw new Error(
          "Login succeeded, but the admin session could not be established. Please try again."
        );
      }


      console.log(
        "Admin authenticated:",
        sessionData
      );


      const destination =
        location.state?.from ||
        "/admin";


      navigate(
        destination,
        {
          replace: true
        }
      );


    } catch (error) {

      console.error(
        "Admin login error:",
        error
      );


      setError(
        error.message ||
        "Unable to sign in."
      );


    } finally {

      setLoading(false);

    }

  }


  return (

    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >

      <form
        onSubmit={handleSubmit}

        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "30px",
          borderRadius: "12px",
          background: "#fff",
          boxShadow:
            "0 5px 25px rgba(0,0,0,0.1)"
        }}
      >

        <h1>
          Admin Login
        </h1>


        <p>
          Authorized personnel only.
        </p>


        {error && (

          <div
            style={{
              color: "#b00020",
              background: "#ffe8e8",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "15px"
            }}
          >
            {error}
          </div>

        )}


        <div
          style={{
            marginBottom: "15px"
          }}
        >

          <label>
            Email
          </label>


          <input
            type="email"
            value={email}

            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }

            autoComplete="username"
            required

            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              boxSizing: "border-box"
            }}
          />

        </div>


        <div
          style={{
            marginBottom: "20px"
          }}
        >

          <label>
            Password
          </label>


          <input
            type="password"
            value={password}

            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }

            autoComplete="current-password"
            required

            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              boxSizing: "border-box"
            }}
          />

        </div>


        <button
          type="submit"
          disabled={loading}

          style={{
            width: "100%",
            padding: "12px",
            cursor:
              loading
                ? "not-allowed"
                : "pointer"
          }}
        >

          {loading
            ? "Signing in..."
            : "Admin Sign In"}

        </button>

      </form>

    </div>

  );

}