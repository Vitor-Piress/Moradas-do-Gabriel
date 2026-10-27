-- ============================================================================
-- MIGRATION: TABELA DE ACOMODAÇÕES (accommodations) + RLS + DADOS INICIAIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_guests INTEGER NOT NULL DEFAULT 2,
  beds JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_kitchen BOOLEAN NOT NULL DEFAULT false,
  has_kitchen_utensils BOOLEAN NOT NULL DEFAULT false,
  has_tv BOOLEAN NOT NULL DEFAULT true,
  has_ac BOOLEAN NOT NULL DEFAULT true,
  has_wifi BOOLEAN NOT NULL DEFAULT true,
  has_balcony BOOLEAN NOT NULL DEFAULT false,
  has_private_bathroom BOOLEAN NOT NULL DEFAULT true,
  has_bed_bath_linen BOOLEAN NOT NULL DEFAULT true,
  is_pet_friendly BOOLEAN NOT NULL DEFAULT false,
  extra_amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca rápida por slug e ordenação na Landing Page
CREATE INDEX IF NOT EXISTS idx_accommodations_slug ON public.accommodations (slug);
CREATE INDEX IF NOT EXISTS idx_accommodations_active_position ON public.accommodations (is_active, position);

-- Habilitar RLS
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (RLS)
DROP POLICY IF EXISTS "Public can view active accommodations" ON public.accommodations;
DROP POLICY IF EXISTS "Authenticated users can manage accommodations" ON public.accommodations;

-- Visitantes públicos (anon) podem visualizar apenas acomodações ativas
CREATE POLICY "Public can view active accommodations"
  ON public.accommodations
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Administradores autenticados têm controle total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Authenticated users can manage accommodations"
  ON public.accommodations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DADOS INICIAIS DE DEMONSTRAÇÃO (Podem ser editados ou removidos no /admin)
-- ============================================================================
INSERT INTO public.accommodations (
  title,
  slug,
  short_description,
  full_description,
  cover_image,
  gallery,
  max_guests,
  beds,
  has_kitchen,
  has_kitchen_utensils,
  has_tv,
  has_ac,
  has_wifi,
  has_balcony,
  has_private_bathroom,
  has_bed_bath_linen,
  is_pet_friendly,
  position
)
VALUES
  (
    'Suíte Casal Brisa do Mar',
    'suite-casal-brisa-do-mar',
    'Ideal para casais que buscam descanso e privacidade a poucos minutos da praia, com ambiente climatizado e varanda.',
    'A Suíte Casal Brisa do Mar foi planejada para proporcionar dias tranquilos e acolhedores. Conta com cama Queen Size, ar-condicionado split silencioso, Smart TV, frigobar e varanda privativa com rede de descanso para curtir a brisa costeira após um dia de praia.',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    '["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    2,
    '[{"count": 1, "type": "Cama Casal Queen"}]'::jsonb,
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    1
  ),
  (
    'Apartamento Família Sol Nascente',
    'apartamento-familia-sol-nascente',
    'Espaço amplo com cozinha equipada, ideal para famílias ou pequenos grupos que desejam conforto e autonomia durante a estadia.',
    'O Apartamento Família Sol Nascente acomoda até 4 pessoas com total comodidade. Possui cozinha compacta equipada com fogão, geladeira e utensílios básicos, além de quarto climatizado, Wi-Fi de alta velocidade, Smart TV e espaço arejado para toda a família.',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    '["https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    4,
    '[{"count": 1, "type": "Cama de Casal Padrão"}, {"count": 2, "type": "Cama de Solteiro"}]'::jsonb,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    2
  ),
  (
    'Estúdio Conforto do Gabriel',
    'estudio-conforto-do-gabriel',
    'Praticidade e charme para até 3 hóspedes, contando com copa de apoio, ar-condicionado e excelente iluminação natural.',
    'Perfeito para casais com criança ou amigos, o Estúdio Conforto do Gabriel combina praticidade e aconchego. Dispõe de cama de casal e cama auxiliar de solteiro, frigobar, utensílios de apoio, banheiro privativo amplo, TV e roupas de cama e banho inclusas.',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    '["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    3,
    '[{"count": 1, "type": "Cama de Casal Padrão"}, {"count": 1, "type": "Cama de Solteiro"}]'::jsonb,
    false,
    true,
    true,
    true,
    true,
    false,
    true,
    true,
    false,
    3
  )
ON CONFLICT (slug) DO NOTHING;

