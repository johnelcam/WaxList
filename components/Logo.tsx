export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="16" y="8" width="56" height="80" rx="10" fill="#edf0a2" />
      <rect x="30" y="20" width="56" height="72" rx="10" fill="#dc4f1e" stroke="#181a0b" strokeWidth="5" />
      <circle cx="58" cy="56" r="13" fill="#edf0a2" />
    </svg>
  );
}
