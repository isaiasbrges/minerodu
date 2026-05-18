
-- Operadores (linked to auth.users)
CREATE TABLE public.operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  setor TEXT,
  turno TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operadores podem ver todos" ON public.operadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador insere proprio" ON public.operadores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operador atualiza proprio" ON public.operadores FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Relatorios
CREATE TABLE public.relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operador_nome TEXT NOT NULL,
  setor TEXT NOT NULL,
  equipamento TEXT NOT NULL,
  tipo_atividade TEXT,
  observacoes TEXT,
  descricao_ia TEXT,
  imagem_url TEXT,
  pdf_url TEXT,
  turno TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem relatorios" ON public.relatorios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario cria proprio relatorio" ON public.relatorios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario atualiza proprio relatorio" ON public.relatorios FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario deleta proprio relatorio" ON public.relatorios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_relatorios_created ON public.relatorios(created_at DESC);
CREATE INDEX idx_relatorios_user ON public.relatorios(user_id);

-- Trigger to create operador on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.operadores (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('relatorios', 'relatorios', true);

CREATE POLICY "Public read relatorios" ON storage.objects FOR SELECT USING (bucket_id = 'relatorios');
CREATE POLICY "Auth upload relatorios" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'relatorios');
CREATE POLICY "Auth update relatorios" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'relatorios');
CREATE POLICY "Auth delete relatorios" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'relatorios');
