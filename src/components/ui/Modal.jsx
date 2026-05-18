export default function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__content">
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
