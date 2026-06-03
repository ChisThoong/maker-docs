import { nanoid } from "nanoid";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

export interface ConfirmState {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

let toasts: ToastItem[] = [];
let confirmState: ConfirmState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUi(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getToastsSnapshot(): ToastItem[] {
  return toasts;
}

export function getConfirmSnapshot(): ConfirmState | null {
  return confirmState;
}

const EMPTY_TOASTS: ToastItem[] = [];

export function getToastsServerSnapshot(): ToastItem[] {
  return EMPTY_TOASTS;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function pushToast(
  message: string,
  opts?: { variant?: ToastVariant; duration?: number }
) {
  const id = nanoid(8);
  const item: ToastItem = {
    id,
    message,
    variant: opts?.variant ?? "info",
    duration: opts?.duration ?? 3500,
  };
  toasts = [...toasts, item];
  emit();
  window.setTimeout(() => dismissToast(id), item.duration);
}

export const toast = Object.assign(
  (message: string, opts?: { variant?: ToastVariant; duration?: number }) =>
    pushToast(message, opts),
  {
    success: (message: string, duration?: number) =>
      pushToast(message, { variant: "success", duration }),
    error: (message: string, duration?: number) =>
      pushToast(message, { variant: "error", duration: duration ?? 5000 }),
    info: (message: string, duration?: number) =>
      pushToast(message, { variant: "info", duration }),
    warning: (message: string, duration?: number) =>
      pushToast(message, { variant: "warning", duration }),
  }
);

export function confirmAction(options: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (confirmState) confirmState.resolve(false);
    confirmState = {
      id: nanoid(8),
      title: options.title ?? "Confirm",
      message: options.message,
      confirmLabel: options.confirmLabel ?? "Confirm",
      cancelLabel: options.cancelLabel ?? "Cancel",
      danger: options.danger ?? false,
      resolve,
    };
    emit();
  });
}

export function resolveConfirm(ok: boolean) {
  if (!confirmState) return;
  const { resolve } = confirmState;
  confirmState = null;
  emit();
  resolve(ok);
}
