import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="navbar">

        <Link to="/" className="brand">
          Ticket<span>Hub</span>
        </Link>

        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/events">Events</Link>
          
        </nav>

      </div>
    </header>
  );
}
