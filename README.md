# Sistema Barbearia — Backend

Backend em Flask para o sistema de gestão da barbearia. O front-end é HTML/Jinja2 servido pelo próprio Flask; o banco de dados é o Firebase Realtime Database, acessado exclusivamente pelo servidor (Admin SDK) — nunca diretamente pelo navegador.

## Páginas e APIs

| Página                    | Rota            | API                |
|---------------------------|-----------------|--------------------|
| Login                     | `/login`        | —                  |
| Fichas e Faturamento      | `/`             | `/api/fichas`      |
| Classificação e Troco     | `/classificacao`| `/api/caixa`       |
| Vendas do Freezer         | `/freezer`      | `/api/freezer`     |
| Insumos e Contas          | `/insumos`      | `/api/insumos`     |
| Resultados do Mês         | `/resultados`   | `/api/resultados`  |
| Gráfico Comparativo       | `/grafico`      | `/api/grafico`     |
| Relatórios e Ocorrências  | `/relatorio`    | `/api/relatorios`  |
| Lembretes e Prazos        | `/lembrete`     | `/api/lembretes`   |
| Gestão de Perfis          | `/perfis`       | `/api/perfis`      |

Fichas e Faturamento aceita qualquer usuário logado (master ou barbeiro); as demais páginas exigem perfil master.

## Observações

- As taxas de débito/crédito ficam salvas no Firebase (`configuracoesBarbearia/taxasMaquina`), então valem em qualquer dispositivo que acessar o sistema.
- Excluir um perfil em Gestão de Perfis apaga a conta correspondente no Firebase Auth, revogando o acesso por completo.
- A tela de Gestão de Perfis grava e exibe a senha do funcionário em texto puro (coluna "Senha" na tabela). É uma prática arriscada — qualquer pessoa com acesso de leitura ao banco vê todas as senhas. Pode ser removido depois, mantendo só a criação/troca de senha sem guardar o valor.
- Como a API não usa listeners em tempo real, as listas atualizam ao salvar, excluir, filtrar ou recarregar a página — não refletem automaticamente mudanças feitas em outro dispositivo. Dá pra resolver isso depois com atualização periódica ou WebSockets, se fizer falta no dia a dia.
- Se o e-mail `cauadev@barbearia.com` tentar logar e a conta ainda não existir, o backend cria essa conta automaticamente com perfil `master`.

## Instalação

### 1. Dependências

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

### 2. Credencial do Firebase (Admin SDK)

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e abra o projeto `barbearia-sistema-6df17`.
2. Vá em **Configurações do projeto** (ícone de engrenagem) → **Contas de serviço**.
3. Clique em **Gerar nova chave privada** → confirme o download.
4. Renomeie o arquivo baixado para `firebase-credentials.json` e coloque na raiz do projeto (mesma pasta do `app.py`).

⚠️ Esse arquivo dá acesso total ao banco — nunca subir para o GitHub (já está no `.gitignore`).

### 3. Variáveis de ambiente

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

Ajuste `SECRET_KEY` para um valor aleatório. `FIREBASE_API_KEY` e `FIREBASE_DATABASE_URL` já vêm preenchidos.

### 4. Ícones do PWA

Copiar `icon-192.png` e `icon-512.png` para dentro de `static/`.

### 5. Rodar o servidor

```bash
python app.py
```

Acesse **http://localhost:5000/login**.

Como o servidor sobe em `0.0.0.0`, também dá pra acessar de outro aparelho na mesma rede Wi-Fi usando o IP local da máquina (ex: `http://192.168.0.10:5000/login`).

## Deploy no Vercel

Para rodar no Vercel (runtime Python):

- Definir `FIREBASE_CREDENTIALS_JSON` como variável de ambiente (colando o conteúdo do JSON), em vez de `FIREBASE_CREDENTIALS_PATH` — o `firebase_service.py` já lida com as duas formas.
- Criar um `vercel.json` apontando para `app.py` como função serverless.
- Trocar o `app.run(...)` de debug por um ponto de entrada compatível com o builder Python do Vercel.

## Estrutura do projeto

```
barbearia-backend/
├── app.py                     # ponto de entrada Flask
├── config.py                  # lê o .env
├── servicos/
│   ├── firebase_service.py    # único ponto de acesso ao Firebase
│   └── formatacao.py          # formatação de moeda (R$)
├── autenticacao/
│   ├── rotas.py                # /login, /logout, /api/me
│   └── decoradores.py          # login_obrigatorio, somente_master
├── paginas/
│   └── rotas.py                # renderiza cada página (templates)
├── api/
│   ├── fichas.py                # Fichas e Faturamento + lista de barbeiros
│   ├── caixa.py                 # Classificação e Troco + taxas de cartão
│   ├── freezer.py               # Vendas do Freezer
│   ├── insumos.py               # Insumos e Contas
│   ├── perfis.py                 # Gestão de Perfis (via Admin SDK)
│   ├── grafico.py               # Gráfico Comparativo (multi-mês)
│   ├── lembretes.py
│   ├── relatorios.py
│   └── resultados.py
├── templates/                  # HTML (Jinja2), extendendo base.html
└── static/                     # CSS, JS, manifest, ícones
```
