export default function FormField({
  label,
  error,
  hint,
  required: isRequired,
  children,
  className = '',
}) {
  return (
    <div
      className={`form-field ${className}`.trim()}
    >
      <span className="form-field__label">
        {label}
        {isRequired ? <em>*</em> : null}
      </span>

      {children}

      {hint ? (
        <small className="form-field__hint">
          {hint}
        </small>
      ) : null}

      {error ? (
        <small className="form-field__error">
          {error}
        </small>
      ) : null}
    </div>
  );
}