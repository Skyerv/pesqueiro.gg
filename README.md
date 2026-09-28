# Pesqueiro.GG 🎣

Site da turma de pesca: cada um cria sua conta com e-mail e senha, registra os peixes (com foto, espécie e tamanho) e sobe no plano de carreira, de Jovem Aprendiz a CEO dos Mares.

**Tecnologias:** Next.js (hospedado na Vercel) + Supabase (login por e-mail, banco de dados e fotos). Os dois têm plano gratuito que sobra para uma turma de amigos.

---

## Passo 1: criar o projeto no Supabase

1. Crie uma conta em https://supabase.com e clique em **New project**. Escolha a região mais perto (ex.: São Paulo).
2. Com o projeto pronto, vá em **SQL Editor > New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**. Isso cria as tabelas, as regras de segurança e o espaço das fotos.
3. Vá em **Project Settings > API** (ou **Data API / API Keys**) e anote:
   - **Project URL** → vai em `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** (ou **publishable key**) → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   Nunca use a chave `service_role` / `secret` no site.

## Passo 2: subir o código para o GitHub

1. Crie um repositório (pode ser privado) em https://github.com/new.
2. Na pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Pesqueiro.GG"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```

## Passo 3: publicar na Vercel

1. Em https://vercel.com, clique em **Add New > Project** e importe o repositório.
2. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key |
   | `NEXT_PUBLIC_SITE_URL` | o endereço do site, ex.: `https://pescaria-da-turma.vercel.app` |
   | `INVITE_CODE` | opcional: um código tipo `tilapia2026` que a turma precisa digitar para criar conta |

3. Clique em **Deploy**. Anote o endereço final do site.

   Se você só descobrir o endereço depois do primeiro deploy, adicione `NEXT_PUBLIC_SITE_URL` e faça **Redeploy**.

## Passo 4: ligar o login por e-mail ao seu site

No Supabase, vá em **Authentication > URL Configuration**:

- **Site URL:** o endereço da Vercel, ex.: `https://pescaria-da-turma.vercel.app`
- **Redirect URLs:** adicione `https://pescaria-da-turma.vercel.app/**` (e `http://localhost:3000/**` se for testar no computador)

Depois, em **Authentication > Emails** (ou **Email Templates**), ajuste dois modelos para os links funcionarem mesmo quando a pessoa abre o e-mail em outro aparelho ou app:

**Confirm signup** → troque o link por:
```html
<h2>Confirme sua conta</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Ativar minha conta no Pesqueiro.GG</a></p>
```

**Reset password** → troque o link por:
```html
<h2>Nova senha</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">Criar uma nova senha</a></p>
```

Pronto. Mande o link do site (e o código de convite, se usar) para a turma.

## Passo 5 (opcional): identificação de espécie por IA

Quando alguém escolhe a foto na tela de registro, o site manda a imagem para o Claude (IA da Anthropic), que sugere a espécie. Com confiança alta ou média a espécie já vem preenchida; com confiança baixa aparece só como sugestão. Em qualquer caso dá para trocar antes de registrar.

1. Crie uma conta em https://console.anthropic.com, adicione créditos em **Billing** e gere uma chave em **API Keys**.
2. Na Vercel, em **Settings > Environment Variables**, adicione `ANTHROPIC_API_KEY` com a chave e faça **Redeploy**.

O modelo padrão é o Claude Haiku 4.5, o mais barato, e cada foto analisada custa uma fração de centavo de dólar (preços em https://www.anthropic.com/pricing). Para acompanhar o gasto e colocar um limite mensal, use **Billing > Limits** no console. Sem a chave, o site funciona normalmente, só sem a sugestão.

A análise só roda para quem está logado. A IA acerta bem espécies comuns em fotos nítidas com o peixe inteiro de lado, e erra mais com peixes parecidos entre si, fotos escuras ou com o peixe coberto pela mão.

---

## Como funciona

- **Criar conta:** e-mail + senha. A pessoa recebe um e-mail de confirmação e, ao entrar pela primeira vez, cria o perfil com apelido e foto.
- **Ranking:** todo mundo com perfil, com cargo, total de peixes e a boia mostrando quanto falta para a próxima promoção. Ao subir de cargo aparece o aviso de promoção.
- **Perfil de cada pescador:** clique em alguém no ranking para ver total, posição, espécies, dias de pesca, maior exemplar de cada espécie e todas as fotos.
- **Mural:** todos os registros da turma, do mais novo ao mais antigo.
- **Espécies:** quantos de cada espécie a turma (ou uma pessoa) pegou.
- **Segurança:** só quem está logado vê o site. Cada um só consegue criar, editar ou apagar os próprios registros e fotos (regras no banco, não só na tela).

## Personalizar

- **Cargos e metas:** `lib/ranks.js` (lista `RANKS`).
- **Espécies da lista:** `lib/ranks.js` (lista `SPECIES`). A opção "Outra…" permite digitar qualquer espécie.
- **Cores:** variáveis no topo de `app/globals.css`.

## Rodar no computador (opcional)

```bash
cp .env.example .env.local   # e preencha os valores
npm install
npm run dev
```
Abra http://localhost:3000.

## Bom saber

- **Limite de e-mails:** o envio de e-mails padrão do Supabase é bem limitado por hora, suficiente para testar e para uma turma pequena se cadastrando aos poucos. Se muita gente for criar conta no mesmo dia, configure um SMTP próprio em **Authentication > Emails > SMTP Settings** (Resend, Brevo e similares têm plano gratuito). Outra opção é desligar a confirmação de e-mail em **Authentication > Sign In / Providers > Email > Confirm email**; aí a conta já entra direto.
- **Fotos:** ficam no bucket `fotos` do Supabase e são reduzidas no navegador antes do envio. O site só mostra para quem está logado, mas quem tiver o endereço exato de uma foto consegue abri-la.
- **Código de convite:** é uma barreira simples para estranhos com o link. Para travar de vez, depois que a turma toda se cadastrar, desligue novos cadastros em **Authentication > Sign In / Providers > Allow new users to sign up**.
- **Plano gratuito do Supabase:** projetos sem acesso por 7 dias podem ser pausados. É só entrar no painel e clicar em **Restore**.
