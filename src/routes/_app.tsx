import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-primary font-mono text-sm uppercase tracking-wider">
          <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
          Carregando...
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
