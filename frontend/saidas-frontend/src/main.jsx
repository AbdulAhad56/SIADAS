// SAIDAS — src/main.jsx
// React application entry point.
// Wraps the app in:
//   - BrowserRouter  → enables client-side routing
//   - AnalysisProvider → global state for upload + analysis results

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AnalysisProvider } from "@/context/AnalysisContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnalysisProvider>
        <App />
      </AnalysisProvider>
    </BrowserRouter>
  </React.StrictMode>
);