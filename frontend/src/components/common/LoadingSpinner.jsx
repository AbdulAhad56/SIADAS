// SAIDAS — LoadingSpinner.jsx
// Full-page or inline spinner with optional message.
export default function LoadingSpinner({
  message  = "Loading…",
  subMessage,
  fullPage = false,
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4
      ${fullPage ? "min-h-screen" : "py-20"}`}>
      {/* Ring */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4
                        border-surface-border" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent
                        border-t-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-text-primary text-sm">{message}</p>
        {subMessage && (
          <p className="text-xs text-text-muted mt-1">{subMessage}</p>
        )}
      </div>
    </div>
  );
}