import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
}

let toasts: ToastMessage[] = [];
const listeners = new Set<(value: ToastMessage[]) => void>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function toast(message: Omit<ToastMessage, "id">) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  toasts = [...toasts, { id, ...message }];
  emit();
  return id;
}

export function dismiss(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function useToast() {
  const [state, setState] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { toasts: state, toast, dismiss };
}
