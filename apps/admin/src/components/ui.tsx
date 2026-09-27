import type { ReactNode } from "react";
import type { AppointmentStatus } from "@dental/contracts";
import { initials } from "../lib/format";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Tone = { bg: string; fg: string; solid: string };

const TONES: Record<string, Tone> = {
  accent: { bg: "#e7f7f0", fg: "#0b6b4f", solid: "#34d399" },
  sky: { bg: "#e8f0fe", fg: "#1d4ed8", solid: "#3b82f6" },
  violet: { bg: "#f2ecfe", fg: "#6d28d9", solid: "#8b5cf6" },
  amber: { bg: "#fdeee0", fg: "#b45309", solid: "#fb923c" },
  rose: { bg: "#fdeaf3", fg: "#be185d", solid: "#ec4899" },
};

export function toneDot(color: string): string {
  return (TONES[color] ?? TONES.accent).solid;
}

export function toneStyle(color: string): { bg: string; fg: string } {
  const tone = TONES[color] ?? TONES.accent;
  return { bg: tone.bg, fg: tone.fg };
}

export function ToneChip({ color, children }: { color: string; children: ReactNode }) {
  const tone = TONES[color] ?? TONES.accent;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {children}
    </span>
  );
}

const STATUS: Record<AppointmentStatus, { label: string; bg: string; fg: string; dot: string }> = {
  pending: { label: "A confirmar", bg: "#fdeee0", fg: "#b45309", dot: "#f59e0b" },
  confirmed: { label: "Confirmado", bg: "#e7f7f0", fg: "#0b6b4f", dot: "#10b981" },
  completed: { label: "Atendido", bg: "#f3f4f6", fg: "#4b5563", dot: "#9ca3af" },
  cancelled: { label: "Cancelado", bg: "#fdeaf3", fg: "#be185d", dot: "#ec4899" },
  no_show: { label: "No vino", bg: "#fdeaf3", fg: "#be185d", dot: "#ec4899" },
};

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

export function Card({
  children,
  className,
  as: As = "div",
  variant = "outline",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  variant?: "outline" | "filled";
}) {
  return (
    <As
      className={cn(
        "rounded-xl",
        variant === "filled"
          ? "bg-card"
          : "border border-line bg-panel shadow-[0_1px_2px_rgba(16,16,16,0.04)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Avatar({
  name,
  size = 36,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const tone = color ? (TONES[color] ?? TONES.accent) : null;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.32)),
        backgroundColor: tone ? tone.bg : "var(--color-card)",
        color: tone ? tone.fg : "var(--color-ink)",
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  disabled,
  className,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = size === "sm" ? "h-9 px-3.5 text-sm" : "h-10 px-5 text-sm";
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    outline: "border border-line bg-panel text-ink hover:bg-soft",
    ghost: "text-body hover:bg-soft hover:text-ink",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, sizes, variants, className)}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-soft p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-panel text-ink shadow-[0_1px_2px_rgba(16,16,16,0.06)]"
              : "text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-soft/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink" />
      {label}
    </div>
  );
}
