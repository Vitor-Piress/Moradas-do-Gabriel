import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { domMax, LazyMotion, MotionConfig } from "motion/react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BrandLoader } from "./components/public/BrandLoader";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { AccommodationDetailPage } from "./pages/public/AccommodationDetailPage";
import { HomePage } from "./pages/public/HomePage";
import { LandingPage } from "./pages/public/LandingPage";

// Code-splitting das rotas restritas para manter o bundle público da Landing Page leve
const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((mod) => ({ default: mod.LoginPage })),
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((mod) => ({
    default: mod.AdminDashboard,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <BrowserRouter>
              <Suspense
                fallback={
                  <BrandLoader show message="Carregando ambiente..." />
                }
              >
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route
                    path="/acomodacoes/:slug"
                    element={<AccommodationDetailPage />}
                  />
                  <Route path="/links-contato" element={<HomePage />} />
                  <Route path="/guia-do-hospede" element={<HomePage />} />
                  <Route path="/site" element={<Navigate to="/" replace />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}

export default App;
