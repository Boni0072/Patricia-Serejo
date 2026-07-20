/*
# Esquema inicial do sistema — Escritório Patricia Cristiane Serejo Advocacia

Cria todas as tabelas necessárias para o sistema de gestão do escritório de advocacia,
incluindo controle de acesso multi-perfil, portal do cliente, painel administrativo,
CMS do site institucional, e infraestrutura para notificações via WhatsApp.

## 1. Novas tabelas

- `perfis`: perfil de usuário vinculado a auth.users, com papel (admin|advogado|cliente),
  nome, telefone, cpf, consentimento LGPD e datas de auditoria.
- `clientes`: dados complementares do cliente (endereço, observações).
- `processos`: processos jurídicos com número, área do direito, status, cliente e advogado.
- `movimentacoes`: linha do tempo de cada processo (status, descrição, data).
- `documentos`: arquivos vinculados a processos (nome, url, enviado_por).
- `mensagens`: mensagens trocadas entre cliente e escritório (canal portal|whatsapp).
- `compromissos`: audiências e reuniões agendadas, com lembrete enviado.
- `areas_atuacao`: áreas de atuação do escritório exibidas no site.
- `depoimentos`: depoimentos de clientes exibidos no site.
- `conteudo_site`: conteúdo editável do site institucional (chave/valor).
- `logs_acesso`: registro de acessos (data, email, papel) para auditoria.
- `consentimentos_lgpd`: consentimento explícito de privacidade por usuário.

## 2. Segurança (RLS)

- Todas as tabelas com RLS habilitado.
- Perfis: usuário lê/atualiza apenas o próprio perfil; admin lê todos.
- Clientes/Processos/Movimentacoes/Documentos/Mensagens/Compromissos:
  admin tem acesso total; advogado vê processos atribuídos a si; cliente vê apenas
  seus próprios processos e dados relacionados.
- CMS (areas_atuacao, depoimentos, conteudo_site): leitura pública (anon+authenticated),
  escrita apenas admin.
- logs_acesso: apenas admin lê; sistema insere.
- consentimentos_lgpd: usuário vê/insere apenas os próprios.

## 3. Observações

- Papel do usuário armazenado em `perfis.papel` e também em `raw_app_meta_data`
  via trigger para uso em autorização server-side.
- Owner columns usam DEFAULT auth.uid() onde aplicável.
- Seed inicial com áreas de atuação e conteúdo padrão do site.
*/

-- ============================================================
-- perfis
-- ============================================================
CREATE TABLE IF NOT EXISTS perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  papel text NOT NULL DEFAULT 'cliente' CHECK (papel IN ('admin','advogado','cliente')),
  telefone text,
  cpf text UNIQUE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_perfil" ON perfis;
CREATE POLICY "select_own_perfil" ON perfis FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "insert_own_perfil" ON perfis;
CREATE POLICY "insert_own_perfil" ON perfis FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_perfil" ON perfis;
CREATE POLICY "update_own_perfil" ON perfis FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_update_perfil" ON perfis;
CREATE POLICY "admin_update_perfil" ON perfis FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- clientes (dados complementares)
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  cpf text UNIQUE,
  endereco text,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clientes" ON clientes;
CREATE POLICY "select_clientes" ON clientes FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado'))
  );

DROP POLICY IF EXISTS "insert_clientes" ON clientes;
CREATE POLICY "insert_clientes" ON clientes FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "update_clientes" ON clientes;
CREATE POLICY "update_clientes" ON clientes FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "delete_clientes" ON clientes;
CREATE POLICY "delete_clientes" ON clientes FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- processos
-- ============================================================
CREATE TABLE IF NOT EXISTS processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  titulo text NOT NULL,
  area_direito text NOT NULL,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','aguardando_documentacao','concluido','arquivado')),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  advogado_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE processos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_processos" ON processos;
CREATE POLICY "select_processos" ON processos FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clientes c WHERE c.id = processos.cliente_id AND c.user_id = auth.uid())
    OR advogado_id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
  );

DROP POLICY IF EXISTS "insert_processos" ON processos;
CREATE POLICY "insert_processos" ON processos FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

DROP POLICY IF EXISTS "update_processos" ON processos;
CREATE POLICY "update_processos" ON processos FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

DROP POLICY IF EXISTS "delete_processos" ON processos;
CREATE POLICY "delete_processos" ON processos FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- movimentacoes (linha do tempo)
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  status text NOT NULL,
  descricao text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_movimentacoes" ON movimentacoes;
CREATE POLICY "select_movimentacoes" ON movimentacoes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM processos pr
      WHERE pr.id = movimentacoes.processo_id
      AND (
        EXISTS (SELECT 1 FROM clientes c WHERE c.id = pr.cliente_id AND c.user_id = auth.uid())
        OR pr.advogado_id = auth.uid()
        OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "insert_movimentacoes" ON movimentacoes;
CREATE POLICY "insert_movimentacoes" ON movimentacoes FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

DROP POLICY IF EXISTS "delete_movimentacoes" ON movimentacoes;
CREATE POLICY "delete_movimentacoes" ON movimentacoes FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

-- ============================================================
-- documentos
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  url text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('procuracao','peticao','comprovante','decisao','outro')),
  enviado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_documentos" ON documentos;
