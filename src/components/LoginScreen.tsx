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

  return (
    <div className="relative z-10 flex min-h-[520px] w-full flex-col justify-between rounded-3xl border border-[#D7BBA8] bg-[#FFF9F4] p-6 text-[#332424] shadow-2xl sm:p-8">
      <div>
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <RestoBarLogo size="xl" />
          <div className="mt-3 rounded-full border border-[#D7BBA8] bg-[#E8D4C3] px-4 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-[#843747]">
            📍 Constitución 944 • Río Cuarto
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#4F735A]/30 bg-[#4F735A]/10 p-3 text-[10px] leading-relaxed text-[#4F735A] font-semibold">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          Acceso protegido por Supabase Auth. Los PIN y contraseñas ya no se
          consultan desde tablas públicas.
        </div>

        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="staff-email" className="block text-[10px] font-black uppercase tracking-wider text-[#6F5A55]">
              Correo electrónico
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#843747]" />
              <input
                id="staff-email"
                type="email"
                autoComplete="username"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="personal@restobardelteatro.com"
                className="w-full rounded-xl border border-[#D7BBA8] bg-[#FFF9F4] py-3 pl-11 pr-4 text-xs font-bold text-[#332424] placeholder-[#332424]/40 focus:border-[#843747] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="staff-password" className="block text-[10px] font-black uppercase tracking-wider text-[#6F5A55]">
              Contraseña
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-[#843747]" />
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#D7BBA8] bg-[#FFF9F4] py-3 pl-11 pr-11 text-xs font-bold text-[#332424] placeholder-[#332424]/40 focus:border-[#843747] focus:outline-none"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3.5 top-3.5 text-[#843747] hover:text-[#332424]"
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
            className="mt-4 w-full rounded-xl bg-[#843747] hover:bg-[#71303D] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading ? "Validando sesión…" : "Ingresar al sistema POS"}
          </button>
        </form>
      </div>

      <p className="mt-8 border-t border-[#D7BBA8] pt-4 text-center text-[9px] font-bold uppercase tracking-wider text-[#6F5A55]">
        Acceso exclusivo para personal autorizado
      </p>
    </div>
  );
}
