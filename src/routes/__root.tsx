import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="font-mono text-xs tracking-[0.3em] text-primary uppercase mb-2">Erro 404</div>
        <h1 className="text-5xl font-display font-bold text-foreground">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A rota acessada não existe no sistema operacional.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Falha operacional</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a1a1c" },
      { title: "Operação Mineroduto — Sistema Inteligente de Relatórios" },
      { name: "description", content: "Sistema operacional industrial para mineração e mineroduto. Relatórios técnicos rápidos com IA, fotos e PDFs profissionais." },
      { property: "og:title", content: "Operação Mineroduto — Sistema Inteligente de Relatórios" },
      { name: "twitter:title", content: "Operação Mineroduto — Sistema Inteligente de Relatórios" },
      { property: "og:description", content: "Sistema operacional industrial para mineração e mineroduto. Relatórios técnicos rápidos com IA, fotos e PDFs profissionais." },
      { name: "twitter:description", content: "Sistema operacional industrial para mineração e mineroduto. Relatórios técnicos rápidos com IA, fotos e PDFs profissionais." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe619776-add9-4729-bf89-c467cdb95fb4/id-preview-b10773d5--a6015e6d-2f23-49e4-a767-b58407ef77e9.lovable.app-1779114838707.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe619776-add9-4729-bf89-c467cdb95fb4/id-preview-b10773d5--a6015e6d-2f23-49e4-a767-b58407ef77e9.lovable.app-1779114838707.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