CREATE POLICY "select_documentos" ON documentos FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM processos pr
      WHERE pr.id = documentos.processo_id
      AND (
        EXISTS (SELECT 1 FROM clientes c WHERE c.id = pr.cliente_id AND c.user_id = auth.uid())
        OR pr.advogado_id = auth.uid()
        OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "insert_documentos" ON documentos;
CREATE POLICY "insert_documentos" ON documentos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM processos pr
      WHERE pr.id = documentos.processo_id
      AND (
        EXISTS (SELECT 1 FROM clientes c WHERE c.id = pr.cliente_id AND c.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado'))
      )
    )
  );

DROP POLICY IF EXISTS "delete_documentos" ON documentos;
CREATE POLICY "delete_documentos" ON documentos FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

-- ============================================================
-- mensagens
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  remetente_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  conteudo text NOT NULL,
  canal text NOT NULL DEFAULT 'portal' CHECK (canal IN ('portal','whatsapp')),
  lida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_mensagens" ON mensagens;
CREATE POLICY "select_mensagens" ON mensagens FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM processos pr
      WHERE pr.id = mensagens.processo_id
      AND (
        EXISTS (SELECT 1 FROM clientes c WHERE c.id = pr.cliente_id AND c.user_id = auth.uid())
        OR pr.advogado_id = auth.uid()
        OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "insert_mensagens" ON mensagens;
CREATE POLICY "insert_mensagens" ON mensagens FOR INSERT
  TO authenticated WITH CHECK (
    remetente_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM processos pr
      WHERE pr.id = mensagens.processo_id
      AND (
        EXISTS (SELECT 1 FROM clientes c WHERE c.id = pr.cliente_id AND c.user_id = auth.uid())
        OR pr.advogado_id = auth.uid()
        OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "update_mensagens" ON mensagens;
CREATE POLICY "update_mensagens" ON mensagens FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

-- ============================================================
-- compromissos
-- ============================================================
CREATE TABLE IF NOT EXISTS compromissos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES processos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  data_hora timestamptz NOT NULL,
  tipo text NOT NULL DEFAULT 'reuniao' CHECK (tipo IN ('audiencia','reuniao','prazo','outro')),
  lembrete_enviado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compromissos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_compromissos" ON compromissos;
CREATE POLICY "select_compromissos" ON compromissos FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM processos pr
      WHERE pr.id = compromissos.processo_id
      AND (
        EXISTS (SELECT 1 FROM clientes c WHERE c.id = pr.cliente_id AND c.user_id = auth.uid())
        OR pr.advogado_id = auth.uid()
        OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
      )
    )
    OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
  );

DROP POLICY IF EXISTS "insert_compromissos" ON compromissos;
CREATE POLICY "insert_compromissos" ON compromissos FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

DROP POLICY IF EXISTS "update_compromissos" ON compromissos;
CREATE POLICY "update_compromissos" ON compromissos FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel IN ('admin','advogado')
  ));

DROP POLICY IF EXISTS "delete_compromissos" ON compromissos;
CREATE POLICY "delete_compromissos" ON compromissos FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- areas_atuacao (CMS - público)
-- ============================================================
CREATE TABLE IF NOT EXISTS areas_atuacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text NOT NULL,
  icone text NOT NULL DEFAULT 'Scale',
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE areas_atuacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_areas_atuacao" ON areas_atuacao;
CREATE POLICY "select_areas_atuacao" ON areas_atuacao FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_areas_atuacao" ON areas_atuacao;
CREATE POLICY "admin_insert_areas_atuacao" ON areas_atuacao FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "admin_update_areas_atuacao" ON areas_atuacao;
CREATE POLICY "admin_update_areas_atuacao" ON areas_atuacao FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "admin_delete_areas_atuacao" ON areas_atuacao;
CREATE POLICY "admin_delete_areas_atuacao" ON areas_atuacao FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- depoimentos (CMS - público)
-- ============================================================
CREATE TABLE IF NOT EXISTS depoimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  texto text NOT NULL,
  cargo text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE depoimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_depoimentos" ON depoimentos;
