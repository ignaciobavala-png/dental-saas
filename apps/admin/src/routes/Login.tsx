import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { Button, cn } from "../components/ui";
import { useLogin, useSignup } from "../lib/queries";

type Mode = "login" | "signup";

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      <input
        {...props}
        className={cn(
          "h-11 w-full rounded-lg border border-line bg-panel px-3.5 text-sm outline-none placeholder:text-muted focus:border-accent",
          props.className,
        )}
      />
    </label>
  );
}

export function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const navigate = useNavigate();

  const login = useLogin();
  const signup = useSignup();
  const pending = login.isPending || signup.isPending;
  const error = login.error ?? signup.error;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login.mutateAsync({ email, password });
      } else {
        await signup.mutateAsync({ name, email, password, clinicName });
      }
      navigate("/", { replace: true });
    } catch {
      // el error ya queda expuesto por react-query en `error`
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,31rem)] lg:items-center lg:gap-12 lg:px-12">
      <section className="mx-auto mb-8 max-w-xl lg:mb-0">
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-accent font-display text-xl font-bold text-white">E</span>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Evolución Dental</p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          El panel operativo del consultorio.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
          Agenda, pacientes, landing pública y recepción virtual en un solo lugar. Creá tu cuenta con email y contraseña y probalo gratis durante 30 días.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel p-4">
            <KeyRound size={18} className="text-accent" />
            <p className="mt-3 text-sm font-semibold text-ink">30 días gratis</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Sin tarjeta. Al terminar, seguís con el plan pago.</p>
          </div>
          <div className="rounded-xl border border-line bg-panel p-4">
            <ShieldCheck size={18} className="text-accent" />
            <p className="mt-3 text-sm font-semibold text-ink">Acceso privado</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Luego cada usuario entra con su propio email.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-[0_18px_60px_rgba(40,35,25,0.08)] sm:p-8">
        <div className="mb-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Evolución Dental</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
            {mode === "login" ? "Entrá al panel del consultorio" : "Activá un consultorio"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "login"
              ? "Usá el email y contraseña que creaste al activar la prueba."
              : "Con este email y contraseña vas a entrar al panel."}
          </p>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-soft p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                mode === "login" ? "bg-panel text-ink shadow-[0_1px_2px_rgba(16,16,16,0.06)]" : "text-muted",
              )}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                mode === "signup" ? "bg-panel text-ink shadow-[0_1px_2px_rgba(16,16,16,0.06)]" : "text-muted",
              )}
            >
              Crear cuenta
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <Field
                label="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
              <Field
                label="Nombre del consultorio"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                required
                placeholder="Ej. Odontología Arocena"
              />
              <p className="rounded-lg bg-soft px-3 py-2 text-xs leading-relaxed text-muted">
                La prueba gratuita dura 30 días desde que creás la cuenta. No pedimos datos de pago.
              </p>
            </>
          ) : null}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error ? (
            <p className="flex items-center gap-2 text-sm text-error">
              <AlertCircle size={14} />
              {error.message}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
