import { AlertCircle, X } from "lucide-react";

export interface ErrorToastProps {
  message: string;
  onClose: () => void;
  title?: string;
}

export function ErrorToast({
  message,
  onClose,
  title = "Rute gagal dihitung",
}: ErrorToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-110 flex justify-center sm:inset-x-auto sm:top-5 sm:right-5 sm:block">
      <div
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-red-200 bg-white p-4 text-slate-900 shadow-2xl shadow-red-950/20"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertCircle aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-red-700">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{message}</p>
        </div>
        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-600 motion-reduce:transition-none"
          aria-label="Tutup pesan kesalahan"
          onClick={onClose}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
