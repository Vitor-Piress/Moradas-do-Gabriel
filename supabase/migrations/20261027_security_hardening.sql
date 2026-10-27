-- ============================================================================
-- MIGRATION: HARDENING DE SEGURANÇA (Admins, RLS, Grants e Constraints)
-- ============================================================================
-- Problema corrigido: as políticas anteriores davam acesso total a QUALQUER
-- usuário autenticado ("TO authenticated USING (true)"). Como o Supabase permite
-- cadastro público por padrão, qualquer pessoa poderia criar uma conta com a
-- anon key (pública) e editar/excluir todo o conteúdo do site.
--
-- Agora, somente usuários listados em public.admin_users podem escrever dados.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela de administradores (allowlist)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Nenhum acesso direto pela API (anon/authenticated). A gestão de admins é feita
-- apenas pelo SQL Editor / service role.
REVOKE ALL ON public.admin_users FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Função is_admin() — SECURITY DEFINER para consultar a allowlist sem expor
--    a tabela. search_path vazio evita sequestro de schema.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Remove TODAS as políticas antigas das tabelas do app (nomes variados)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('links', 'business_info', 'analytics_events', 'accommodations')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
  END LOOP;
END $$;

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4. Grants mínimos (defesa em profundidade além do RLS)
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.links FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.business_info FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.accommodations FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.analytics_events FROM anon;
REVOKE SELECT ON public.analytics_events FROM anon;
REVOKE TRUNCATE ON public.links, public.business_info, public.accommodations,
  public.analytics_events FROM authenticated;

-- ----------------------------------------------------------------------------
-- 5. Políticas: LINKS
-- ----------------------------------------------------------------------------
CREATE POLICY "links_public_read_active"
  ON public.links FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "links_admin_read_all"
  ON public.links FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "links_admin_insert"
  ON public.links FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "links_admin_update"
  ON public.links FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "links_admin_delete"
  ON public.links FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 6. Políticas: BUSINESS_INFO (conteúdo público do Guia / Landing)
-- ----------------------------------------------------------------------------
CREATE POLICY "business_info_public_read"
  ON public.business_info FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "business_info_admin_insert"
  ON public.business_info FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "business_info_admin_update"
  ON public.business_info FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "business_info_admin_delete"
  ON public.business_info FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 7. Políticas: ACCOMMODATIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "accommodations_public_read_active"
  ON public.accommodations FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "accommodations_admin_read_all"
  ON public.accommodations FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "accommodations_admin_insert"
  ON public.accommodations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "accommodations_admin_update"
  ON public.accommodations FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "accommodations_admin_delete"
  ON public.accommodations FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 8. Políticas: ANALYTICS_EVENTS
--    Visitantes podem apenas INSERIR eventos válidos; só admins leem/excluem.
-- ----------------------------------------------------------------------------
CREATE POLICY "analytics_public_insert_valid"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('page_view', 'link_click', 'guide_interaction')
    AND (event_target IS NULL OR char_length(event_target) <= 200)
  );

CREATE POLICY "analytics_admin_read"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "analytics_admin_delete"
  ON public.analytics_events FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- ----------------------------------------------------------------------------
-- 9. Constraints de integridade (validação no servidor, não só no front)
--    NOT VALID: aplica a novas linhas sem falhar por dados legados.
-- ----------------------------------------------------------------------------
ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_event_type_check,
  ADD CONSTRAINT analytics_event_type_check
    CHECK (event_type IN ('page_view', 'link_click', 'guide_interaction')) NOT VALID;

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_event_target_len_check,
  ADD CONSTRAINT analytics_event_target_len_check
    CHECK (event_target IS NULL OR char_length(event_target) <= 200) NOT VALID;

-- Bloqueia esquemas perigosos (javascript:, data:, vbscript:) nos links
ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_url_scheme_check,
  ADD CONSTRAINT links_url_scheme_check
    CHECK (url ~* '^(https?://|mailto:|tel:|/|#)') NOT VALID;

ALTER TABLE public.links
  DROP CONSTRAINT IF EXISTS links_title_len_check,
  ADD CONSTRAINT links_title_len_check
    CHECK (char_length(title) BETWEEN 1 AND 150) NOT VALID;

ALTER TABLE public.accommodations
  DROP CONSTRAINT IF EXISTS accommodations_slug_format_check,
  ADD CONSTRAINT accommodations_slug_format_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') NOT VALID;

ALTER TABLE public.accommodations
  DROP CONSTRAINT IF EXISTS accommodations_cover_https_check,
  ADD CONSTRAINT accommodations_cover_https_check
    CHECK (cover_image = '' OR cover_image ~* '^https://') NOT VALID;

ALTER TABLE public.accommodations
  DROP CONSTRAINT IF EXISTS accommodations_guests_check,
  ADD CONSTRAINT accommodations_guests_check
    CHECK (max_guests BETWEEN 1 AND 50) NOT VALID;

-- Limita o tamanho do JSONB de metadados (evita abuso de armazenamento)
ALTER TABLE public.business_info
  DROP CONSTRAINT IF EXISTS business_info_metadata_size_check,
  ADD CONSTRAINT business_info_metadata_size_check
    CHECK (metadata IS NULL OR pg_column_size(metadata) <= 512000) NOT VALID;

-- ============================================================================
-- 10. Cadastro inicial de administrador(es)
--     Garante que o primeiro usuário já existente em auth.users (proprietário)
--     seja registrado como admin caso a tabela esteja vazia no momento da
--     migration. Novos usuários criados posteriormente NÃO entram nesta tabela.
-- ============================================================================
INSERT INTO public.admin_users (user_id)
SELECT id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.admin_users)
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;

-- Para adicionar outro administrador manualmente pelo SQL Editor:
-- INSERT INTO public.admin_users (user_id)
-- SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_ADMIN@exemplo.com'
-- ON CONFLICT DO NOTHING;

