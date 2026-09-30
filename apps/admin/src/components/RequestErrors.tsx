import { useSyncExternalStore } from 'react';
let message = '';
const listeners = new Set<() => void>();
export function showRequestError(error: Error) {
  message = error.message || 'No pudimos completar la operación. Intentá nuevamente.';
  listeners.forEach((notify) => notify());
}
export function RequestErrors() {
  const current = useSyncExternalStore((notify) => { listeners.add(notify); return () => { listeners.delete(notify); }; }, () => message);
  if (!current) return null;
  return <div role="alert" className="fixed bottom-5 left-5 right-5 z-[100] mx-auto flex max-w-xl items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-lg"><span>{current}</span><button aria-label="Cerrar aviso" onClick={() => { message = ''; listeners.forEach((notify) => notify()); }}>Cerrar</button></div>;
}
