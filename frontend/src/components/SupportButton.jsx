export default function SupportButton() {
  const whatsappNumber = "254758157516";

  const message = encodeURIComponent(
    "Hi TicketHub, I need some help."
  );

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="support-button"
      aria-label="Contact TicketHub support on WhatsApp"
    >
      <span className="support-icon">??</span>
      <span>Support</span>
    </a>
  );
}
