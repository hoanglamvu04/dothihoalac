export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
