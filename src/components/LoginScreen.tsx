import { FormEvent, useState } from "react";
import { Eye, EyeOff, Key, ShieldCheck, User } from "lucide-react";
import RestoBarLogo from "./RestoBarLogo";
import { AuthService, UserRoleProfile } from "../services/AuthService";

interface LoginScreenProps {
  onLoginSuccess: (user: UserRoleProfile) => void;
  onShowNotification: (
    message: string,
    type: "success" | "info" | "warning"
  ) => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onShowNotification
}: LoginScreenProps) {
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleCredentialsLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      onShowNotification("⚠️ Complete correo y contraseña.", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.loginWithCredentials(
        emailInput,
        passwordInput
      );
      if (!result.success || !result.user) {
        onShowNotification(
          `❌ ${result.error || "No fue posible iniciar sesión."}`,
          "warning"
        );
        return;
      }

      onLoginSuccess(result.user);
      onShowNotification(
        `🎭 Bienvenido/a, ${result.user.name}. Sesión verificada por Supabase Auth.`,
        "success"
      );
    } catch {
      onShowNotification(
        "❌ No fue posible validar la sesión con Supabase Auth.",
        "warning"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!emailInput.trim()) {
      onShowNotification("⚠️ Ingrese primero el correo de la cuenta.", "warning");
      return;
    }

    setIsSendingReset(true);
    try {
      const result = await AuthService.requestPasswordReset(emailInput);
      if (!result.success) {
        onShowNotification(`❌ ${result.error || "No fue posible enviar la recuperación."}`, "warning");
        return;
      }
      onShowNotification(
        "✅ Si la cuenta existe, Supabase envió un enlace para definir una nueva contraseña.",
        "success"
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-[520px] w-full flex-col justify-between rounded-3xl border border-[#CFB5A0] bg-[#FAF2E6] p-6 text-[#2D0E13] shadow-2xl sm:p-8">
      <div>
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <RestoBarLogo size="xl" />
          <div className="mt-3 rounded-full border border-[#CFB5A0] bg-[#EBDAC5] px-4 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-[#5C1D27]">
            📍 Constitución 944 • Río Cuarto
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#5C1D27]/20 bg-[#EBDAC5]/40 p-3 text-[10px] leading-relaxed text-[#5C1D27] font-semibold">
          <ShieldCheck className="mr-2 inline h-4 w-4 text-[#5C1D27]" />
          Acceso protegido para personal y administradores de Castaño — Resto Bar.
        </div>

        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="staff-email" className="block text-[10px] font-black uppercase tracking-wider text-[#5E393F]">
              Correo electrónico
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#5C1D27]" />
              <input
                id="staff-email"
                type="text"
                autoComplete="username"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="nombre@restobardelteatro.com"
                className="w-full rounded-xl border border-[#CFB5A0] bg-[#FAF2E6] py-3 pl-11 pr-4 text-xs font-bold text-[#2D0E13] placeholder-[#2D0E13]/40 focus:border-[#5C1D27] focus:outline-none"
                required
              />
            </div>
            <button
              type="button"
              disabled={isSendingReset}
              onClick={handlePasswordReset}
              className="ml-auto block border-none bg-transparent pt-1 text-[10px] font-bold text-[#5C1D27] underline decoration-[#5C1D27]/40 underline-offset-2 hover:text-[#2D0E13] disabled:cursor-wait disabled:opacity-60"
            >
              {isSendingReset ? "Enviando recuperación…" : "Olvidé mi contraseña"}
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="staff-password" className="block text-[10px] font-black uppercase tracking-wider text-[#5E393F]">
              Contraseña
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-[#5C1D27]" />
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Contraseña de Supabase Auth"
                className="w-full rounded-xl border border-[#CFB5A0] bg-[#FAF2E6] py-3 pl-11 pr-11 text-xs font-bold text-[#2D0E13] placeholder-[#2D0E13]/40 focus:border-[#5C1D27] focus:outline-none"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3.5 top-3.5 text-[#5C1D27] hover:text-[#2D0E13]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full rounded-xl bg-[#5C1D27] hover:bg-[#4A151D] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading ? "Validando sesión…" : "Ingresar al sistema POS"}
          </button>
        </form>
      </div>

      <p className="mt-8 border-t border-[#CFB5A0] pt-4 text-center text-[9px] font-bold uppercase tracking-wider text-[#5E393F]">
        Acceso exclusivo para personal autorizado
      </p>
    </div>
  );
}
