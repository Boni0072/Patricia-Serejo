-- Tabela para armazenar segredos da aplicação, como chaves de API.
-- Os valores são criptografados em repouso pelo Supabase.
create table app_secrets (
  id text primary key,
  value text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilita Row Level Security (RLS)
alter table app_secrets enable row level security;

-- Política: Apenas o service_role pode acessar os segredos.
-- Isso impede que chaves sejam expostas no lado do cliente.
create policy "Allow service_role to access secrets"
on app_secrets
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Trigger para atualizar 'updated_at'
create trigger handle_updated_at before update on app_secrets
  for each row execute procedure moddatetime (updated_at);

--
-- INSERIR SEGREDOS (APENAS EM AMBIENTE LOCAL/DESENVOLVIMENTO)
-- Em produção, insira as chaves diretamente pelo painel do Supabase.
--

-- Chave de API para o Gemini (AI Analyst)
-- Substitua '<COLE_SUA_CHAVE_AQUI>' pela sua chave real APENAS no seu Supabase local.
-- NÃO FAÇA COMMIT DA CHAVE REAL.
insert into app_secrets (id, value, description)
values ('gemini_api_key', '<COLE_SUA_CHAVE_AQUI>', 'Chave de API para o Google Gemini Pro, usada pelo AI Analyst.')
on conflict (id) do nothing;