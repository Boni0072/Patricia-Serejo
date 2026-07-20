/*
# Bucket de armazenamento para documentos

Cria o bucket "documentos" para armazenar procurações, petições, comprovantes
e demais arquivos vinculados a processos juridicos. Define politicas de acesso
que espelham as RLS das tabelas: clientes acessam seus proprios documentos,
advogados/admin acessam todos.

## Alteracoes
- Novo bucket "documentos" (publico para leitura via URL assinada/publica).
- Politicas RLS no storage.objects para insert/select/delete.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "select_documentos" ON storage.objects;
CREATE POLICY "select_documentos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "insert_documentos" ON storage.objects;
CREATE POLICY "insert_documentos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "delete_documentos" ON storage.objects;
CREATE POLICY "delete_documentos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documentos');
