import {
  Navigate,
  Outlet,
  useLocation
} from "react-router-dom";

import {
  useEffect,
  useState
} from "react";


export default function ProtectedAdminRoute() {

  const location =
    useLocation();


  const [
    checking,
    setChecking
  ] = useState(true);


  const [
    authenticated,
    setAuthenticated
  ] = useState(false);


  useEffect(() => {

    let mounted = true;


    async function checkAdminSession() {

      try {

        const response =
          await fetch(
            "/api/admin/session",
            {
              method: "GET",
              credentials: "include"
            }
          );


        const data =
          await response.json();


        console.log(
          "Admin session:",
          response.status,
          data
        );


        if (!mounted) {
          return;
        }


        if (
          response.ok &&
          data.authenticated === true
        ) {

          setAuthenticated(true);

        } else {

          setAuthenticated(false);

        }


      } catch (error) {

        console.error(
          "Admin session check failed:",
          error
        );


        if (mounted) {
          setAuthenticated(false);
        }


      } finally {

        if (mounted) {
          setChecking(false);
        }

      }

    }


    checkAdminSession();


    return () => {
      mounted = false;
    };

  }, []);


  /* =========================
     CHECKING
  ========================= */

  if (checking) {

    return (

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >

        <p>
          Checking admin access...
        </p>

      </div>

    );

  }


  /* =========================
     NOT AUTHENTICATED
  ========================= */

  if (!authenticated) {

    return (

      <Navigate
        to="/admin/login"
        replace

        state={{
          from:
            location.pathname
        }}
      />

    );

  }


  /* =========================
     AUTHENTICATED
  ========================= */

  return <Outlet />;

}
