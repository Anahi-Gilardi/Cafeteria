import React from "react";
import RestoBarLogo from "./RestoBarLogo";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gold" | "dark" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function TeatroButton({
  variant = "gold",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-xs font-bold rounded-xl",
    lg: "px-6 py-3.5 text-sm font-extrabold rounded-2xl"
  }[size];

  const variantClasses = {
    gold: "bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#996515] text-[#1C120C] font-black shadow-md hover:brightness-110 active:scale-98 gold-glow border border-[#FFDF00]/40 transition-all cursor-pointer",
    dark: "bg-[#2A1B12] hover:bg-[#3D281A] text-[#FDFBF7] border border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-sm active:scale-98 transition-all cursor-pointer",
    outline: "bg-transparent text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] active:scale-98 transition-all cursor-pointer",
    danger: "bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/50 active:scale-98 transition-all cursor-pointer"
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 uppercase tracking-wider gpu-accelerated ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function TeatroCard({ children, className = "", glow = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1A110B] border border-[#D4AF37]/25 rounded-3xl p-6 shadow-xl relative text-[#FDFBF7] ${
        glow ? "gold-glow" : ""
      } ${onClick ? "cursor-pointer hover:border-[#D4AF37]/60 transition-all" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "emerald" | "amber" | "rose";
  className?: string;
}

export function TeatroBadge({ children, variant = "gold", className = "" }: BadgeProps) {
  const variantStyles = {
    gold: "bg-gradient-to-r from-[#D4AF37]/20 to-[#996515]/20 text-[#FFDF00] border border-[#D4AF37]/40",
    emerald: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40",
    amber: "bg-amber-950/60 text-amber-300 border border-amber-500/40",
    rose: "bg-rose-950/60 text-rose-300 border border-rose-500/40"
  }[variant];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest font-mono ${variantStyles} ${className}`}>
      {children}
    </span>
  );
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function TeatroHeader({ title, subtitle, rightAction }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-[#1C120C] via-[#2A1B12] to-[#1C120C] border-b border-[#D4AF37]/30 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
      <RestoBarLogo size="md" />

      {(title || subtitle) && (
        <div className="text-left md:text-right">
          {title && <h2 className="font-serif text-lg font-bold text-[#FDFBF7] tracking-tight">{title}</h2>}
          {subtitle && <p className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold">{subtitle}</p>}
        </div>
      )}

      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
