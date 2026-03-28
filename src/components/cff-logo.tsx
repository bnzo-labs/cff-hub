/**
 * Cook for Friends logo — inline SVG component.
 * Colors: purple #9d24b2, orange #f8aa40, blue #4dc1ea
 */
export function CFFLogo({ width = 200 }: { width?: number }) {
  const height = Math.round(width * 78 / 260);

  return (
    <svg
      viewBox="0 0 260 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      aria-label="Cook for Friends"
    >
      {/* ── Chef hat (blue, outline style) ─────────────── */}

      {/* Brim */}
      <path
        d="M4 54 Q36 49 68 54 Q68 65 36 67 Q4 65 4 54 Z"
        stroke="#4dc1ea"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Body sides + top edge */}
      <path
        d="M11 38 L11 54 M61 38 L61 54"
        stroke="#4dc1ea"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M11 38 Q36 34 61 38"
        stroke="#4dc1ea"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Three dome puffs (circles) */}
      <circle cx="20" cy="30" r="11" stroke="#4dc1ea" strokeWidth="2.6" />
      <circle cx="36" cy="21" r="15" stroke="#4dc1ea" strokeWidth="2.6" />
      <circle cx="52" cy="30" r="11" stroke="#4dc1ea" strokeWidth="2.6" />

      {/* ── Wordmark ────────────────────────────────────── */}

      {/* "Cook" — bold purple */}
      <text
        x="82"
        y="45"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontWeight="800"
        fontSize="34"
        fill="#9d24b2"
      >
        Cook
      </text>

      {/* "for" — italic orange */}
      <text
        x="84"
        y="70"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="22"
        fill="#f8aa40"
      >
        for
      </text>

      {/* "Friends" — bold purple */}
      <text
        x="124"
        y="70"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontWeight="800"
        fontSize="34"
        fill="#9d24b2"
      >
        Friends
      </text>
    </svg>
  );
}
