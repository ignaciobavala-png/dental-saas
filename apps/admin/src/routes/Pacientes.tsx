import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { Avatar, Button, Card, EmptyState, Loading, PageHeader } from "../components/ui";
import { usePatients } from "../lib/queries";
import { ageFromBirthdate } from "../lib/format";

export function Pacientes() {
  const [query, setQuery] = useState("");
  const patients = usePatients(query);

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Fichas y datos de contacto del consultorio"
        actions={
          <Button size="sm">
            <UserPlus size={16} /> Nuevo paciente
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
        <Search size={16} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, teléfono, email o documento"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
        {query ? (
          <button className="text-xs text-muted hover:text-ink" onClick={() => setQuery("")}>
            Limpiar
          </button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        {patients.isLoading ? (
          <Loading />
        ) : (patients.data ?? []).length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sin resultados" hint="Probá con otro nombre o número." />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2.2fr_1.4fr_0.8fr_0.8fr] gap-3 border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted sm:grid">
              <span>Paciente</span>
              <span>Contacto</span>
              <span>Edad</span>
              <span>Documento</span>
            </div>
            <ul className="divide-y divide-line">
              {(patients.data ?? []).map((p) => {
                const age = ageFromBirthdate(p.birthdate);
                return (
                  <li key={p.id}>
                    <Link
                      to={`/pacientes/${p.id}`}
                      className="grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-soft sm:grid-cols-[2.2fr_1.4fr_0.8fr_0.8fr] sm:items-center sm:gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={p.fullName} size={38} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.fullName}</p>
                          <p className="truncate text-xs text-muted sm:hidden">{p.phone ?? "Sin teléfono"}</p>
                        </div>
                      </div>
                      <div className="hidden text-sm text-muted sm:block">
                        <p className="truncate">{p.phone ?? "—"}</p>
                        <p className="truncate text-xs">{p.email ?? "—"}</p>
                      </div>
                      <span className="text-sm text-muted">{age === null ? "—" : `${age} años`}</span>
                      <span className="text-sm text-muted">{p.document ?? "—"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-muted">
        {(patients.data ?? []).length} {(patients.data ?? []).length === 1 ? "paciente" : "pacientes"} · datos de demo
      </p>
    </div>
  );
}
