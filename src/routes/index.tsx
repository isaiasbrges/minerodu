import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-3 text-primary font-mono text-sm uppercase tracking-wider">
          <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
          Inicializando sistema...
        </div>
      </div>
    );
  }
  return <Navigate to={user ? "/dashboard" : "/login"} />;
}
