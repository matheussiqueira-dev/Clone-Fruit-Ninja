import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { GameSettings } from '../types';

export type SettingKey = keyof GameSettings;

interface SettingsDialogProps {
  open: boolean;
  settings: GameSettings;
  // Settings the system forces on (reduced motion); shown as on and not toggleable.
  lockedOn: SettingKey[];
  onToggle: (key: SettingKey) => void;
  onClose: () => void;
}

const SETTING_ROWS: Array<{ key: SettingKey; label: string; description: string }> = [
  { key: 'mirrorVideo', label: 'Espelhar a câmera', description: 'O movimento na tela segue o seu, como num espelho.' },
  { key: 'showCameraFeed', label: 'Mostrar o vídeo', description: 'Exibe a câmera ao fundo durante a partida.' },
  { key: 'showHandSkeleton', label: 'Mostrar a mão', description: 'Desenha os pontos da mão para conferir o rastreamento.' },
  { key: 'showTrail', label: 'Rastro da lâmina', description: 'Mostra o traço do corte.' },
  { key: 'lowVfx', label: 'Efeitos reduzidos', description: 'Sem gotas de suco e com rastro mais curto.' }
];

// Native <dialog> with showModal(): focus containment, Esc and top layer come from the browser (A.7 §12).
const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, settings, lockedOn, onToggle, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[role="switch"]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    onClose();
    returnFocusRef.current?.focus();
  };

  return (
    <dialog ref={dialogRef} className="ms-dialog" aria-labelledby={titleId} onClose={handleClose}>
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-h2 text-fg">Ajustes</h2>
        <button type="button" className="ms-btn ms-btn--ghost ms-btn--icon -mr-2 -mt-2" onClick={() => dialogRef.current?.close()} aria-label="Fechar ajustes" title="Fechar ajustes">
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {SETTING_ROWS.map(({ key, label, description }) => {
          const locked = lockedOn.includes(key);
          const checked = locked || settings[key];
          return (
            <li key={key}>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-disabled={locked || undefined}
                className="ms-switch"
                onClick={() => {
                  if (!locked) onToggle(key);
                }}
              >
                <span className="min-w-0">
                  <span className="block text-small font-semibold text-fg">{label}</span>
                  <span className="block text-caption text-fg-secondary">{description}</span>
                  {locked && (
                    <span className="block text-caption text-fg-secondary">Mantido pelo movimento reduzido do sistema.</span>
                  )}
                </span>
                <span className="flex flex-shrink-0 items-center gap-3">
                  <span className="text-caption text-fg-secondary" aria-hidden="true">{checked ? 'Ativo' : 'Inativo'}</span>
                  <span className="ms-switch__track" aria-hidden="true">
                    <span className="ms-switch__thumb" />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
};

export default SettingsDialog;
