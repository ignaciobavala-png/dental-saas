import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, RefreshCw, Send, Sparkles, Volume2, X } from "lucide-react";
import { EmptyState, Segmented, cn } from "./ui";
import { useUiStore } from "../store/ui";
import { API_URL, fetchAiAppointments, streamChat, type AiAppointment, type ChatMessage } from "../lib/ai";
import { useSpeechToText, useTextToSpeech } from "../lib/speech";

const GREETING =
  "Hola. Soy el asistente del consultorio: consulto tratamientos, obras sociales y horarios reales de la agenda, y puedo dejar turnos. ¿En qué te doy una mano?";

const SUGGESTIONS = [
  "¿Qué horarios hay mañana para una limpieza?",
  "¿Atienden OSDE?",
  "Reservame un turno de ortodoncia el jueves a la tarde",
];

type Tab = "chat" | "turnos";

export function AssistantDock() {
  const open = useUiStore((s) => s.assistantOpen);
  const setOpen = useUiStore((s) => s.setAssistantOpen);
  const toggle = useUiStore((s) => s.toggleAssistant);

  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AiAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const historyRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isSupported: sttSupported, listening, start: startListening, stop: stopListening } = useSpeechToText(
    useCallback((text: string) => setDraft((prev) => (prev ? `${prev} ${text}` : text)), []),
  );
  const { isSupported: ttsSupported, speakingId, speak, stop: stopSpeaking } = useTextToSpeech();

  const refreshAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      setAppointments(await fetchAiAppointments());
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    void refreshAppointments();
  }, [refreshAppointments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, tab]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setTab("chat");
      const next = [...historyRef.current, { role: "user" as const, content: text }];
      historyRef.current = next;
      setMessages([...next, { role: "assistant", content: "" }]);
      setDraft("");
      setBusy(true);
      setError(null);

      let answer = "";
      let failed = false;

      try {
        answer = await streamChat(next, (partial) => {
          setMessages((prev) => {
            const copy = prev.slice();
            copy[copy.length - 1] = { role: "assistant", content: partial };
            return copy;
          });
        });
      } catch (err) {
        failed = true;
        setMessages((prev) => prev.slice(0, -1));
        setError(err instanceof Error ? err.message : "No se pudo contactar al asistente.");
      } finally {
        setBusy(false);
      }

      if (failed) return;

      const final = answer.trim() || "No pude responder eso. ¿Lo reformulás?";
      historyRef.current = [...historyRef.current, { role: "assistant", content: final }];
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = { role: "assistant", content: final };
        return copy;
      });
      void refreshAppointments();
    },
    [busy, refreshAppointments],
  );

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 hover:bg-accent-hover"
          aria-label="Abrir asistente IA"
        >
          <Sparkles size={18} />
          <span className="hidden sm:inline">Asistente</span>
          {appointments.length > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-white/20 text-[11px]">
              {appointments.length}
            </span>
          ) : null}
        </button>
      ) : null}

      {open ? (
        <section
          aria-label="Asistente IA"
          className="fixed inset-x-3 bottom-3 z-40 flex h-[min(38rem,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[26rem]"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Sparkles size={17} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">Asistente del consultorio</p>
              <p className="truncate text-xs text-muted">
                {busy ? "escribiendo…" : "DeepSeek · agenda real"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="ml-auto rounded-lg p-2 text-muted transition-colors hover:bg-soft hover:text-ink"
            >
              <X size={18} />
            </button>
          </header>

          <div className="border-b border-line px-4 py-2.5">
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: "chat", label: "Chat" },
                { value: "turnos", label: `Turnos IA (${appointments.length})` },
              ]}
            />
          </div>

          {tab === "chat" ? (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message, index) => {
                  const bubbleId = String(index);
                  const speaking = speakingId === bubbleId;
                  return (
                    <div
                      key={index}
                      className={cn(
                        "group flex w-fit max-w-[88%] items-end gap-1.5",
                        message.role === "user" ? "ml-auto flex-row-reverse" : "",
                      )}
                    >
                      <div
                        className={cn(
                          "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                          message.role === "user"
                            ? "rounded-br-md bg-accent text-white"
                            : "rounded-bl-md bg-soft text-ink ring-1 ring-line",
                        )}
                      >
                        {message.content || (busy ? <TypingDots /> : "")}
                      </div>
                      {message.role === "assistant" && message.content && ttsSupported ? (
                        <button
                          type="button"
                          aria-label={speaking ? "Detener lectura" : "Leer en voz alta"}
                          onClick={() => (speaking ? stopSpeaking() : speak(bubbleId, message.content))}
                          className={cn(
                            "mb-0.5 rounded-full p-1.5 text-muted opacity-0 transition-opacity hover:bg-soft hover:text-ink group-hover:opacity-100",
                            speaking && "text-accent opacity-100",
                          )}
                        >
                          <Volume2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  );
                })}

                {historyRef.current.length === 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={busy}
                        onClick={() => void send(suggestion)}
                        className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-soft disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-line px-4 pt-3">
                {error ? (
                  <p className="mb-2 flex items-center gap-2 text-xs text-error">
                    <AlertCircle size={14} />
                    {error} (¿corre la API en {API_URL}?)
                  </p>
                ) : null}
                <form
                  className="flex items-center gap-2 pb-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send(draft);
                  }}
                >
                  <label htmlFor="assistant-dock-input" className="sr-only">
                    Escribile al asistente
                  </label>
                  <input
                    id="assistant-dock-input"
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={listening ? "Escuchando…" : "Pedile un turno o hacé una consulta…"}
                    autoComplete="off"
                    className="h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm outline-none placeholder:text-muted focus:border-accent"
                  />
                  {sttSupported ? (
                    <button
                      type="button"
                      onClick={() => (listening ? stopListening() : startListening())}
                      aria-label={listening ? "Detener dictado" : "Dictar por voz"}
                      className={cn(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        listening
                          ? "animate-pulse border-error bg-error/10 text-error"
                          : "border-line bg-panel text-body hover:bg-soft",
                      )}
                    >
                      <Mic size={16} />
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={busy || draft.trim().length === 0}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Enviar"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-muted">Turnos reservados por la IA</p>
                <button
                  type="button"
                  onClick={() => void refreshAppointments()}
                  disabled={loadingAppointments}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-body transition-colors hover:bg-soft disabled:opacity-50"
                >
                  <RefreshCw size={13} className={loadingAppointments ? "animate-spin" : undefined} />
                  Actualizar
                </button>
              </div>

              {appointments.length === 0 ? (
                <EmptyState
                  title="Todavía no reservó turnos"
                  hint="Pedile un turno en el chat y va a aparecer acá."
                />
              ) : (
                <div className="space-y-2">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="rounded-xl border border-line bg-panel p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{appointment.serviceName}</p>
                        <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-medium text-body">
                          {appointment.status === "pending" ? "A confirmar" : appointment.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs capitalize text-muted">{appointment.label}</p>
                      <p className="mt-0.5 text-xs text-body">{appointment.doctorName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted" />
    </span>
  );
}