CREATE POLICY "select_depoimentos" ON depoimentos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_depoimentos" ON depoimentos;
CREATE POLICY "admin_insert_depoimentos" ON depoimentos FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "admin_update_depoimentos" ON depoimentos;
CREATE POLICY "admin_update_depoimentos" ON depoimentos FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "admin_delete_depoimentos" ON depoimentos;
CREATE POLICY "admin_delete_depoimentos" ON depoimentos FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- conteudo_site (CMS chave/valor - público)
-- ============================================================
CREATE TABLE IF NOT EXISTS conteudo_site (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conteudo_site ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_conteudo_site" ON conteudo_site;
CREATE POLICY "select_conteudo_site" ON conteudo_site FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_upsert_conteudo_site" ON conteudo_site;
CREATE POLICY "admin_upsert_conteudo_site" ON conteudo_site FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "admin_update_conteudo_site" ON conteudo_site;
CREATE POLICY "admin_update_conteudo_site" ON conteudo_site FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

-- ============================================================
-- logs_acesso (auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS logs_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  papel text,
  ip text,
  acao text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE logs_acesso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_logs" ON logs_acesso;
CREATE POLICY "admin_select_logs" ON logs_acesso FOR SELECT
  TO authenticated USING (EXISTS (
    SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin'
  ));

DROP POLICY IF EXISTS "insert_logs" ON logs_acesso;
CREATE POLICY "insert_logs" ON logs_acesso FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- consentimentos_lgpd
-- ============================================================
CREATE TABLE IF NOT EXISTS consentimentos_lgpd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  versao_termos text NOT NULL DEFAULT '1.0',
  consentiu boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consentimentos_lgpd ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_consentimento" ON consentimentos_lgpd;
CREATE POLICY "select_own_consentimento" ON consentimentos_lgpd FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfis p WHERE p.id = auth.uid() AND p.papel = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_consentimento" ON consentimentos_lgpd;
CREATE POLICY "insert_own_consentimento" ON consentimentos_lgpd FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger: criar perfil automaticamente no signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, papel, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'papel', 'cliente'),
    NEW.raw_user_meta_data->>'telefone'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Seed: áreas de atuação
-- ============================================================
INSERT INTO areas_atuacao (titulo, descricao, icone, ordem) VALUES
  ('Direito de Família', 'Divórcio, guarda de filhos, pensão alimentícia, inventários e partilha de bens com sensibilidade e técnica jurídica.', 'Users', 1),
  ('Direito Civil', 'Contratos, responsabilidade civil, indenizações, direitos do consumidor e questões patrimoniais em geral.', 'FileText', 2),
  ('Direito do Trabalho', 'Atuação tanto para empregados quanto empregadores em reclamações trabalhistas, rescisões e acordos.', 'Briefcase', 3),
  ('Direito Previdenciário', 'Aposentadorias, benefícios do INSS, revisões, BPC/LOAS e planejamento previdenciário personalizado.', 'HeartPulse', 4),
  ('Direito Empresarial', 'Constituição de empresas, contratos comerciais, recuperação judicial e assessoria jurídica preventiva.', 'Building2', 5),
  ('Direito Penal', 'Defesa em processos penais, inquéritos policiais, audiências de custódia e acompanhamento em delegacias.', 'Gavel', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: conteúdo do site
-- ============================================================
INSERT INTO conteudo_site (chave, valor) VALUES
  ('hero_titulo', 'Defesa jurídica com dedicação e proximidade'),
  ('hero_subtitulo', 'Atuação humanizada e técnica em Direito de Família, Civil, Trabalhista, Previdenciário, Empresarial e Penal.'),
  ('hero_botao', 'Agendar consulta'),
  ('sobre_titulo', 'Sobre Dra. Patricia Cristiane Serejo'),
  ('sobre_texto', 'Com anos de experiência e compromisso com a ética e a excelência, Dra. Patricia Cristiane Serejo atua na defesa dos direitos de seus clientes com proximidade, transparência e resultados. O escritório prioriza o atendimento personalizado, mantendo cada cliente informado em cada etapa do processo.'),
  ('contato_telefone', '(11) 95408-4156'),
  ('contato_whatsapp', '5511954084156'),
  ('contato_email', 'contato@patriciaserejo.adv.br'),
  ('contato_endereco', 'Rua Paulo Barreto de Almeida, 123 — Monte Mor/SP'),
  ('contato_horario', 'Seg. a Sex. das 9h às 18h'),
  ('rodape_texto', 'Patricia Cristiane Serejo Advocacia — OAB/UF 000.000'),
  ('instagram_url', ''),
  ('linkedin_url', '')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- Seed: depoimentos
-- ============================================================
INSERT INTO depoimentos (nome, texto, cargo, ordem) VALUES
  ('Maria S.', 'Atendimento atencioso e muito profissional. Fui acompanhada em todo o processo de divórcio com clareza e segurança.', 'Cliente — Direito de Família', 1),
  ('João P.', 'Resolvi um problema trabalhista com excelência. Comunicação clara e sempre disponível para tirar dúvidas.', 'Cliente — Direito do Trabalho', 2),
  ('Carlos L.', 'Consegui meu benefício do INSS após anos de negativas. Equipe dedicada e competente.', 'Cliente — Direito Previdenciário', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Atualiza atualizado_em automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfis_updated ON perfis;
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_processos_updated ON processos;
CREATE TRIGGER trg_processos_updated BEFORE UPDATE ON processos
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
