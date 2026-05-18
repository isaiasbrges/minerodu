import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { HardHat, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Acesso — Operação Mineroduto" }],
  }),
});

const FUNCOES = [
  "Operador de Campo",
  "Operador de Sala de Controle",
  "Supervisor de Turno",
  "Técnico de Manutenção",
  "Engenheiro de Operação",
  "Coordenador",
];

function LoginPage() {
  const { signInWithProfile, user, loading } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await signInWithProfile(nome, funcao);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Acesso autorizado");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left visual */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-accent-glow)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-3 stripe-warning opacity-70" />

        <div className="relative">
          <Logo size="lg" />
        </div>

        <div className="relative space-y-8">
          <div>
            <div className="font-mono text-xs tracking-[0.3em] text-primary uppercase">// Sala de Controle</div>
            <h2 className="mt-3 font-display text-5xl font-bold leading-tight">
              Inteligência<br />operacional<br />
              <span className="text-primary">em tempo real.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md">
              Plataforma industrial para registro e geração automatizada de relatórios técnicos da operação de mineração e mineroduto.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div className="industrial-card p-4">
              <HardHat className="h-5 w-5 text-primary mb-2" />
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Campo</div>
              <div className="font-display text-lg">Mobile First</div>
            </div>
            <div className="industrial-card p-4">
              <ShieldCheck className="h-5 w-5 text-primary mb-2" />
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Acesso</div>
              <div className="font-display text-lg">Rápido & Seguro</div>
            </div>
          </div>
        </div>

        <div className="relative font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          v1.0 • build {new Date().getFullYear()}
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>

          <div className="mb-2 font-mono text-xs tracking-[0.3em] text-primary uppercase">
            // Identificação do operador
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">
            Acesso ao Sistema
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Informe seu nome e função. No primeiro acesso seu cadastro é criado automaticamente.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nome" className="uppercase text-xs tracking-wider">Nome completo</Label>
              <Input
                id="nome"
                required
                minLength={3}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva Santos"
                className="h-12"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao" className="uppercase text-xs tracking-wider">Função</Label>
              <Select value={funcao} onValueChange={setFuncao}>
                <SelectTrigger id="funcao" className="h-12">
                  <SelectValue placeholder="Selecione sua função" />
                </SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={busy || !nome || !funcao}
              className="w-full h-12 text-base font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 glow-yellow"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar no Sistema
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao entrar, seu perfil fica salvo para os próximos acessos.
          </p>
        </div>
      </div>
    </div>
  );
}
