export default function AutomaticMembershipIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -4 24 28"
      fill="currentColor"
      style={{ flexShrink: 0, verticalAlign: "middle", marginTop: "-0.3em" }}
    >
      {/* Antenna */}
      <line x1="12" y1="4" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="-1" r="1.5" />
      {/* Square head */}
      <rect x="7" y="4" width="10" height="9" rx="2" />
      {/* Body */}
      <path d="M12 15c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z" />
    </svg>
  );
}
