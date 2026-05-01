// SAIDAS — Navbar.jsx
// Sticky top nav with logo, route links, and active indicator.

import { NavLink, useNavigate } from "react-router-dom";
import { useAnalysisContext }   from "@/context/AnalysisContext";

const LINKS = [
  { to: "/",         label: "Home"      },
  { to: "/upload",   label: "Upload"    },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const navigate            = useNavigate();
  const { analysisResult, uploadResult, reset } = useAnalysisContext();

  return (
    <header className="sticky top-0 z-50 bg-surface-card/80 backdrop-blur-md
                   border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="text-xl font-extrabold text-gradient">SAIDAS</span>
          <span className="hidden sm:block text-[10px] text-text-muted
                           font-medium border border-surface-border
                           px-1.5 py-0.5 rounded">
            v1.0
          </span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150
                ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-card"
                }`
              }
            >
              {label}
              {/* Status dots */}
              {label === "Upload"    && uploadResult    && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-success" />
              )}
              {label === "Dashboard" && analysisResult  && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right action */}
        {(uploadResult || analysisResult) && (
          <button
            onClick={() => { reset(); navigate("/upload"); }}
            className="btn-secondary text-xs py-1.5 px-3 hidden sm:inline-flex shrink-0"
          >
            New Analysis
          </button>
        )}
      </div>
    </header>
  );
}