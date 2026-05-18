import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Camera,
  Sparkles,
  FileDown,
  Loader2,
  ImageOff,
  X,
  Plus,
  Trash2,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { gerarRelatorioIA } from "@/lib/ai";
import { gerarPDF, urlToDataUrl } from "@/lib/pdf";
import { toast } from "sonner";
import {
  ATIVIDADES,
  SETORES,
  DIAS_NO_BLOCO,
  ESCALA_RESUMO,
  ESCALA_TITULO,
  FASES_ESCALA,
  dataHojeISO,
  escalaPadrao,
  formatarDataBR,
  parseEscala,
  rotuloEscala,
  serializarEscala,
  getOrCreateRelatorioDiario,
  listarItens,
  uploadImagemRelatorio,
  signedImagemUrl,
  type DiaNoBloco,
  type FaseEscala,
  type RelatorioDiario,
  type RelatorioItem,
} from "@/lib/relatorio";

export const Route = createFileRoute("/_app/novo")({
  validateSearch: (search: Record<string, unknown>) => ({
    data: typeof search.data === "string" ? search.data : undefined,
  }),
  component: NovoPage,
  head: () => ({ meta: [{ title: "Relatório do Dia — Operação Mineroduto" }] }),
});

function NovoPage() {
  const { user } = useAuth();
  const { data: dataUrl } = Route.useSearch();

  const [dataReferencia, setDataReferencia] = useState(dataUrl || dataHojeISO());
  const [operadorNome, setOperadorNome] = useState("");
  const [fase, setFase] = useState<FaseEscala>(escalaPadrao().fase);
  const [diaEscala, setDiaEscala] = useState<DiaNoBloco>(escalaPadrao().dia);
  const [relatorio, setRelatorio] = useState<RelatorioDiario | null>(null);

  const turno = serializarEscala(fase, diaEscala);
  const [itens, setItens] = useState<RelatorioItem[]>([]);
  const [loadingRelatorio, setLoadingRelatorio] = useState(true);

  const [setor, setSetor] = useState("");
  const [equipamento, setEquipamento] = useState("");
  const [tipoAtividade, setTipoAtividade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [descricaoIA, setDescricaoIA] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [iaLoading, setIaLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const carregarRelatorio = useCallback(async () => {
    if (!user) return;
    setLoadingRelatorio(true);

    const { data: op } = await supabase.from("operadores").select("nome").eq("user_id", user.id).maybeSingle();
    const nome = op?.nome || operadorNome || "Operador";
    if (op?.nome) setOperadorNome(op.nome);

    const { relatorio: r, error } = await getOrCreateRelatorioDiario({
      userId: user.id,
      dataReferencia,
      operadorNome: nome,
      turno,
    });

    if (error) {
      toast.error(error);
      setLoadingRelatorio(false);
      return;
    }

    setRelatorio(r);
    if (r) {
      setOperadorNome(r.operador_nome);
      const escala = parseEscala(r.turno);
      if (escala) {
        setFase(escala.fase);
        setDiaEscala(escala.dia);
      }
      const lista = await listarItens(r.id);
      setItens(lista);
    }
    setLoadingRelatorio(false);
  }, [user, dataReferencia, turno, operadorNome]);

  useEffect(() => {
    if (!relatorio?.id) return;
    void supabase
      .from("relatorios")
      .update({ turno, operador_nome: operadorNome, updated_at: new Date().toISOString() })
      .eq("id", relatorio.id);
  }, [fase, diaEscala, relatorio?.id, turno, operadorNome]);

  useEffect(() => {
    if (dataUrl) setDataReferencia(dataUrl);
  }, [dataUrl]);

  useEffect(() => {
    carregarRelatorio();
  }, [user, dataReferencia]);

  const onFile = (f: File | null) => {
    setFile(f);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(f ? URL.createObjectURL(f) : null);
  };

  const limparFormulario = () => {
    setSetor("");
    setEquipamento("");
    setTipoAtividade("");
    setObservacoes("");
    setDescricaoIA("");
    onFile(null);
  };

  const rodarIA = () => {
    if (!observacoes.trim() || !equipamento.trim() || !setor) {
      toast.error("Preencha setor, equipamento e observações antes de gerar com IA");
      return;
    }
    setIaLoading(true);
    setTimeout(() => {
      setDescricaoIA(gerarRelatorioIA({ observacoes, equipamento, setor, tipoAtividade }));
      setIaLoading(false);
      toast.success("Descrição técnica gerada");
    }, 600);
  };

  const adicionarOcorrencia = async () => {
    if (!user || !relatorio) return;
    if (!setor || !equipamento) {
      toast.error("Preencha setor e equipamento");
      return;
    }
    if (!observacoes.trim() && !descricaoIA.trim()) {
      toast.error("Informe observações ou gere a descrição com IA");
      return;
    }

    setAdding(true);
    let imagem_url: string | null = null;
    if (file) {
      imagem_url = await uploadImagemRelatorio(file, user.id);
      if (!imagem_url) {
        toast.error("Falha no upload da foto");
        setAdding(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from("relatorio_itens")
      .insert({
        relatorio_id: relatorio.id,
        setor,
        equipamento,
        tipo_atividade: tipoAtividade || null,
        observacoes: observacoes || null,
        descricao_ia: descricaoIA || null,
        imagem_url,
        ordem: itens.length,
      })
      .select("*")
      .single();

    await supabase
      .from("relatorios")
      .update({ turno, operador_nome: operadorNome, updated_at: new Date().toISOString() })
      .eq("id", relatorio.id);

    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setItens((prev) => [...prev, data as RelatorioItem]);
    limparFormulario();
    toast.success("Ocorrência adicionada ao relatório do dia");
  };

  const removerOcorrencia = async (item: RelatorioItem) => {
    setDeletingId(item.id);
    const { error } = await supabase.from("relatorio_itens").delete().eq("id", item.id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItens((prev) => prev.filter((i) => i.id !== item.id));
    toast.success("Ocorrência removida");
  };

  const baixarPDF = async () => {
    if (!relatorio) return;
    if (itens.length === 0) {
      toast.error("Adicione pelo menos uma ocorrência antes de gerar o PDF");
      return;
    }

    setPdfLoading(true);
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
      id: relatorio.id,
      operador_nome: operadorNome,
      turno,
      data_referencia: relatorio.data_referencia,
      created_at: relatorio.created_at,
      itens: itensPdf,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-dia-${relatorio.data_referencia}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setPdfLoading(false);
    toast.success("PDF do dia gerado");
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="font-mono text-xs tracking-[0.3em] text-primary uppercase mb-2">// Relatório diário</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Relatório do Dia</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registre todas as ocorrências e atividades do dia. Cada registro pode ter foto no PDF final.
        </p>
      </div>

      <div className="industrial-card p-4 border-primary/30 bg-primary/5">
        <div className="font-display font-bold text-primary uppercase tracking-wider text-sm">{ESCALA_TITULO}</div>
        <p className="text-sm text-muted-foreground mt-1">{ESCALA_RESUMO}</p>
        <p className="text-xs font-mono text-muted-foreground mt-2">Hoje: {rotuloEscala(turno)}</p>
      </div>

      <div className="industrial-card p-5 sm:p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Data do relatório">
          <div className="relative">
            <CalendarDays className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className="h-12 pl-9"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Operador">
          <Input className="h-12" value={operadorNome} onChange={(e) => setOperadorNome(e.target.value)} />
        </Field>
        <Field label="Situação hoje">
          <Select value={fase} onValueChange={(v) => setFase(v as FaseEscala)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FASES_ESCALA.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Dia no bloco (de 4)">
          <Select value={String(diaEscala)} onValueChange={(v) => setDiaEscala(Number(v) as DiaNoBloco)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIAS_NO_BLOCO.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Dia {d} de 4 — {fase === "trabalho" ? "trabalho" : "folga"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="industrial-card p-5">
            <h2 className="font-display font-bold uppercase tracking-wider text-sm text-primary flex items-center gap-2 mb-4">
              <ListChecks className="h-4 w-4" />
              Ocorrências do dia ({itens.length})
            </h2>
            {loadingRelatorio ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Carregando...</div>
            ) : itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência ainda. Use o formulário ao lado.</p>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {itens.map((item, i) => (
                  <li key={item.id} className="rounded-md border border-border p-3 bg-secondary/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] text-primary">#{i + 1}</div>
                        <div className="font-semibold truncate">{item.equipamento}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.setor} •{" "}
                          {new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.descricao_ia || item.observacoes}
                        </p>
                        {item.imagem_url && (
                          <span className="text-[10px] font-mono text-primary mt-1 inline-block">Com foto</span>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => removerOcorrencia(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="industrial-card p-5 space-y-3">
            <Button
              onClick={baixarPDF}
              disabled={pdfLoading || itens.length === 0}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-yellow uppercase tracking-wider font-semibold"
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Gerar PDF do dia
            </Button>
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              {formatarDataBR(dataReferencia)} • {itens.length} registro(s)
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          <div className="industrial-card p-5 sm:p-6 space-y-5">
            <h2 className="font-display font-bold uppercase tracking-wider text-sm text-primary">Nova ocorrência / atividade</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Setor">
                <Select value={setor} onValueChange={setSetor}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETORES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Equipamento">
                <Input
                  className="h-12 font-mono uppercase"
                  value={equipamento}
                  onChange={(e) => setEquipamento(e.target.value)}
                  placeholder="PP005"
                />
              </Field>
              <Field label="Tipo de atividade" className="sm:col-span-2">
                <Select value={tipoAtividade} onValueChange={setTipoAtividade}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATIVIDADES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Observações">
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: vazamento na bomba PP005"
                rows={3}
                className="resize-none"
              />
            </Field>

            <div className="flex flex-wrap gap-2 items-center justify-between">
              <p className="text-xs text-muted-foreground">Descrição técnica (opcional, via IA)</p>
              <Button onClick={rodarIA} disabled={iaLoading} size="sm" variant="outline">
                {iaLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Gerar com IA
              </Button>
            </div>
            <Textarea
              value={descricaoIA}
              onChange={(e) => setDescricaoIA(e.target.value)}
              placeholder="Descrição técnica para o PDF..."
              rows={3}
              className="resize-none font-mono text-sm"
            />
          </div>

          <div className="industrial-card p-5">
            <h2 className="font-display font-bold uppercase tracking-wider text-sm text-primary mb-4">Foto desta ocorrência</h2>
            {filePreview ? (
              <div className="relative rounded-md overflow-hidden border border-border">
                <img src={filePreview} alt="preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => onFile(null)}
                  className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-md bg-background/80 backdrop-blur hover:bg-destructive transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                />
                <div className="border-2 border-dashed border-border rounded-md p-8 text-center hover:border-primary hover:bg-primary/5 transition">
                  <Camera className="h-10 w-10 text-primary mx-auto mb-3" />
                  <div className="font-semibold uppercase tracking-wider text-sm">Anexar foto</div>
                  <div className="text-xs text-muted-foreground mt-1">Incluída no PDF desta ocorrência</div>
                </div>
              </label>
            )}
            {!filePreview && (
              <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 font-mono">
                <ImageOff className="h-3 w-3" /> Uma foto por ocorrência
              </div>
            )}
          </div>

          <Button
            onClick={adicionarOcorrencia}
            disabled={adding || loadingRelatorio}
            className="w-full h-12 bg-secondary text-foreground hover:bg-secondary/80 uppercase tracking-wider font-semibold"
          >
            {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Adicionar ao relatório do dia
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label className="uppercase text-[11px] tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
