export default function GroupIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="7" r="3.5" />
      <path d="M12 12c-4 0-7 2-7 4.5V18h14v-1.5c0-2.5-3-4.5-7-4.5z" />
      <circle cx="4.5" cy="9" r="2.5" opacity="0.6" />
      <path d="M4.5 13c-2.5 0-4.5 1.5-4.5 3.5V18h4v-1.5c0-1.5.7-2.8 1.8-3.8-.5-.2-1-.3-1.3-.3z" opacity="0.6" />
      <circle cx="19.5" cy="9" r="2.5" opacity="0.6" />
      <path d="M19.5 13c.3 0 .8.1 1.3.3 1.1 1 1.8 2.3 1.8 3.8V18h-4v-1.5c0-2-2-3.5-4.5-3.5h5.9z" opacity="0.6" />
    </svg>
  );
}
