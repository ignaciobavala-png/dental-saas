import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth, RequirePlatformAdmin } from "./components/RequireAuth";
import { Login } from "./routes/Login";
import { Hoy } from "./routes/Hoy";
import { Agenda } from "./routes/Agenda";
import { Pacientes } from "./routes/Pacientes";
import { PacienteDetalle } from "./routes/PacienteDetalle";
import { Profesionales } from "./routes/Profesionales";
import { Tratamientos } from "./routes/Tratamientos";
import { Landing } from "./routes/Landing";
import { Configuracion } from "./routes/Configuracion";
import { Plataforma } from "./routes/Plataforma";
import { EmptyState } from "./components/ui";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/plataforma", element: <RequirePlatformAdmin />, children: [{ index: true, element: <Plataforma /> }] },
  {
    element: <RequireAuth />,
    children: [
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
          { path: "landing", element: <Landing /> },
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
    ],
  },
]);
