import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionProvider } from "../motion";
import { ThemeProvider } from "../hooks/theme";
import { AuthProvider, useAuth } from "../hooks/auth";
import { ToastProvider } from "../ui/Toast";
import { ConfirmProvider } from "../ui/Confirm";
import { ErrorBoundary } from "./ErrorBoundary";
import { configured } from "../lib/supabase";
import { Logo } from "../ui/Logo";
import { normalizeError } from "../lib/errors";

const AuthScreen = lazy(() => import("../features/auth/AuthScreen"));
const NotConfigured = lazy(() => import("../features/auth/NotConfigured"));
const SetPassword = lazy(() => import("../features/auth/SetPassword"));
const AppRouter = lazy(() =>
  import("./Router").then((m) => ({ default: m.AppRouter })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, err) =>
        count < 2 &&
        ![
          "forbidden",
          "missing_table",
          "missing_function",
          "missing_column",
          "auth",
        ].includes(normalizeError(err).code),
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
    },
    mutations: { retry: 0 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MotionProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <ErrorBoundary>
                  <Suspense fallback={<Splash />}>
                    <Gate />
                  </Suspense>
                </ErrorBoundary>
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Gate() {
  const { booting, user, demo, recovery } = useAuth();
  if (!configured && !demo) return <NotConfigured />;
  if (booting) return <Splash />;
  if (!user) return <AuthScreen />;
  if (recovery) return <SetPassword />;
  return <AppRouter />;
}

export function Splash() {
  return (
    <div className="full-center" aria-busy="true" aria-label="Loading ManaLife">
      <div className="boot-mark">
        <Logo size={44} />
      </div>
      <div className="boot-bar">
        <span />
      </div>
    </div>
  );
}
