// SAIDAS — ErrorAlert.jsx
// Dismissible red error banner.
export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl
                    bg-red-50 border border-red-200 text-red-700">
      <span className="text-lg shrink-0">⚠️</span>
      <p className="text-sm flex-1 leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss"
        >✕</button>
      )}
    </div>
  );
}