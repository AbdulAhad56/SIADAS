// SAIDAS — SectionCard.jsx
// Titled card wrapper for dashboard panels.
export default function SectionCard({ title, icon, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-xl">{icon}</span>}
          {title && (
            <h3 className="font-semibold text-text-primary">{title}</h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}