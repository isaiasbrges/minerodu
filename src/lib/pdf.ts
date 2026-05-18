import jsPDF from "jspdf";
import { rotuloTurno } from "@/lib/relatorio";

export type RelatorioItemPDF = {
  setor: string;
  equipamento: string;
  tipo_atividade: string | null;
  observacoes: string | null;
  descricao_ia: string | null;
  created_at: string;
  imagemDataUrl?: string | null;
};

export type RelatorioDiarioPDF = {
  id: string;
  operador_nome: string;
  turno: string | null;
  data_referencia: string;
  created_at: string;
  itens: RelatorioItemPDF[];
};

function formatDataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function addPageIfNeeded(doc: jsPDF, y: number, need: number): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + need > ph - 40) {
    doc.addPage();
    return 60;
  }
  return y;
}

export async function gerarPDF(r: RelatorioDiarioPDF): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFillColor(20, 20, 22);
  doc.rect(0, 0, W, 90, "F");
  doc.setFillColor(245, 200, 30);
  doc.rect(0, 90, W, 4, "F");

  doc.setFillColor(245, 200, 30);
  doc.rect(32, 22, 44, 44, "F");
  doc.setTextColor(20, 20, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("OM", 42, 52);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("OPERAÇÃO MINERODUTO", 90, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("Relatório Diário de Atividades Operacionais", 90, 60);

  doc.setTextColor(245, 200, 30);
  doc.setFontSize(8);
  doc.text(`ID: ${r.id.slice(0, 8).toUpperCase()}`, W - 32, 44, { align: "right" });
  doc.setTextColor(255, 255, 255);
  doc.text(`Dia: ${formatDataBR(r.data_referencia)}`, W - 32, 60, { align: "right" });

  y = 130;
  doc.setTextColor(20, 20, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELATÓRIO DO DIA", 32, y);
  y += 8;
  doc.setDrawColor(245, 200, 30);
  doc.setLineWidth(2);
  doc.line(32, y, 200, y);
  y += 28;

  const meta: [string, string][] = [
    ["OPERADOR", r.operador_nome],
    ["DATA", formatDataBR(r.data_referencia)],
    ["ESCALA", rotuloTurno(r.turno)],
    ["OCORRÊNCIAS", String(r.itens.length)],
  ];

  doc.setFontSize(9);
  meta.forEach((row, i) => {
    const col = i % 2;
    const line = Math.floor(i / 2);
    const x = 32 + col * ((W - 64) / 2);
    const yy = y + line * 38;
    doc.setFillColor(245, 246, 248);
    doc.rect(x, yy, (W - 64) / 2 - 8, 30, "F");
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.text(row[0], x + 10, yy + 12);
    doc.setTextColor(20, 20, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(row[1], (W - 64) / 2 - 28), x + 10, yy + 24);
    doc.setFontSize(9);
  });
  y += Math.ceil(meta.length / 2) * 38 + 20;

  if (r.itens.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhuma ocorrência ou atividade registrada neste dia.", 32, y);
    y += 24;
  }

  r.itens.forEach((item, index) => {
    y = addPageIfNeeded(doc, y, 120);
    const hora = new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    doc.setFillColor(245, 200, 30);
    doc.rect(32, y - 4, 6, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 22);
    doc.text(`${index + 1}. ${item.equipamento} — ${item.setor}`, 44, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${item.tipo_atividade || "Atividade"} • ${hora}`, 44, y + 22);
    y += 34;

    const desc = item.descricao_ia || item.observacoes || "Sem descrição.";
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(desc, W - 64);
    y = addPageIfNeeded(doc, y, lines.length * 13 + 20);
    doc.text(lines, 32, y);
    y += lines.length * 13 + 8;

    if (item.observacoes && item.descricao_ia) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Observações do operador:", 32, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      const obs = doc.splitTextToSize(item.observacoes, W - 64);
      y = addPageIfNeeded(doc, y, obs.length * 12 + 10);
      doc.text(obs, 32, y);
      y += obs.length * 12 + 8;
    }

    if (item.imagemDataUrl) {
      try {
        y = addPageIfNeeded(doc, y, 260);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text("Registro fotográfico", 32, y);
        y += 12;
        const imgW = W - 64;
        const maxH = 200;
        doc.addImage(item.imagemDataUrl, "JPEG", 32, y, imgW, maxH, undefined, "FAST");
        y += maxH + 16;
      } catch {
        /* ignore */
      }
    }

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(32, y, W - 32, y);
    y += 20;
  });

  y = addPageIfNeeded(doc, y, 50);
  y = Math.max(y, doc.internal.pageSize.getHeight() - 80);
  doc.setDrawColor(20, 20, 22);
  doc.line(32, y, 260, y);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`${r.operador_nome} — Operador responsável`, 32, y + 12);

  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 200, 30);
  doc.rect(0, ph - 18, W, 18, "F");
  doc.setTextColor(20, 20, 22);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("OPERAÇÃO MINERODUTO • RELATÓRIO DIÁRIO", W / 2, ph - 6, { align: "center" });

  return doc.output("blob");
}

export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
