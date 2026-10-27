# Pousada Moradas do Gabriel — Portal Web, Guia do Hóspede & Painel Admin

Plataforma web completa da **Pousada Moradas do Gabriel**, reunindo **Landing Page Institucional**, **Catálogo de Acomodações**, **Central de Links Rápidos (Linktree)**, **Guia Digital do Hóspede** e **Painel Administrativo CMS** com visualização em tempo real e telemetria de acessos.

---

## ✨ Funcionalidades Principais

### 🌐 Páginas Públicas
- **Landing Page (`/`)**:
  - Header flutuante dinâmico que acompanha a rolagem da página.
  - **Hero Section** com carrossel interativo por tópicos (*Acomodações*, *Praias*, *Destinos* e *Sobre a Pousada*).
  - **Seção Institucional ("Sobre a Pousada")** com foto editorial e *Bento Grid* de diferenciais.
  - **Vitrine de Acomodações** com resumo de capacidade, configuração de camas e comodidades principais.
  - **Mapa Interativo & Como Chegar** com atalhos diretos para Google Maps e Waze.
  - **Rodapé Formal** com dados institucionais, horários de check-in/check-out e contatos.
- **Página Individual da Acomodação (`/acomodacoes/:slug`)**:
  - Galeria interativa de fotos, descrição completa, distribuição detalhada de camas/tamanhos, comodidades (*Cozinha*, *Ar-condicionado*, *Smart TV*, *Wi-Fi*, *Varanda*, *Pet Friendly*, etc.) e CTA direto para reserva via WhatsApp.
- **Central de Links Rápidos (`/links`)**:
  - Lista ordenada de botões e links oficiais da pousada com ícones personalizados e rastreamento de cliques.
- **Guia Digital do Hóspede (`/guia-do-hospede`)**:
  - **Wi-Fi da Pousada**: múltiplas redes com cópia de senha em 1 clique.
  - **Localização e Navegação**: endereço completo, mapa incorporado e abertura rápida no Google Maps / Waze.
  - **Regras e Horários de Convivência**: informações essenciais da estadia.
  - **Curadoria da Pousada (Dicas de Lugares)**: recomendações filtráveis por categoria (*Gastronomia*, *Praias*, *Passeios*, *Mercados*) com carrossel de fotos, lightbox em tela cheia e mapa lado a lado.

### 🔐 Painel Administrativo (`/admin` e `/login`)
- **Dashboard de Métricas**: contagem de visitas, cliques por link, senhas de Wi-Fi copiadas, aberturas de mapa e interações nas dicas do guia.
- **Editor da Landing Page**: edição do carrossel Hero, seção Sobre, destaques e rodapé com **Preview do Componente em Tempo Real**.
- **Gerenciador de Acomodações**: cadastro completo de suítes e apartamentos, camas, comodidades, foto de capa e galeria com preview do card ao vivo.
- **Editor do Guia do Hóspede**: gerenciamento de redes Wi-Fi, contatos (com máscaras automáticas), regras, localização e dicas de lugares com upload de múltiplas fotos e preview interativo.
- **Gerenciador de Links**: criação, ativação/desativação e reordenação de links da página `/links`.

---

