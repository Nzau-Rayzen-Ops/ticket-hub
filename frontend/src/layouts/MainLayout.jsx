import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SupportButton from "../components/SupportButton";

export default function MainLayout() {
  return (
    <div className="app">
      <Navbar />

      <main>
        <Outlet />
      </main>

      <Footer />

      <SupportButton />
    </div>
  );
}
