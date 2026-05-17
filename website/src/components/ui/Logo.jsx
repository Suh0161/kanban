let _id = 0;

export default function Logo({ size = 24, className = '' }) {
  const id = `elv-grad-${++_id}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 150 169"
      width={size}
      height={Math.round(size * (169 / 150))}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="46.42" x2="103.1" y1="16.85" y2="154.6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9043F6" offset="0" />
          <stop stopColor="#282AF4" offset="1" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="m142.6 41-61.7-37.2c-3.2-1.9-8.4-1.9-11.9 0l-62.1 37.4c-2.8 1.8-4.4 4.7-4.4 8.2v70.1c0 3.5 1.5 6.9 4.5 9 4.2 2.9 42.2 24.5 61.1 36.1 2.2 1.2 4.1 2.4 6.9 2.4 2.6 0 4.3-0.3 5.9-1.2l61.6-37c1.9-1.2 3.4-3.2 4.1-4.9 0.7-2.1 0.7-4.3 0.7-4.3l0.1-69.5c0-4-1.9-7.1-4.8-9.1zm-20 67.9c-0.7 1.7-1.9 3.4-4.3 5.1l-38.7 23.3c-2.4 1.5-7.2 1.8-10.1 0.1l-38.8-23.7c-2.9-1.8-5-4.6-5-8.9v-40.9c0-2.8 1.7-6.7 4.8-8.9l39.2-23.2c2.9-1.7 6.8-2.1 10.2 0l33.6 19.6v0.1h0.1-0.1 0.1-0.1 0.1-0.1 0.1-0.1l-53 32.4c-3.5 2-4.3 4.1-4.3 7.1 0 2.5 0.5 5.1 2.9 6.6l11.1 6.6c2.7 1.7 5.6 1.3 7.3 0.3l36.7-20.5 8.5-4.3 0.1-0.1v20.2 5.5c0 1.2-0.2 3.6-0.2 3.6z"
      />
    </svg>
  );
}
