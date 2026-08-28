// components/TicketHubLogo.jsx
export default function TicketHubLogo() {
  return (
    <svg 
      viewBox="0 0 200 50" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: '40px', width: 'auto' }}
    >
      {/* 3D Angular "TH" Icon - Metallic Gradient */}
      <g>
        {/* Back / shadow face of the T */}
        <path d="M10 8 L30 8 L30 18 L20 18 L20 42 L10 42 Z" fill="#666666" />
        
        {/* Front face of the T */}
        <path d="M8 6 L32 6 L32 16 L22 16 L22 44 L8 44 Z" fill="#e0e0e0" />
        
        {/* Right angled cut of the T */}
        <path d="M32 6 L38 12 L38 22 L32 16 Z" fill="#aaaaaa" />
        
        {/* Left bar of the H */}
        <path d="M32 20 L38 26 L38 46 L32 40 Z" fill="#999999" />
        
        {/* Right bar of the H - Darker for depth */}
        <path d="M44 22 L50 28 L50 48 L44 42 Z" fill="#555555" />
        
        {/* Crossbar of the H */}
        <path d="M38 30 L44 36 L44 32 L38 26 Z" fill="#cccccc" />
      </g>

      {/* "TicketHub" Text */}
      <text 
        x="58" 
        y="36" 
        fontFamily="'Segoe UI', Arial, sans-serif" 
        fontSize="28" 
        fontWeight="700" 
        letterSpacing="0.5"
      >
        <tspan fill="#ffffff">Ticket</tspan>
        <tspan fill="#aaaaaa">Hub</tspan>
      </text>
    </svg>
  );
}
