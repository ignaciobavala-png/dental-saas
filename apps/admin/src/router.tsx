import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Hoy } from "./routes/Hoy";
import { Agenda } from "./routes/Agenda";
import { Pacientes } from "./routes/Pacientes";
import { PacienteDetalle } from "./routes/PacienteDetalle";
import { Profesionales } from "./routes/Profesionales";
import { Tratamientos } from "./routes/Tratamientos";
import { Configuracion } from "./routes/Configuracion";
import { EmptyState } from "./components/ui";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Hoy /> },
      { path: "agenda", element: <Agenda /> },
      { path: "pacientes", element: <Pacientes /> },
      { path: "pacientes/:id", element: <PacienteDetalle /> },
      { path: "profesionales", element: <Profesionales /> },
      { path: "tratamientos", element: <Tratamientos /> },
      { path: "configuracion", element: <Configuracion /> },
      {
        path: "*",
        element: (
          <div className="py-16">
            <EmptyState title="Pantalla no encontrada" hint="Usá el menú para volver al panel." />
          </div>
        ),
      },
    ],
  },
]);
