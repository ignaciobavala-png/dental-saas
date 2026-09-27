import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-accent text-lg font-bold text-white">
            E
          </span>
          <h1 className="font-display text-xl font-bold tracking-tight">Evolución Dental</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login" ? "Entrá al panel de tu consultorio" : "Creá tu cuenta y tu consultorio"}
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
