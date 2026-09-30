import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useUiStore } from "../store/ui";
import { Avatar, cn } from "./ui";
import { AssistantDock } from "./AssistantDock";
import { OnboardingTour } from "./OnboardingTour";
import { useLogout, useMe } from "../lib/queries";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dueño/a",
  admin: "Administración",
  dentist: "Odontólogo/a",
  receptionist: "Recepción",
};

const NAV: Array<{ to: string; label: string; icon: ReactNode; end?: boolean }> = [
  { to: "/", label: "Hoy", icon: <LayoutDashboard size={18} />, end: true },
  { to: "/agenda", label: "Agenda", icon: <CalendarDays size={18} /> },
  { to: "/pacientes", label: "Pacientes", icon: <Users size={18} /> },
  { to: "/profesionales", label: "Profesionales", icon: <Stethoscope size={18} /> },
  { to: "/tratamientos", label: "Tratamientos", icon: <ClipboardList size={18} /> },
  { to: "/landing", label: "Landing", icon: <Globe size={18} /> },
  { to: "/configuracion", label: "Configuración", icon: <Settings size={18} /> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const user = data?.user;
  const membership = data?.memberships[0];
  const clinicName = membership?.clinic?.name ?? "Tu consultorio";

  async function onLogout() {
    await logout.mutateAsync();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-base font-bold text-white">
          E
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-sm font-bold tracking-tight">{clinicName}</p>
          <p className="text-xs text-muted">Panel del consultorio</p>
        </div>
      </div>

      <nav className="mx-3 flex flex-1 flex-col gap-0.5 rounded-2xl bg-soft p-1.5" data-tour="nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            data-tour={`nav-${item.to === "/" ? "hoy" : item.to.slice(1)}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-panel text-ink shadow-[0_1px_2px_rgba(16,16,16,0.06)]"
                  : "text-muted hover:text-ink",
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl bg-soft p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name ?? "?"} size={36} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user?.name ?? "…"}</p>
            <p className="truncate text-xs text-muted">{membership ? ROLE_LABEL[membership.role] : ""}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={() => void onLogout()}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-panel hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const navOpen = useUiStore((s) => s.navOpen);
  const setNavOpen = useUiStore((s) => s.setNavOpen);

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel lg:block">
        <SidebarContent />
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] border-r border-line bg-panel shadow-xl">
            <button
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:bg-soft"
              onClick={() => setNavOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur lg:px-8">
          <button
            aria-label="Abrir menú"
            className="rounded-lg border border-line bg-panel p-2 lg:hidden"
            onClick={() => setNavOpen(true)}
          >
            <Menu size={18} />
          </button>
          <p className="text-sm capitalize text-muted">
            {new Intl.DateTimeFormat("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "America/Argentina/Buenos_Aires",
            }).format(new Date())}
          </p>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-body">
            <span className="size-1.5 rounded-full bg-success" />
            Datos en vivo
          </span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <AssistantDock />
      <OnboardingTour />
    </div>
  );
}
