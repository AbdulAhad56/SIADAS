// SAIDAS — components/layout/PageWrapper.jsx
// Max-width centered container used to wrap all non-dashboard pages.
// Accepts optional `narrow` prop for tighter layouts (e.g. forms).

export default function PageWrapper({ children, narrow = false, className = "" }) {
  return (
    <div
      className={[
        "w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3",
        narrow ? "max-w-3xl" : "max-w-7xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}