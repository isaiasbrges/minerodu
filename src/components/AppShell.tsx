import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus2, History, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo", label: "Relatório do Dia", icon: FilePlus2 },
  { to: "/historico", label: "Histórico", icon: History },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const Nav = (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active = path === it.to;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={() => setOpen(false)}
            className={`group relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-all ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary" />}
            <Icon className="h-5 w-5" />
            <span className="uppercase tracking-wide">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-surface">
        <div className="p-6 border-b border-border">
          <Logo />
        </div>
        <div className="flex-1 p-4">{Nav}</div>
        <div className="p-4 border-t border-border space-y-3">
          <div className="text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Operador</div>
            <div className="font-mono text-foreground truncate">{(user?.user_metadata as any)?.nome ?? "—"}</div>
            <div className="text-muted-foreground truncate mt-1">{(user?.user_metadata as any)?.funcao}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/95 backdrop-blur px-4 py-3">
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {open && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-background/80 backdrop-blur" onClick={() => setOpen(false)} />
            <aside className="relative w-72 bg-surface border-r border-border flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <Logo size="sm" />
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 p-4">{Nav}</div>
              <div className="p-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2 font-mono truncate">{(user?.user_metadata as any)?.nome}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 grid-pattern">{children}</main>
      </div>
    </div>
  );
}
