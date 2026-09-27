import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStep = {
  anchor: string | null;
  title: string;
  text: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    anchor: null,
    title: "Bienvenido a Evolución Dental",
    text: "Un recorrido de 4 pasos para dejar tu consultorio andando. Podés saltarlo cuando quieras — el asistente de IA también responde dudas puntuales.",
  },
  {
    anchor: "nav-profesionales",
    title: "Profesionales y tratamientos",
    text: "Cargá quién atiende, qué tratamientos hace cada uno y sus horarios. Sin esto la secretaría IA no puede ofrecer turnos reales.",
  },
  {
    anchor: "nav-landing",
    title: "Tu web pública",
    text: "Contame el nombre, contacto, horarios y obras sociales de tu consultorio. Eso es lo que ve un paciente que llega a tu landing.",
  },
  {
    anchor: "nav-configuracion",
    title: "Publicá cuando estés listo",
    text: "Con al menos un profesional y un tratamiento activo, tu web ya puede salir de modo prueba.",
  },
];

type OnboardingState = {
  step: number;
  active: boolean;
  completed: boolean;
  start: () => void;
  next: () => void;
  skip: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      step: 0,
      active: false,
      completed: false,
      start: () => {
        if (!get().completed) set({ active: true, step: 0 });
      },
      next: () => {
        const step = get().step + 1;
        if (step >= ONBOARDING_STEPS.length) {
          set({ active: false, completed: true });
        } else {
          set({ step });
        }
      },
      skip: () => set({ active: false, completed: true }),
    }),
    { name: "evolucion-dental-onboarding" },
  ),
);
