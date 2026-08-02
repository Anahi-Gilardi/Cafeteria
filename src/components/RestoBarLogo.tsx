interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  compact?: boolean;
}

const LOGO_SIZES = {
  sm: { mark: "h-8 w-8", title: "text-[11px]", subtitle: "text-[7px]", gap: "gap-2" },
  md: { mark: "h-10 w-10", title: "text-sm", subtitle: "text-[8px]", gap: "gap-2.5" },
  lg: { mark: "h-12 w-12", title: "text-base", subtitle: "text-[9px]", gap: "gap-3" },
  xl: { mark: "h-16 w-16", title: "text-xl", subtitle: "text-[10px]", gap: "gap-3.5" }
} as const;

function CastanoMonogram({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Monograma de Castaño"
      className={`${className} shrink-0 overflow-visible drop-shadow-[0_5px_10px_rgba(51,36,36,0.16)]`}
    >
      <circle cx="32" cy="32" r="29.5" fill="#FFF9F4" stroke="#843747" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="#D7BBA8" strokeWidth="0.75" />

      <text
        x="32"
        y="47"
        textAnchor="middle"
        fill="#71303D"
        fontFamily="Cinzel, Marcellus, Georgia, serif"
        fontSize="38"
        fontWeight="700"
      >
        C
      </text>

      <path
        d="M20.5 16.7c3.7-5.1 7.8-2.7 11.6-.5 4.1 2.3 7.9 3.7 11.7-1.7"
        fill="none"
        stroke="#843747"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <circle cx="48.5" cy="16" r="2" fill="#C9942E" />
    </svg>
  );
}

export default function RestoBarLogo({
  className = "",
  size = "md",
  showText = true,
  compact = false
}: LogoProps) {
  const dimensions = LOGO_SIZES[size];
  const displayText = showText && !compact;

  return (
    <div
      className={`inline-flex items-center ${dimensions.gap} ${className}`}
      aria-label={displayText ? "Castaño, Resto Bar y Café" : undefined}
    >
      <CastanoMonogram className={dimensions.mark} />

      {displayText && (
        <div className="flex flex-col text-left leading-none">
          <span
            className={`font-serif font-black uppercase tracking-[0.15em] text-[#332424] ${dimensions.title}`}
          >
            CASTAÑO
          </span>
          <span
            className={`mt-1 font-sans font-extrabold uppercase tracking-[0.2em] text-[#843747] ${dimensions.subtitle}`}
          >
            RESTO BAR · CAFÉ
          </span>
        </div>
      )}
    </div>
  );
}
