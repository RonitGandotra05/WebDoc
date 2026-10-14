import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
export default function Dialog({
  title,
  description,
  fields = [],
  onSubmit,
  onClose,
  children,
  submitLabel = "Apply",
}) {
  const ref = useRef(null),
    [pending, setPending] = useState(false),
    [failure, setFailure] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    setFailure("");
    try {
      const result = await onSubmit(values);
      if (result === null || result === false) {
        setFailure(
          "The action did not complete. See the editor message for details.",
        );
        return;
      }
      onClose();
    } catch (error) {
      setFailure(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <dialog ref={ref} className="dialog" aria-label={title} onCancel={onClose}>
      <form onSubmit={submit}>
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {description && <p className="muted">{description}</p>}
        {fields.map((f) => (
          <label className="field" key={f.name}>
            <span>{f.label}</span>
            {f.options ? (
              <select name={f.name} defaultValue={f.value}>
                {f.options.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                name={f.name}
                defaultValue={f.value}
                rows={4}
                required={f.required !== false}
              />
            ) : (
              <input
                name={f.name}
                type={f.type || "text"}
                defaultValue={f.value}
                min={f.min}
                max={f.max}
                step={f.step}
                required={f.required !== false}
                autoFocus
              />
            )}
          </label>
        ))}
        {children}
        {failure && (
          <p role="alert" className="error-text">
            {failure}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            {onSubmit ? "Cancel" : "Close"}
          </button>
          {onSubmit && (
            <button className="primary" disabled={pending}>
              {pending ? "Working…" : submitLabel}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
