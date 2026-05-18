-- Relatório por dia: cabeçalho (relatorios) + ocorrências/atividades (relatorio_itens)

ALTER TABLE public.relatorios
  ADD COLUMN IF NOT EXISTS data_referencia DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.relatorios
SET data_referencia = (created_at AT TIME ZONE 'UTC')::date
WHERE data_referencia IS NULL;

CREATE TABLE IF NOT EXISTS public.relatorio_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id UUID NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  setor TEXT NOT NULL,
  equipamento TEXT NOT NULL,
  tipo_atividade TEXT,
  observacoes TEXT,
  descricao_ia TEXT,
  imagem_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrar registros antigos (1 ocorrência por linha antiga)
INSERT INTO public.relatorio_itens (
  relatorio_id, setor, equipamento, tipo_atividade, observacoes, descricao_ia, imagem_url, ordem, created_at
)
SELECT
  id, setor, equipamento, tipo_atividade, observacoes, descricao_ia, imagem_url, 0, created_at
FROM public.relatorios r
WHERE NOT EXISTS (
  SELECT 1 FROM public.relatorio_itens i WHERE i.relatorio_id = r.id
)
AND r.setor IS NOT NULL
AND r.equipamento IS NOT NULL;

-- Unificar cabeçalhos duplicados (mesmo operador + mesmo dia)
DO $$
DECLARE
  rec RECORD;
  keep_id UUID;
  dup_id UUID;
  i INT;
BEGIN
  FOR rec IN
    SELECT user_id, data_referencia, array_agg(id ORDER BY created_at) AS ids
    FROM public.relatorios
    WHERE data_referencia IS NOT NULL
    GROUP BY user_id, data_referencia
    HAVING count(*) > 1
  LOOP
    keep_id := rec.ids[1];
    FOR i IN 2..array_length(rec.ids, 1) LOOP
      dup_id := rec.ids[i];
      UPDATE public.relatorio_itens SET relatorio_id = keep_id WHERE relatorio_id = dup_id;
      DELETE FROM public.relatorios WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.relatorios
  ALTER COLUMN data_referencia SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_relatorios_user_data
  ON public.relatorios (user_id, data_referencia);

CREATE INDEX IF NOT EXISTS idx_relatorio_itens_relatorio
  ON public.relatorio_itens (relatorio_id, ordem, created_at);

ALTER TABLE public.relatorio_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem itens"
  ON public.relatorio_itens FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuario insere itens no proprio relatorio"
  ON public.relatorio_itens FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relatorios r
      WHERE r.id = relatorio_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuario atualiza itens do proprio relatorio"
  ON public.relatorio_itens FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.relatorios r
      WHERE r.id = relatorio_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuario deleta itens do proprio relatorio"
  ON public.relatorio_itens FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.relatorios r
      WHERE r.id = relatorio_id AND r.user_id = auth.uid()
    )
  );

-- Campos de ocorrência passam a viver só em relatorio_itens
ALTER TABLE public.relatorios
  DROP COLUMN IF EXISTS setor,
  DROP COLUMN IF EXISTS equipamento,
  DROP COLUMN IF EXISTS tipo_atividade,
  DROP COLUMN IF EXISTS observacoes,
  DROP COLUMN IF EXISTS descricao_ia,
  DROP COLUMN IF EXISTS imagem_url;

CREATE INDEX IF NOT EXISTS idx_relatorios_data ON public.relatorios (data_referencia DESC);
