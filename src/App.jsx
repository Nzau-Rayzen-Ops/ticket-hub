import { Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import Ticket from "./pages/Ticket";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EventsManagement from "./pages/admin/EventsManagement";
import CreateEvent from "./pages/admin/CreateEvent";
import EditEvent from "./pages/admin/EditEvent";
import Orders from "./pages/admin/Orders";
import Tickets from "./pages/admin/Tickets";

import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

import Scanner from "./pages/scanner/Scanner";
import ScanResult from "./pages/scanner/ScanResult";


export default function App() {
  return (
    <Routes>

      {/* =========================
          PUBLIC CUSTOMER AREA
      ========================= */}

      <Route element={<MainLayout />}>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/events"
          element={<Events />}
        />

        <Route
          path="/events/:id"
          element={<EventDetails />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        <Route
          path="/payment"
          element={<Payment />}
        />

        <Route
          path="/payment/success"
          element={<PaymentSuccess />}
        />

        <Route
          path="/payment/failed"
          element={<PaymentFailed />}
        />

        <Route
          path="/ticket"
          element={<Ticket />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="*"
          element={<NotFound />}
        />

      </Route>


      {/* =========================
          ADMIN LOGIN
      ========================= */}

      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />


      {/* =========================
          PROTECTED ADMIN AREA
      ========================= */}

      <Route element={<ProtectedAdminRoute />}>

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/events"
          element={<EventsManagement />}
        />

        <Route
          path="/admin/events/create"
          element={<CreateEvent />}
        />

        <Route
          path="/admin/events/edit/:id"
          element={<EditEvent />}
        />

        <Route
          path="/admin/orders"
          element={<Orders />}
        />

        <Route
          path="/admin/tickets"
          element={<Tickets />}
        />

      </Route>


      {/* =========================
          SCANNER
      ========================= */}

      <Route
        path="/scanner"
        element={<Scanner />}
      />

      <Route
        path="/scanner/result"
        element={<ScanResult />}
      />

    </Routes>
  );
}