## 🛠️ Stack Tecnológica

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 8](https://vite.dev/) (com React Compiler)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Estado Assíncrono & Cache**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Roteamento**: [React Router v7](https://reactrouter.com/)
- **Backend & Autenticação**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Row Level Security e Edge Functions em Deno)
- **Armazenamento de Imagens & CDN**: [Cloudflare R2 Object Storage](https://developers.cloudflare.com/r2/) com conversão automática para `.webp` no cliente e assinatura AWS Signature V4 na Edge Function

---

## 🛡️ Arquitetura de Segurança

O projeto foi desenhado seguindo práticas de defesa em profundidade para produção:

1. **Zero Exposição de Credenciais do R2 no Frontend**:
   - Nenhuma chave secreta (`R2_SECRET_ACCESS_KEY` ou `R2_ACCESS_KEY_ID`) utiliza o prefixo `VITE_` ou é incluída no bundle do navegador.
   - Todo upload passa pela Supabase Edge Function [`supabase/functions/r2-upload/index.ts`](./supabase/functions/r2-upload/index.ts), que assina a requisição `PUT` via **AWS Signature V4** nativo (`crypto.subtle`) no servidor.
2. **Validação Estrita de Imagens**:
   - Conversão automática no navegador para `.webp` via `<canvas>` (removendo metadados EXIF/GPS e reduzindo o peso).
   - No servidor (`r2-upload`), o arquivo é validado pelos **magic bytes reais** do binário (aceitando apenas `JPEG`, `PNG` e `WebP` até 5 MB e bloqueando `SVG` ou scripts para impedir *Stored XSS*).
   - Nome do objeto gerado exclusivamente no servidor com `crypto.randomUUID()` em pastas restritas por allowlist (`acomodacoes`, `hero`, `sobre`, `lugares`).
3. **Row Level Security (RLS) com Allowlist de Administradores**:
   - A migration [`20261027_security_hardening.sql`](./supabase/migrations/20261027_security_hardening.sql) define a tabela `public.admin_users` (inacessível via API pública) e a função `public.is_admin()` (`SECURITY DEFINER`, `SET search_path = ''`).
   - Apenas administradores presentes em `public.admin_users` possuem permissão de escrita (`INSERT`, `UPDATE`, `DELETE`) nas tabelas `links`, `business_info` e `accommodations`, ou leitura de `analytics_events`.
4. **Sanitização de URLs e Iframes**:
   - Todas as URLs externas passam por `sanitizeHttpUrl` (bloqueando esquemas `javascript:`, `data:`, `vbscript:`).
   - Iframes de mapas passam por `extractEmbedUrl` e atributo `sandbox`, permitindo exclusivamente origens `https://` oficiais do Google Maps (`www.google.com/maps` e `maps.google.com/maps`).

---

## 📁 Estrutura de Pastas

```text
├── public/                        # Favicons e ativos estáticos públicos
├── src/
│   ├── @types/                    # Tipagens do banco Supabase (database.types.ts)
│   ├── assets/                    # Logos e recursos visuais
│   ├── components/
│   │   ├── admin/                 # Editores do Painel Admin (Landing, Acomodações, Guia, Links)
│   │   └── public/                # Componentes das abas públicas (Guia do Hóspede, Links)
│   ├── contexts/                  # AuthContext e ProtectedRoute com verificação is_admin()
│   ├── hooks/                     # Hooks customizados (useAuth, usePortalData com React Query)
│   ├── lib/                       # Instância do cliente Supabase
│   ├── pages/
│   │   ├── admin/                 # AdminDashboard (/admin)
│   │   ├── auth/                  # LoginPage (/login) com proteção contra força bruta
│   │   └── public/                # LandingPage (/), AccommodationDetailPage, PublicPortal
│   ├── services/                  # Camada de acesso a dados (Supabase + R2 Upload Service)
│   └── utils/                     # Sanitização de URLs/Embeds, máscaras e mapeamento de ícones
└── supabase/
    ├── config.toml                # Configuração do projeto e Edge Functions no Supabase
    ├── functions/
    │   └── r2-upload/             # Edge Function Deno para upload autenticado no Cloudflare R2
    └── migrations/                # Migrations SQL (Acomodações e Hardening de Segurança/RLS)
```

---

## 🚀 Como Executar e Configurar

### 1. Pré-requisitos
- **Node.js** 20+ e **npm**
- Projeto criado no **Supabase**
- Bucket criado no **Cloudflare R2** (conectado a um Custom Domain, ex: `https://cdn.moradasdogabriel.com.br`)

### 2. Instalação Local
```bash
git clone <url-do-repositorio>
cd linktree-moradasgabriel
npm install
```

Crie o arquivo `.env` na raiz (baseando-se no [`.env.example`](./.env.example)) contendo as variáveis públicas do Supabase:
```env
VITE_SUPABASE_URL="https://SEU_PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="sua_chave_publica_anon_ou_publishable"
```

### 3. Configurar o Banco de Dados (Migrations no Supabase)
No **SQL Editor** do painel do Supabase, execute na ordem:
1. [`supabase/migrations/20261026_create_accommodations_and_landing.sql`](./supabase/migrations/20261026_create_accommodations_and_landing.sql)
2. [`supabase/migrations/20261027_security_hardening.sql`](./supabase/migrations/20261027_security_hardening.sql)

Para adicionar um e-mail como administrador autorizado:
```sql
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'admin@moradasdogabriel.com.br'
ON CONFLICT DO NOTHING;
```

### 4. Configurar Segredos e Publicar a Edge Function `r2-upload`
Configure os segredos do Cloudflare R2 no Supabase (via **Dashboard → Edge Functions → Secrets** ou CLI) e faça o deploy da função:

```bash
npx supabase secrets set \
  R2_ACCOUNT_ID="seu_account_id_cloudflare" \
  R2_BUCKET_NAME="moradas-do-gabriel-images" \
  R2_ACCESS_KEY_ID="seu_r2_access_key_id" \
  R2_SECRET_ACCESS_KEY="seu_r2_secret_access_key" \
  R2_PUBLIC_URL="https://cdn.moradasdogabriel.com.br" \
  ALLOWED_ORIGINS="https://moradasdogabriel.com.br,http://localhost:5173"

npx supabase functions deploy r2-upload --no-verify-jwt
```

### 5. Comandos Disponíveis
```bash
# Servidor de desenvolvimento local (http://localhost:5173)
npm run dev

# Checagem de tipos (App + Node + Edge Functions) e Build de produção
npm run build

# Verificação de código com ESLint
npm run lint

# Visualizar build de produção localmente
npm run preview
```

---

## 📄 Licença
Projeto proprietário desenvolvido para a **Pousada Moradas do Gabriel**. Todos os direitos reservados.
