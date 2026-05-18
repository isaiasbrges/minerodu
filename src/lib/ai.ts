// Generates a professional industrial report description from raw observations.
// Future: replace with OpenAI / Lovable AI Gateway call.

export function gerarRelatorioIA(input: {
  observacoes: string;
  equipamento: string;
  setor: string;
  tipoAtividade?: string;
}): string {
  const obs = (input.observacoes || "").trim();
  if (!obs) return "";

  const equipUp = input.equipamento.toUpperCase();
  const setor = input.setor;
  const tipo = (input.tipoAtividade || "inspeção operacional").toLowerCase();

  const lower = obs.toLowerCase();

  let achado = obs.charAt(0).toUpperCase() + obs.slice(1);
  let acao = "Equipe responsável segue avaliando o ponto conforme procedimento operacional padrão.";

  if (/vazamento|leak/.test(lower)) {
    achado = `identificado vazamento no conjunto do equipamento ${equipUp}`;
    acao = "Nota de manutenção permanece em aberto para avaliação e correção pela equipe responsável.";
  } else if (/ruido|ruído|vibra/.test(lower)) {
    achado = `detectado nível anormal de ruído/vibração no equipamento ${equipUp}`;
    acao = "Recomenda-se inspeção mecânica detalhada e acompanhamento contínuo do parâmetro.";
  } else if (/parad|desliga|stop/.test(lower)) {
    achado = `verificada parada operacional no equipamento ${equipUp}`;
    acao = "Equipe de operação acionada para diagnóstico e retomada do processo conforme procedimento.";
  } else if (/temperatura|aquec|quent/.test(lower)) {
    achado = `registrada elevação de temperatura no equipamento ${equipUp}`;
    acao = "Monitoramento intensificado e equipe de manutenção preditiva notificada.";
  } else if (/normal|ok|operando/.test(lower)) {
    achado = `equipamento ${equipUp} operando dentro dos parâmetros normais`;
    acao = "Atividade registrada sem ocorrências relevantes. Operação segue conforme planejamento.";
  } else {
    achado = `${obs} — equipamento ${equipUp}`;
  }

  return [
    `Durante ${tipo} no setor ${setor}, foi ${achado}.`,
    acao,
    `Relatório registrado para fins de rastreabilidade operacional e histórico técnico.`,
  ].join(" ");
}
