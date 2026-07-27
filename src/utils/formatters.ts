/**
 * Formatters utility for Resto Bar Del Teatro (Río Cuarto, Córdoba)
 * Ensures 100% monetary consistency and ARS formatting across all modules.
 */

export const formatARS = (amount: number | string | null | undefined): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return "$0,00";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

export const formatARSCompact = (amount: number | string | null | undefined): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return "$0";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(num);
};

export const formatPercent = (pct: number | undefined | null): string => {
  const num = pct || 0;
  return `${num.toFixed(1)}%`;
};

export const formatDateTimeAR = (date: string | Date | null | undefined): string => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(d);
};
