# 🍃 Giardino App — Vercel + Supabase

## Passo a Passo Completo

---

### ETAPA 1 — Supabase (banco de dados)

1. Acesse **supabase.com** → clique **Start your project** → crie conta com Google ou e-mail
2. Clique **New Project** → escolha um nome (ex: `giardino`) → defina uma senha forte → clique **Create project** (aguarde ~2 min)
3. No menu lateral clique em **SQL Editor** → clique **New query**
4. Copie **todo o conteúdo** do arquivo `supabase-schema.sql` e cole no editor → clique **Run**
5. No menu lateral vá em **Project Settings → API**
6. Anote:
   - **Project URL** (ex: `https://xyzxyz.supabase.co`)
   - **service_role** key (em "Project API keys" → clique em "Reveal")

---

### ETAPA 2 — GitHub (código)

1. Acesse **github.com** → crie conta gratuita se não tiver
2. Clique **"+"** no topo → **New repository** → nome: `giardino-app` → **Create repository**
3. Na página do repo vazio, clique **"uploading an existing file"**
4. Extraia o ZIP e arraste **todos os arquivos** para o GitHub → clique **Commit changes**

---

### ETAPA 3 — Vercel (hospedagem)

1. Acesse **vercel.com** → clique **Sign Up** → entre com GitHub
2. Clique **Add New → Project** → selecione o repositório `giardino-app`
3. Clique **Environment Variables** e adicione:
   - `SUPABASE_URL` = sua Project URL do Supabase
   - `SUPABASE_SERVICE_KEY` = sua service_role key do Supabase
   - `JWT_SECRET` = uma senha forte (ex: `GiardinoApp2026!Segredo`)
4. Clique **Deploy** → aguarde ~1 minuto
5. Sua URL estará disponível (ex: `giardino-app.vercel.app`)

---

### ETAPA 4 — Carregar dados da planilha

1. Abra no navegador: `https://SUA-URL.vercel.app/api/seed?secret=SUA_JWT_SECRET`
   - Substitua `SUA-URL` pela URL do Vercel
   - Substitua `SUA_JWT_SECRET` pelo valor que você colocou em `JWT_SECRET`
2. Você verá: `{"ok":true,"message":"Seed completo: 268 insumos, 171 fichas, 77 transformados"}`

---

### ETAPA 5 — Primeiro acesso

1. Abra a URL no celular ou computador
2. Na tela **"Primeiro Acesso"** → crie seu usuário admin (nome, usuário, senha)
3. Faça login → app funcionando!

---

### Instalar como app no celular

- **iPhone/iPad**: Safari → botão Compartilhar → "Adicionar à Tela de Início"
- **Android**: Chrome → menu ⋮ → "Adicionar à tela inicial"

---

## Perfis de usuário

| Perfil | O que pode fazer |
|--------|-----------------|
| **Admin** | Tudo + gerenciar usuários |
| **Editor** | Criar, editar, excluir fichas/insumos/transformados |
| **Visualizador** | Apenas visualizar (para cozinheiros) |
