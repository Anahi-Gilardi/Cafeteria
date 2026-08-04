import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import RestoBarLogo from "./RestoBarLogo";
import { AuthService } from "../services/AuthService";

interface PasswordSetupScreenProps {
  onCompleted: () => void;
  onCancel: () => void;
}

export default function PasswordSetupScreen({ onCompleted, onCancel }: PasswordSetupScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    if (password !== confirmation) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await AuthService.updatePassword(password);
      if (!result.success) {
        setErrorMessage(result.error || "No fue posible actualizar la contraseña.");
        return;
      }
      onCompleted();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4E8D7] p-4 text-[#2D0E13]">
      <section className="w-full max-w-md rounded-3xl border border-[#CFB5A0] bg-[#FAF2E6] p-7 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <RestoBarLogo size="xl" />
          <ShieldCheck className="mt-5 h-8 w-8 text-[#5C1D27]" />
          <h1 className="mt-2 font-serif text-2xl font-bold text-[#5C1D27]">Definir nueva contraseña</h1>
          <p className="mt-2 text-xs font-medium leading-relaxed text-[#5E393F]">
            Usá una clave única de al menos 12 caracteres. Al guardarla, quedará protegida por Supabase Auth.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[#5E393F]">
              Nueva contraseña
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-[#5C1D27]" />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#CFB5A0] bg-white py-3 pl-11 pr-11 text-xs font-bold outline-none focus:border-[#5C1D27]"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3.5 top-3.5 border-none bg-transparent text-[#5C1D27]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[#5E393F]">
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-xl border border-[#CFB5A0] bg-white p-3 text-xs font-bold outline-none focus:border-[#5C1D27]"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-[#A63F45]/30 bg-[#F4DCDD] p-3 text-xs font-bold text-[#A63F45]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-[#5C1D27] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? "Guardando…" : "Guardar nueva contraseña"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full border-none bg-transparent py-2 text-[10px] font-bold text-[#5E393F] underline underline-offset-2"
          >
            Volver al acceso
          </button>
        </form>
      </section>
    </main>
  );
}
