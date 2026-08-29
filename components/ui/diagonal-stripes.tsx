import { useId } from "react";

// Subtle diagonal stripe texture referencing the club's black-and-white
// jersey pattern. Deliberately low-contrast: #151515 stripes on #0d0d0d.
export function DiagonalStripes({ className }: { className?: string }) {
  const id = useId();
  const patternId = `vasco-stripes-${id}`;

  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          width="40"
          height="40"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="40" height="40" fill="#0d0d0d" />
          <rect width="20" height="40" fill="#151515" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
