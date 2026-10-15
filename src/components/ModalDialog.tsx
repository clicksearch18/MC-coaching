import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-2xl'
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        dialog.close();
      }
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="modal-dialog-title"
      className={`m-auto w-[92vw] ${maxWidthClass} rounded-2xl border border-white/10 bg-[#12141D] p-0 text-slate-100 shadow-2xl overflow-hidden`}
    >
      <div className="border-b border-white/8 bg-white/[0.02] px-6 py-4 flex items-center justify-between">
        <div>
          {subtitle && (
            <div className="text-[11px] font-medium uppercase tracking-wider text-sky-400 mb-0.5">
              {subtitle}
            </div>
          )}
          <h2 id="modal-dialog-title" className="text-lg font-semibold tracking-tight text-white">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
    </dialog>
  );
};
