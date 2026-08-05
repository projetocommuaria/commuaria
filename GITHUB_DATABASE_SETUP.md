# 🚀 Guia de Solução: Banco de Dados Supabase no GitHub / GitHub Pages

Se o banco de dados do Supabase ainda não está funcionando no seu site hospedado no GitHub Pages, siga os motivos e soluções abaixo.

---

## 📌 Por que o banco não conecta no GitHub Pages por padrão?

No React + Vite, as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) são **embutidas durante o processo de compilação (BUILD)** no GitHub Actions. 

Se o GitHub rodou o deploy automático **antes** de você adicionar os Secrets, ou se as tabelas ainda não foram criadas no Supabase, o site no GitHub Pages não consegue se comunicar com a nuvem.

---

## 🛠️ Passo a Passo Definitivo para Resolver

### 1️⃣ Adicionar os Secrets no GitHub
1. Acesse seu repositório no **GitHub**.
2. Clique em **Settings** (Configurações do repositório) no menu superior do GitHub.
3. No menu lateral esquerdo, navegue até **Secrets and variables** ➔ **Actions**.
4. Clique no botão verde **New repository secret**.
5. Crie os dois segredos abaixo (respeite exatamente as letras maiúsculas):
   - **Secret 1:**
     - **Name:** `VITE_SUPABASE_URL`
     - **Secret:** `https://SUA-URL.supabase.co` (URL do seu projeto Supabase)
   - **Secret 2:**
     - **Name:** `VITE_SUPABASE_ANON_KEY`
     - **Secret:** `SJA_CHAVE_ANON_PUBLIC` (Chave pública 'anon' do seu Supabase)

---

### 2️⃣ Executar o Script SQL no Supabase
1. Acesse o painel do Supabase em [https://supabase.com](https://supabase.com).
2. Abra o seu projeto.
3. No menu lateral, vá em **SQL Editor** ➔ **New Query**.
4. Abra o arquivo `supabase_schema.sql` localizado na raiz deste repositório.
5. Copie todo o conteúdo e cole no painel do Supabase.
6. Clique em **Run**. Isso criará as tabelas `profiles`, `reports` e `news` e ativará as políticas de acesso público (RLS).

---

### 3️⃣ Refazer o Deploy no GitHub Actions (IMPORTANTE!)
Como o Vite precisa reinserir as chaves durante o Build:
1. No repositório do GitHub, acesse a aba **Actions** na parte superior.
2. Na lista do lado esquerdo, escolha **Deploy to GitHub Pages**.
3. Clique no botão **Run workflow** (no canto direito) ou selecione a última execução e clique em **Re-run all jobs**.
4. Aguarde o processo finalizar (ícone verde ✅).
5. Abra o link do seu GitHub Pages e pronto!

---

## 🔍 Como Testar no Próprio Aplicativo?
1. Abra o seu aplicativo no navegador.
2. Entre na aba **Perfil** ou **Painel**.
3. Clique no botão verde **"Gerenciar Banco & Script SQL"**.
4. Clique em **"Testar Conexão Agora"**.
   - O aplicativo fará um teste ao vivo e informará se a conexão com o Supabase Cloud está 100% confirmada ou se o app está utilizando o modo de salvamento local seguro (`LocalStorage`).
