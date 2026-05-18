import { supabase } from "@/integrations/supabase/client";

export const SETORES = [
  "Bombeamento",
  "Filtragem",
  "Espessador",
  "Mineroduto",
  "Estação de Válvulas",
  "Pátio de Pelotas",
  "Manutenção",
] as const;

export const ATIVIDADES = [
  "Inspeção operacional",
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Lubrificação",
  "Limpeza",
  "Troubleshooting",
  "Parada programada",
] as const;

/** Escala 4x4: 4 dias trabalhando, 4 dias de folga (ciclo de 8 dias). */
export const ESCALA_CODIGO = "4x4";
export const ESCALA_TITULO = "Escala 4x4";
export const ESCALA_RESUMO = "4 dias trabalhando · 4 dias de folga";

export type FaseEscala = "trabalho" | "folga";

export const FASES_ESCALA: { value: FaseEscala; label: string }[] = [
  { value: "trabalho", label: "Trabalhando" },
  { value: "folga", label: "De folga" },
];

export const DIAS_NO_BLOCO = [1, 2, 3, 4] as const;
export type DiaNoBloco = (typeof DIAS_NO_BLOCO)[number];

export type EscalaEstado = { fase: FaseEscala; dia: DiaNoBloco };

/** Serializa no campo `turno` do banco: 4x4|trabalho|2 */
export function serializarEscala(fase: FaseEscala, dia: DiaNoBloco): string {
  return `${ESCALA_CODIGO}|${fase}|${dia}`;
}

export function parseEscala(turno: string | null | undefined): EscalaEstado | null {
  if (!turno) return null;
  const parts = turno.split("|");
  if (parts.length === 3 && parts[0] === ESCALA_CODIGO) {
    const fase = parts[1] as FaseEscala;
    const dia = Number(parts[2]);
    if ((fase === "trabalho" || fase === "folga") && dia >= 1 && dia <= 4) {
      return { fase, dia: dia as DiaNoBloco };
    }
  }
  return null;
}

export function escalaPadrao(): EscalaEstado {
  return { fase: "trabalho", dia: 1 };
}

export function rotuloEscala(turno: string | null | undefined): string {
  const p = parseEscala(turno);
  if (!p) return turno || "—";
  const fase = p.fase === "trabalho" ? "Trabalhando" : "De folga";
  return `${ESCALA_TITULO} — ${fase} (dia ${p.dia} de 4)`;
}

/** Filtro do histórico: todos | trabalho | folga */
export function escalaCombinaFiltro(turno: string | null | undefined, filtro: string): boolean {
  if (filtro === "todos") return true;
  const p = parseEscala(turno);
  if (!p) return false;
  return p.fase === filtro;
}

/** @deprecated Use rotuloEscala */
export const rotuloTurno = rotuloEscala;

export type RelatorioDiario = {
  id: string;
  user_id: string;
  operador_nome: string;
  turno: string | null;
  data_referencia: string;
  created_at: string;
  updated_at: string;
};

export type RelatorioItem = {
  id: string;
  relatorio_id: string;
  setor: string;
  equipamento: string;
  tipo_atividade: string | null;
  observacoes: string | null;
  descricao_ia: string | null;
  imagem_url: string | null;
  ordem: number;
  created_at: string;
};

export function dataHojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatarDataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function getOrCreateRelatorioDiario(params: {
  userId: string;
  dataReferencia: string;
  operadorNome: string;
  turno: string;
}): Promise<{ relatorio: RelatorioDiario | null; error: string | null }> {
  const { userId, dataReferencia, operadorNome, turno } = params;

  const { data: existing, error: findError } = await supabase
    .from("relatorios")
    .select("*")
    .eq("user_id", userId)
    .eq("data_referencia", dataReferencia)
    .maybeSingle();

  if (findError) return { relatorio: null, error: findError.message };
  if (existing) {
    return { relatorio: existing as RelatorioDiario, error: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("relatorios")
    .insert({
      user_id: userId,
      operador_nome: operadorNome,
      turno,
      data_referencia: dataReferencia,
    })
    .select("*")
    .single();

  if (insertError) return { relatorio: null, error: insertError.message };
  return { relatorio: created as RelatorioDiario, error: null };
}

export async function listarItens(relatorioId: string): Promise<RelatorioItem[]> {
  const { data } = await supabase
    .from("relatorio_itens")
    .select("*")
    .eq("relatorio_id", relatorioId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  return (data || []) as RelatorioItem[];
}

export async function uploadImagemRelatorio(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("relatorios").upload(path, file, { upsert: false });
  if (error) return null;
  return path;
}

export async function signedImagemUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from("relatorios").createSignedUrl(path, expiresIn);
  return data?.signedUrl || null;
}
