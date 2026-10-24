import { useEffect } from "react";

/**
 * Reusable Bootstrap confirmation popup (replaces window.confirm).
 *
 * Props:
 *  - show:        boolean, whether the popup is visible
 *  - title:       heading text
 *  - message:     body text (string or JSX)
 *  - confirmText: label of the main button (default "Confirm")
 *  - cancelText:  label of the cancel button (default "Cancel")
 *  - variant:     Bootstrap color for the main button: "danger", "primary", ...
 *  - loading:     disables the buttons and shows a spinner while working
 *  - onConfirm:   called when the main button is clicked
 *  - onCancel:    called on Cancel, the X, Esc, or a click outside the popup
 */
export default function ConfirmModal({
  show,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [show, loading, onCancel]);

  if (!show) return null;

  return (
    <>
      <div className="modal-backdrop fade show"></div>

      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => {
          // Clicking the dark area outside the popup closes it
          if (e.target === e.currentTarget && !loading) onCancel();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow rounded-4">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold" id="confirm-modal-title">
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onCancel}
                disabled={loading}
              ></button>
            </div>

            <div className="modal-body text-secondary">{message}</div>

            <div className="modal-footer border-0 pt-0">
              <button
                type="button"
                className="btn btn-light rounded-pill px-4"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className={`btn btn-${variant} rounded-pill px-4`}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Working...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
