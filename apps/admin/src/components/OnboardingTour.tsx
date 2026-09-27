import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { Button } from "./ui";
import { ONBOARDING_STEPS, useOnboardingStore } from "../store/onboarding";
import { useMe } from "../lib/queries";

export function OnboardingTour() {
  const { data } = useMe();
  const { step, active, completed, start, next, skip } = useOnboardingStore();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (data?.user && !completed) start();
  }, [data?.user, completed, start]);

  const current = ONBOARDING_STEPS[step];

  useEffect(() => {
    if (!active || !current?.anchor) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${current.anchor}"]`);
    const box = el?.getBoundingClientRect();
    setRect(box && box.width > 0 ? box : null);
  }, [active, current]);

  if (!active || !current) return null;

  const style: CSSProperties = rect
    ? {
        position: "fixed",
        top: Math.min(Math.max(rect.top, 16), window.innerHeight - 220),
        left: Math.min(rect.right + 12, window.innerWidth - 336),
        zIndex: 60,
      }
    : { position: "fixed", bottom: 24, left: 24, right: 24, zIndex: 60, marginInline: "auto", maxWidth: 320 };

  return (
    <div
      style={style}
      className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-panel p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          Paso {step + 1} de {ONBOARDING_STEPS.length}
        </span>
        <button
          type="button"
          onClick={skip}
          aria-label="Saltar recorrido"
          className="rounded p-1 text-muted hover:bg-soft hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>
      <h3 className="font-display text-sm font-semibold">{current.title}</h3>
      <p className="mt-1.5 text-sm text-body">{current.text}</p>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={skip} className="text-xs font-medium text-muted hover:text-ink">
          Saltar
        </button>
        <Button size="sm" onClick={next}>
          {step === ONBOARDING_STEPS.length - 1 ? "Entendido" : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}
