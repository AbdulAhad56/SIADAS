// SAIDAS — src/App.jsx
// Root component: owns the route table and global layout shell.
// Pages are lazy-loaded to keep the initial JS bundle small.

import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "@/components/layout/Navbar";
import PageWrapper from "@/components/layout/PageWrapper";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Footer from "@/components/layout/Footer";

// Lazy-load pages — each becomes its own JS chunk
const HomePage = lazy(() => import("@/pages/HomePage"));
const UploadPage = lazy(() => import("@/pages/UploadPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* ── Top navigation bar — visible on every page ── */}
      <Navbar />

      {/* ── Page content area ── */}
      <main className="flex-1">
        {/*
          Suspense fallback: shown while a lazy page chunk is loading.
          Uses the full-page spinner variant (no overlay, just centred).
        */}
        <Suspense fallback={<LoadingSpinner fullPage message="Loading..." />}>
          <Routes>
            {/* Home — landing page */}
            <Route
              path="/"
              element={
                <PageWrapper>
                  <HomePage />
                </PageWrapper>
              }
            />

            {/* Upload — CSV upload + target selection */}
            <Route
              path="/upload"
              element={
                <PageWrapper>
                  <UploadPage />
                </PageWrapper>
              }
            />

            {/* Dashboard — full analysis results */}
            <Route
              path="/dashboard"
              element={
                <PageWrapper>
                  <DashboardPage />
                </PageWrapper>
              }
            />

            {/* Fallback — redirect unknown URLs to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* ── Footer — visible on every page ── */}
      <Footer />
    </div>
  );
}
