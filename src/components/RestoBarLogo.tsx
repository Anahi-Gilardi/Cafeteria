import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export default function RestoBarLogo({ className = "", size = "md", showText = true }: LogoProps) {
  const dimensions = {
    sm: { box: "w-8 h-8", mask: "w-5 h-5", title: "text-xs", sub: "text-[8px]" },
    md: { box: "w-11 h-11", mask: "w-7 h-7", title: "text-sm", sub: "text-[10px]" },
    lg: { box: "w-14 h-14", mask: "w-9 h-9", title: "text-base", sub: "text-xs" },
    xl: { box: "w-20 h-20", mask: "w-12 h-12", title: "text-xl", sub: "text-sm" }
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Golden metallic badge with Comedy/Tragedy Masks */}
      <div className={`relative ${dimensions.box} rounded-2xl bg-gradient-to-br from-[#2C1810] via-[#1A0C08] to-[#3D2217] p-0.5 shadow-md border border-[#D97706]/40 flex items-center justify-center shrink-0`}>
        <div className="absolute inset-0 rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-tr from-[#D97706]/10 to-transparent pointer-events-none" />
        
        {/* SVG Theater Masks (Comedy & Tragedy) */}
        <svg viewBox="0 0 100 100" className={`${dimensions.mask} fill-none stroke-[#F59E0B]`}>
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          
          {/* Comedy Mask (Left) */}
          <path
            d="M 20,25 C 20,12 45,12 45,25 C 45,45 42,65 32,68 C 22,65 20,45 20,25 Z"
            fill="url(#goldGrad)"
            stroke="#78350F"
            strokeWidth="2"
          />
          {/* Comedy Eyes & Smile */}
          <ellipse cx="28" cy="30" rx="3.5" ry="4.5" fill="#1A0C08" />
          <ellipse cx="38" cy="30" rx="3.5" ry="4.5" fill="#1A0C08" />
          <path d="M 27,45 Q 33,56 39,45 Z" fill="#1A0C08" />

          {/* Tragedy Mask (Right, slightly behind) */}
          <path
            d="M 50,30 C 50,17 75,17 75,30 C 75,50 72,70 62,73 C 52,70 50,50 50,30 Z"
            fill="url(#goldGrad)"
            stroke="#78350F"
            strokeWidth="2"
            opacity="0.95"
          />
          {/* Tragedy Eyes & Sad Mouth */}
          <ellipse cx="58" cy="35" rx="3.5" ry="4.5" fill="#1A0C08" />
          <ellipse cx="68" cy="35" rx="3.5" ry="4.5" fill="#1A0C08" />
          <path d="M 57,55 Q 63,46 69,55 Z" fill="#1A0C08" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-serif font-black tracking-tight text-[#FDFBF7] uppercase leading-tight ${dimensions.title}`}>
            RESTO BAR
          </span>
          <span className={`font-serif font-extrabold uppercase text-[#F59E0B] tracking-wider ${dimensions.sub}`}>
            DEL TEATRO
          </span>
          <span className="text-[8px] font-semibold text-stone-300 uppercase tracking-widest -mt-0.5">
            Río Cuarto • Constitución 944
          </span>
        </div>
      )}
    </div>
  );
}
