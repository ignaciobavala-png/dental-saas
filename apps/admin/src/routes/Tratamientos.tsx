import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Loading, PageHeader, cn, toneDot } from "../components/ui";
import { useServices } from "../lib/queries";
import { formatMoney } from "../lib/format";

export function Tratamientos() {
  const services = useServices();
  const [showInactive, setShowInactive] = useState(false);

  const list = (services.data ?? []).filter((s) => showInactive || s.active);

  return (
    <div>
      <PageHeader
        title="Tratamientos"
        subtitle="Catálogo de servicios, duración y honorarios"
        actions={
          <Button size="sm">
            <Plus size={16} /> Nuevo tratamiento
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="size-4 accent-[#111111]"
          />
          Mostrar inactivos
        </label>
      </div>

      <Card className="overflow-hidden">
        {services.isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="hidden grid-cols-[0.7fr_2fr_0.8fr_1fr_0.8fr] gap-3 border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
              <span>Código</span>
              <span>Tratamiento</span>
              <span>Duración</span>
              <span>Honorario</span>
              <span>Estado</span>
            </div>
            <ul className="divide-y divide-line">
              {list.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[0.7fr_2fr_0.8fr_1fr_0.8fr] sm:items-center sm:gap-3",
                    !s.active && "opacity-60",
                  )}
                >
                  <span className="font-mono text-xs text-muted">{s.code ?? "—"}</span>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.description ? <p className="text-xs text-muted">{s.description}</p> : null}
                  </div>
                  <span className="text-sm text-muted">{s.durationMin} min</span>
                  <span className="text-sm tabular-nums">{formatMoney(s.priceCents)}</span>
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: toneDot(s.color) }} />
                    <span className="text-xs text-muted">{s.active ? "Activo" : "Inactivo"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
