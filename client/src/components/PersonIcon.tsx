export default function PersonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M12 14c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z" />
    </svg>
  );
}
