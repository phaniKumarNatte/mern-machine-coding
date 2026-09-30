import { ErrorMessage } from './ErrorMessage';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A minimal accessible modal. The parent decides WHEN to render it and what
 * happens on confirm/cancel; this component only knows how to display it.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  isConfirming = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="dialog"
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        {error && <ErrorMessage message={error} />}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
