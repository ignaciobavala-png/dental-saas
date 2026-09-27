export const API_URL = import.meta.env.VITE_API_URL ?? "";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AiAppointment = {
  id: string;
  serviceName: string;
  doctorName: string;
  startsAt: string;
  label: string;
  status: string;
};

export async function streamChat(
  messages: ChatMessage[],
  onDelta: (partial: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${API_URL}/api/asistente/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `La API respondió ${res.status}.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }

  return full;
}

export async function fetchAiAppointments(): Promise<AiAppointment[]> {
  const res = await fetch(`${API_URL}/api/asistente/appointments`, { credentials: "include" });
  if (!res.ok) return [];
  const data = (await res.json()) as { appointments?: AiAppointment[] };
  return data.appointments ?? [];
}
