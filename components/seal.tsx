/*
  Original artwork. Deliberately NOT the State Emblem of India, which is
  protected under the State Emblem of India (Prohibition of Improper Use) Act,
  2005, and not any departmental logo. The visual grammar is institutional ,
  a ringed seal, a tick bezel, a formal centre motif, but every mark here was
  drawn for this service.

  The centre motif is a speech mark with three lines inside it: a citizen's
  words, kept whole. That is the entire product in one glyph.
*/

export function Seal({ size = 52 }: { size?: number }) {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Loksahay seal"
      style={{ flex: "0 0 auto" }}
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <g stroke="currentColor" strokeWidth="1.6" opacity="0.85">
        {ticks.map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="4"
            x2="50"
            y2="9"
            transform={"rotate(" + deg + " 50 50)"}
            strokeLinecap="round"
          />
        ))}
      </g>
      <path
        d="M28 32h44a5 5 0 0 1 5 5v25a5 5 0 0 1-5 5H47L34 79V67h-6a5 5 0 0 1-5-5V37a5 5 0 0 1 5-5z"
        fill="currentColor"
      />
      <g stroke="var(--seal-inner, #fff)" strokeWidth="4" strokeLinecap="round">
        <line x1="33" y1="44" x2="67" y2="44" />
        <line x1="33" y1="52" x2="67" y2="52" />
        <line x1="33" y1="60" x2="55" y2="60" />
      </g>
    </svg>
  );
}

/** Circular quick-action tile icons, in the idiom of the portal's 150px tiles. */
export function ActionIcon({ kind, size = 28 }: { kind: "file" | "track" | "help" | "directory"; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    role: "img" as const,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "file")
    return (
      <svg {...common} aria-label="File a grievance">
        <path d="M14 12h24l12 12v28a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" />
        <path d="M38 12v12h12" />
        <path d="M22 36h20M22 45h13" />
      </svg>
    );
  if (kind === "track")
    return (
      <svg {...common} aria-label="Track a grievance">
        <circle cx="29" cy="29" r="17" />
        <path d="M41 41l12 12" />
        <path d="M29 21v9l6 4" />
      </svg>
    );
  if (kind === "directory")
    return (
      <svg {...common} aria-label="Nodal officers directory">
        <circle cx="24" cy="22" r="9" />
        <path d="M10 54c0-8 6.3-14 14-14s14 6 14 14" />
        <path d="M44 20h10M44 30h10M44 40h10" />
      </svg>
    );
  return (
    <svg {...common} aria-label="Can this portal help">
      <circle cx="32" cy="32" r="22" />
      <path d="M25 26a7 7 0 1 1 9 7v4" />
      <path d="M34 45h.02" strokeWidth="5" />
    </svg>
  );
}

/** Small reassurance marks for the footer, set for a dark ground. */
export function FooterBadge({ label, sub }: { label: string; sub: string }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)",
        borderRadius: 8, padding: "8px 12px",
      }}
    >
      <span style={{ color: "#7fd3a8", display: "grid" }} aria-hidden>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
          <path d="M4 12.5l5.5 5.5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>
        <strong style={{ display: "block", fontSize: 12.5, lineHeight: 1.2, color: "#fff" }}>{label}</strong>
        <em style={{ display: "block", fontSize: 11, fontStyle: "normal", color: "#a9a29a" }}>{sub}</em>
      </span>
    </span>
  );
}

/*
  Navigation icons.

  A label with a mark beside it is found faster than a label alone, and for a
  citizen who reads slowly the mark carries meaning before the word resolves.
  Drawn on one 24px grid at a single stroke weight so the row reads as one set
  rather than five borrowed pictures.
*/
export function NavIcon({
  kind,
  size = 17,
}: {
  kind: "home" | "file" | "status" | "directory" | "process" | "user" | "signout";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    style: { flex: "0 0 auto" },
  };

  switch (kind) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3.5 10.5 12 3.5l8.5 7" />
          <path d="M5.5 9.5V20h13V9.5" />
          <path d="M10 20v-5.5h4V20" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
          <path d="M13 3v6h6" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "status":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" />
          <path d="M10.5 7v3.8l2.4 1.4" />
        </svg>
      );
    case "directory":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
          <path d="M17.5 8H21M17.5 12H21M17.5 16H21" />
        </svg>
      );
    case "process":
      return (
        <svg {...common}>
          <path d="M4 6h7M4 12h11M4 18h7" />
          <circle cx="18.5" cy="6" r="1.6" />
          <circle cx="18.5" cy="18" r="1.6" />
        </svg>
      );
    case "signout":
      return (
        <svg {...common}>
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
          <path d="M10 16l-4-4 4-4" />
          <path d="M6 12h9" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.5 20c0-3.6 3.2-6 7.5-6s7.5 2.4 7.5 6" />
        </svg>
      );
  }
}
