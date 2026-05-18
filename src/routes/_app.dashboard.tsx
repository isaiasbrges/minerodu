import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FilePlus2, History, FileBarChart2, Clock, CheckCircle2, AlertTriangle, Activity, ChevronRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataHojeISO, ESCALA_RESUMO, formatarDataBR, rotuloEscala, type RelatorioDiario } from "@/lib/relatorio";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Operação Mineroduto" }] }),
});

type RelatorioResumo = RelatorioDiario & { total_itens: number };

function Dashboard() {
  const { user } = useAuth();
  const [relatorios, setRelatorios] = useState<RelatorioResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("relatorios")
        .select("*")
        .order("data_referencia", { ascending: false })
        .limit(50);

      const lista = (rows || []) as RelatorioDiario[];
      const comContagem = await Promise.all(
        lista.map(async (r) => {
          const { count } = await supabase
            .from("relatorio_itens")
            .select("id", { count: "exact", head: true })
            .eq("relatorio_id", r.id);
          return { ...r, total_itens: count || 0 };
        }),
      );
      setRelatorios(comContagem);
      setLoading(false);
    })();
  }, []);

  const hoje = dataHojeISO();
  const relatorioHoje = relatorios.find((r) => r.data_referencia === hoje);
  const totalOcorrenciasHoje = relatorioHoje?.total_itens ?? 0;

  const stats = [
    { label: "Relatório de Hoje", value: relatorioHoje ? "Ativo" : "Pendente", icon: FileBarChart2, color: "text-primary" },
    { label: "Ocorrências Hoje", value: totalOcorrenciasHoje, icon: ListChecks, color: "text-warning" },
    { label: "Dias Registrados", value: relatorios.length, icon: CheckCircle2, color: "text-success" },
    { label: "Status Sistema", value: "OK", icon: Activity, color: "text-success" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs tracking-[0.3em] text-primary uppercase mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
            Sistema Operacional • {ESCALA_RESUMO}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Dashboard Operacional</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bem-vindo, <span className="text-primary font-mono">{(user?.user_metadata as { nome?: string })?.nome ?? "Operador"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/novo">
            <Button className="h-12 px-5 bg-primary text-primary-foreground hover:bg-primary/90 glow-yellow uppercase tracking-wider font-semibold">
              <FilePlus2 className="h-5 w-5 mr-2" /> Relatório do Dia
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="industrial-card p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 bg-primary" />
              <Icon className={`h-5 w-5 mb-3 ${s.color}`} />
              <div className="text-2xl sm:text-3xl font-display font-bold">{s.value}</div>
              <div className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        <QuickAction to="/novo" icon={FilePlus2} title="Relatório do Dia" desc="Adicionar ocorrências e fotos" />
        <QuickAction to="/historico" icon={History} title="Histórico" desc="Relatórios por data" />
        <QuickAction
          to="/novo"
          icon={Clock}
          title="Continuar Hoje"
          desc={relatorioHoje ? `${totalOcorrenciasHoje} ocorrência(s)` : "Iniciar relatório"}
        />
      </div>

      <div className="industrial-card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-wider">Relatórios Recentes</h2>
            <p className="text-xs text-muted-foreground mt-1">Um relatório por dia com todas as ocorrências</p>
          </div>
          <Link to="/historico" className="text-xs text-primary hover:underline font-mono uppercase tracking-wider">
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading && <div className="p-10 text-center text-muted-foreground text-sm">Carregando registros...</div>}
          {!loading && relatorios.length === 0 && (
            <div className="p-10 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <div className="text-sm text-muted-foreground">Nenhum relatório diário ainda.</div>
              <Link to="/novo" className="inline-block mt-4 text-primary text-sm font-semibold uppercase tracking-wider hover:underline">
                Criar relatório de hoje →
              </Link>
            </div>
          )}
          {relatorios.slice(0, 8).map((r) => (
            <Link
              key={r.id}
              to="/novo"
              search={{ data: r.data_referencia }}
              className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition group"
            >
              <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center text-primary font-mono text-xs font-bold shrink-0">
                {formatarDataBR(r.data_referencia).slice(0, 5)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {formatarDataBR(r.data_referencia)} • {r.total_itens} ocorrência(s)
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {r.operador_nome} · {rotuloEscala(r.turno)}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, desc }: { to: string; icon: typeof FilePlus2; title: string; desc: string }) {
  return (
    <Link to={to} className="industrial-card p-5 flex items-center gap-4 group">
      <div className="h-12 w-12 rounded-lg bg-primary/10 grid place-items-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <div className="font-display font-bold uppercase tracking-wide">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
    </Link>
  );
}
