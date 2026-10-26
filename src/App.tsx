import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { LoginPage } from "./pages/auth/LoginPage";
import { HomePage } from "./pages/public/HomePage";
import { LandingPlaceholder } from "./pages/public/LandingPlaceholder";

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
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/links-contato" replace />}
            />
            <Route path="/links-contato" element={<HomePage />} />
            <Route path="/guia-do-hospede" element={<HomePage />} />
            <Route path="/site" element={<LandingPlaceholder />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={<Navigate to="/links-contato" replace />}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
