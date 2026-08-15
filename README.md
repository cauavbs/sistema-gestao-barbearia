# Sistema Barbearia — estrutura em 3 camadas

```
frontend/    → HTML/CSS/JS que você já tinha (ainda usa Firebase Auth só p/ login)
backend/     → API Node.js/Express (fala com o banco via Admin SDK)
database/    → documentação da estrutura do Realtime Database
```

## Como rodar o backend

```bash
cd backend
npm install
cp .env.example .env          # depois edite o .env com sua FIREBASE_DATABASE_URL
```

Baixe a chave de serviço do Firebase (Console > Configurações do projeto >
Contas de serviço > Gerar nova chave privada) e salve como
`sistema-barbearia/serviceAccountKey.json` (fora da pasta backend, um nível
acima — o `firebaseAdmin.js` já espera esse caminho).

```bash
npm start          # ou: npm run dev (com nodemon, reinicia sozinho)
```

O servidor sobe em `http://localhost:3000`.

## O que falta fazer nas páginas do front-end

Isto é um **modelo** com a rota de `fichas` (`registrosBarbearia`) totalmente
funcional de ponta a ponta, e as rotas de caixa/freezer/insumos/relatórios/
lembretes/usuários já criadas no backend (`backend/routes/`).

Para cada página HTML (`index.html`, `freezer.html`, `insumos.html`,
`relatorio.html`, `lembrete.html`, `resultados.html`, `perfis.html`):

1. Mantenha o `import` do Firebase Auth (login/logout continuam no cliente).
2. Remova o `import` e as chamadas de `getDatabase/ref/onValue/push/remove/update`.
3. Inclua `<script src="js/api.js"></script>` e troque essas chamadas pelas
   funções equivalentes de `api.js` (siga o padrão de `api.fichas`).
4. Rode o backend localmente (`npm run dev`) e sirva o front-end com uma
   extensão tipo "Live Server", ou aponte `API_BASE` em `api.js` para onde
   o backend estiver publicado.

## Próximo passo sugerido

Migrar primeiro o `index.html` (fichas) — é o único que já tem rota 100%
pronta no backend — para validar o fluxo de ponta a ponta antes de repetir
o padrão nas outras 6 páginas.
