import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileDown, Loader2, Eye, Calendar, ListChecks, Pencil } from "lucide-react";
import { gerarPDF, urlToDataUrl } from "@/lib/pdf";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  formatarDataBR,
  listarItens,
  escalaCombinaFiltro,
  FASES_ESCALA,
  rotuloEscala,
  signedImagemUrl,
  type RelatorioDiario,
  type RelatorioItem,
} from "@/lib/relatorio";

export const Route = createFileRoute("/_app/historico")({
  component: Historico,
  head: () => ({ meta: [{ title: "Histórico — Operação Mineroduto" }] }),
});

type RelatorioComContagem = RelatorioDiario & { total_itens: number };

function Historico() {
  const [relatorios, setRelatorios] = useState<RelatorioComContagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroEscala, setFiltroEscala] = useState("todos");
  const [data, setData] = useState("");
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RelatorioComContagem | null>(null);
  const [previewItens, setPreviewItens] = useState<RelatorioItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("relatorios")
        .select("*")
        .order("data_referencia", { ascending: false })
        .limit(200);

      const lista = (rows || []) as RelatorioDiario[];
      const comContagem: RelatorioComContagem[] = await Promise.all(
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

  useEffect(() => {
    if (!preview) {
      setPreviewItens([]);
      return;
    }
    setPreviewLoading(true);
    listarItens(preview.id).then((itens) => {
      setPreviewItens(itens);
      setPreviewLoading(false);
    });
  }, [preview]);

  const filtrados = useMemo(() => {
    return relatorios.filter((r) => {
      if (!escalaCombinaFiltro(r.turno, filtroEscala)) return false;
      if (data && r.data_referencia !== data) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const hay = `${r.operador_nome} ${r.data_referencia} ${r.turno || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [relatorios, busca, filtroEscala, data]);

  const baixarPDF = async (r: RelatorioComContagem) => {
    setPdfId(r.id);
    const itens = await listarItens(r.id);
    if (itens.length === 0) {
      toast.error("Este dia não possui ocorrências registradas");
      setPdfId(null);
      return;
    }

    const itensPdf = await Promise.all(
      itens.map(async (item) => {
        let imagemDataUrl: string | null = null;
        if (item.imagem_url) {
          const url = await signedImagemUrl(item.imagem_url, 600);
          if (url) imagemDataUrl = await urlToDataUrl(url);
        }
        return {
          setor: item.setor,
          equipamento: item.equipamento,
          tipo_atividade: item.tipo_atividade,
          observacoes: item.observacoes,
          descricao_ia: item.descricao_ia,
          created_at: item.created_at,
          imagemDataUrl,
        };
      }),
    );

    const blob = await gerarPDF({
      id: r.id,
      operador_nome: r.operador_nome,
      turno: r.turno,
      data_referencia: r.data_referencia,
      created_at: r.created_at,
      itens: itensPdf,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-dia-${r.data_referencia}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setPdfId(null);
    toast.success("PDF gerado");
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="font-mono text-xs tracking-[0.3em] text-primary uppercase mb-2">// Arquivo operacional</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Histórico de Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">{filtrados.length} relatório(s) diário(s)</p>
      </div>

      <div className="industrial-card p-4 grid sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar operador, data..."
            className="h-11 pl-9"
          />
        </div>
        <Select value={filtroEscala} onValueChange={setFiltroEscala}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda a escala</SelectItem>
            {FASES_ESCALA.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-11 pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="industrial-card p-12 text-center text-muted-foreground">Nenhum relatório encontrado.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((r) => (
            <div key={r.id} className="industrial-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                  {formatarDataBR(r.data_referencia)}
                </span>
              </div>
              <div>
                <div className="font-display text-lg font-bold leading-tight">Relatório do dia</div>
                <div className="text-xs text-muted-foreground">{rotuloEscala(r.turno)}</div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {r.total_itens} ocorrência(s) • {r.operador_nome}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-border mt-auto gap-2">
                <Link
                  to="/novo"
                  search={{ data: r.data_referencia }}
                  className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Link>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreview(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary"
                    onClick={() => baixarPDF(r)}
                    disabled={pdfId === r.id}
                  >
                    {pdfId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display uppercase tracking-wider">
                  {formatarDataBR(preview.data_referencia)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Operador" value={preview.operador_nome} />
                  <Info label="Escala" value={rotuloEscala(preview.turno)} />
                  <Info label="Data" value={formatarDataBR(preview.data_referencia)} />
                  <Info label="Ocorrências" value={String(preview.total_itens)} />
                </div>
                {previewLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando ocorrências...</div>
                ) : (
                  <ul className="space-y-4">
                    {previewItens.map((item, i) => (
                      <PreviewItem key={item.id} item={item} index={i} />
                    ))}
                  </ul>
                )}
                <Button
                  onClick={() => baixarPDF(preview)}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={preview.total_itens === 0}
                >
                  <FileDown className="h-4 w-4 mr-2" /> Baixar PDF do dia
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewItem({ item, index }: { item: RelatorioItem; index: number }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    if (!item.imagem_url) return;
    signedImagemUrl(item.imagem_url).then(setImg);
  }, [item.imagem_url]);

  return (
    <li className="rounded-md border border-border p-3 space-y-2">
      <div className="font-semibold text-sm">
        #{index + 1} {item.equipamento} — {item.setor}
      </div>
      <div className="text-xs text-muted-foreground">{item.tipo_atividade || "Atividade"}</div>
      <p className="text-sm">{item.descricao_ia || item.observacoes}</p>
      {img && <img src={img} alt="" className="w-full rounded-md border border-border max-h-48 object-cover" />}
    </li>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
