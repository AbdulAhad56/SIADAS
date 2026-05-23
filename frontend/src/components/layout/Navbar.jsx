import { NavLink, useNavigate } from "react-router-dom";
import { useAnalysisContext } from "@/context/AnalysisContext";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/upload", label: "Upload" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const navigate = useNavigate();

  const { analysisResult, uploadResult, reset } =
    useAnalysisContext();

  return (
    <header className="sticky top-2 z-50 px-3 sm:px-6">
      <div
        className="
          max-w-7xl mx-auto
          rounded-full
          border border-surface-border
          bg-surface-card/80
          backdrop-blur-md
          shadow-sm
        "
      >
        <div
          className="
            h-14
            px-3 sm:px-6
            flex items-center justify-between
            gap-2 sm:gap-6
          "
        >
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-lg sm:text-xl font-extrabold text-gradient">
              SMARTMINER
            </span>

            <span
              className="
                hidden sm:block
                text-[10px]
                text-text-muted
                font-medium
                border border-surface-border
                px-1.5 py-0.5 rounded
              "
            >
              v1.0
            </span>
          </button>

          {/* Nav Links */}
          <nav
            className="
              flex items-center
              gap-1
              overflow-x-auto
              scrollbar-hide
            "
          >
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `
                  whitespace-nowrap
                  px-2.5 sm:px-3
                  py-1.5
                  rounded-lg
                  text-xs sm:text-sm
                  font-medium
                  transition-colors duration-150
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-card"
                  }
                `
                }
              >
                {label}

                {/* Status dots */}
                {label === "Upload" && uploadResult && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-success" />
                )}

                {label === "Dashboard" && analysisResult && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Button */}
          {(uploadResult || analysisResult) && (
            <button
              onClick={() => {
                reset();
                navigate("/upload");
              }}
              className="
                hidden sm:inline-flex
                btn-secondary
                text-xs
                py-1.5 px-3
                shrink-0
              "
            >
              New Analysis
            </button>
          )}
        </div>
      </div>
    </header>
  );
}