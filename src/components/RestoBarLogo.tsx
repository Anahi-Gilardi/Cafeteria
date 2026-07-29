import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  compact?: boolean;
}

export default function RestoBarLogo({ className = "", size = "md", showText = true, compact = false }: LogoProps) {
  const dimensions = {
    sm: { box: "w-8 h-8", title: "text-xs", sub: "text-[8px]" },
    md: { box: "w-10 h-10", title: "text-sm", sub: "text-[10px]" },
    lg: { box: "w-12 h-12", title: "text-base", sub: "text-xs" },
    xl: { box: "w-16 h-16", title: "text-xl", sub: "text-sm" }
  }[size];

  if (compact) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`${dimensions.box} rounded-2xl bg-[#843747] text-white flex items-center justify-center font-serif font-black text-xl shadow-md border border-[#D7BBA8]/40`}>
          C
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Burgundy badge icon */}
      <div className={`${dimensions.box} rounded-2xl bg-[#843747] text-white flex items-center justify-center font-serif font-black text-xl shadow-md border border-[#D7BBA8]/40 shrink-0`}>
        C
      </div>

      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <span className={`font-serif font-black uppercase tracking-wider text-[#332424] ${dimensions.title}`}>
            CASTAÑO
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-widest text-[#843747] font-bold ${dimensions.sub}`}>
            RESTO BAR & CAFÉ
          </span>
        </div>
      )}
    </div>
  );
}
