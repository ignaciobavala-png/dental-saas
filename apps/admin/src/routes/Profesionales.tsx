import { useState } from "react";
import { Plus } from "lucide-react";
import type { Doctor } from "@dental/contracts";
import { Avatar, Button, Card, Loading, PageHeader, ToneChip } from "../components/ui";
import { DoctorForm, Modal } from "../components/forms";
import { useCreateDoctor, useDoctors, useServices, useUpdateDoctor } from "../lib/queries";

export function Profesionales() {
  const doctors = useDoctors();
  const services = useServices();
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const serviceById = (id: string) => services.data?.find((s) => s.id === id);

  const close = () => {
    setOpen(false);
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        title="Profesionales"
        subtitle="Equipo del consultorio y tratamientos que realiza cada uno"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Agregar
          </Button>
        }
      />

      <Modal open={open} onClose={close} title={editing ? "Editar profesional" : "Nuevo profesional"}>
        <DoctorForm
          initial={editing}
          services={services.data ?? []}
          pending={createDoctor.isPending || updateDoctor.isPending}
          onCancel={close}
          onSubmit={(values) => {
            if (editing) {
              updateDoctor.mutate({ id: editing.id, input: values }, { onSuccess: close });
            } else {
              createDoctor.mutate(values, { onSuccess: close });
            }
          }}
        />
      </Modal>

      {doctors.isLoading || services.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(doctors.data ?? []).map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={d.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-bold">{d.name}</p>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={
                        d.active
                          ? { backgroundColor: "#e7f7f0", color: "#0b6b4f" }
                          : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                      }
                    >
                      {d.active ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      type="button"
                      className="ml-auto text-xs text-accent hover:underline"
                      onClick={() => {
                        setEditing(d);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </button>
                  </div>
                  <p className="text-sm text-muted">{d.specialty}</p>
                  {d.bio ? <p className="mt-2 text-sm">{d.bio}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {d.serviceIds.map((id) => {
                      const s = serviceById(id);
                      if (!s) return null;
                      return (
                        <ToneChip key={id} color={s.color}>
                          {s.name}
                        </ToneChip>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
