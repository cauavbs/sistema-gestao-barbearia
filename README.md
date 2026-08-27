# Sistema Barbearia — Backend em Python

O que mudou em relação ao projeto antigo:

- **Antes:** cada página HTML se conectava direto no Firebase pelo navegador
  (Firebase Auth + Realtime Database via SDK de cliente). Não existia
  nenhum servidor próprio.
- **Agora:** existe um backend em **Flask (Python)** entre o front-end e o
  Firebase. O HTML virou só a "casca" visual — todo fetch de dados,
  autenticação e regra de acesso ("só master pode ver isso") passa a
  acontecer no servidor.
- O **Firebase continua sendo o banco de dados** (Realtime Database), como
  você pediu — só que agora só o servidor Python fala com ele, usando a
  conta de serviço (Admin SDK), e não mais o navegador do usuário.

## O que já está pronto

Todas as 9 páginas do sistema original foram migradas — não sobrou nenhuma chamada direta ao Firebase no HTML, tudo passa pelo backend Python agora.

| Página                    | Status                                          |
|---------------------------|--------------------------------------------------|
| Login                     | ✅ migrado (autenticação via backend)             |
| Fichas e Faturamento      | ✅ migrado (API `/api/fichas`)                    |
| Classificação e Troco     | ✅ migrado (API `/api/caixa`)                     |
| Vendas do Freezer         | ✅ migrado (API `/api/freezer`)                   |
| Insumos e Contas          | ✅ migrado (API `/api/insumos`)                   |
| Resultados do Mês         | ✅ migrado (API `/api/resultados`)                |
| Gráfico Comparativo       | ✅ migrado (API `/api/grafico`)                   |
| Relatórios e Ocorrências  | ✅ migrado (API `/api/relatorios`)                |
| Lembretes e Prazos        | ✅ migrado (API `/api/lembretes`)                 |
| Gestão de Perfis          | ✅ migrado (API `/api/perfis`, via Admin SDK)     |

## Diferenças e melhorias em relação ao original

Durante a migração encontrei alguns pontos no código original que valem
a pena você saber:

- **Taxas de débito/crédito**: antes ficavam salvas no `localStorage`
  do navegador (cada aparelho tinha seu próprio valor). Agora ficam
  salvas no Firebase (`configuracoesBarbearia/taxasMaquina`) e valem
  para qualquer dispositivo que o master usar.
- **Autocomplete de barbeiros em Gestão de Perfis**: no `perfis.html`
  original, essa lista era lida do `localStorage`, mas quem escreve a
  lista de barbeiros é o `index.html` — que sempre salvou no Firebase.
  Ou seja, esse autocomplete nunca funcionava de verdade. Corrigido
  para usar a mesma fonte (`/api/fichas/barbeiros`).
- **Excluir um perfil agora também revoga o login de verdade**: no
  original, apagar um perfil só removia o registro do banco — a conta
  no Firebase Auth continuava válida, e por um detalhe do código
  (perfil ausente virava `'comum'`, que por acidente tinha acesso
  igual ao master em várias telas) a pessoa removida ainda conseguia
  logar com acesso total. Corrigido: excluir um perfil agora também
  apaga a conta no Firebase Auth.
- **Editar senha de um perfil ficou mais simples e mais seguro**: o
  original precisava reautenticar com a senha antiga (e usava uma
  segunda instância do Firebase no navegador pra não deslogar o
  admin). Como o backend usa o Admin SDK, ele troca a senha de
  qualquer usuário diretamente, sem precisar da senha antiga.
- **Atenção (mantido como estava, não uma melhoria)**: a tela de
  Gestão de Perfis grava e exibe a senha do funcionário em texto
  puro no banco (coluna "Senha" na tabela). Isso já existia no
  sistema original e eu mantive o mesmo comportamento por não ser
  algo que você pediu para mudar — mas é uma prática arriscada (se
  alguém tiver acesso de leitura ao banco, vê todas as senhas). Se
  quiser, posso tirar esse campo depois e deixar só a criação/troca
  de senha, sem guardar o valor em lugar nenhum.


## Passo a passo para rodar no seu PC

### 1. Instalar as dependências

Abra um terminal dentro da pasta do projeto:

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

### 2. Gerar a chave da conta de serviço do Firebase (Admin SDK)

Essa é a chave que dá ao servidor Python permissão para ler/escrever no
seu Realtime Database (o app não usa mais as regras públicas de cliente).

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
   e abra o projeto `barbearia-sistema-6df17`.
2. Vá em **Configurações do projeto** (ícone de engrenagem) → **Contas de
   serviço**.
3. Clique em **Gerar nova chave privada** → confirme o download.
4. Renomeie o arquivo baixado para `firebase-credentials.json` e coloque
   na raiz do projeto (mesma pasta do `app.py`).

⚠️ Esse arquivo dá acesso total ao seu banco — **nunca** suba ele pro
GitHub (já está no `.gitignore`).

### 3. Configurar o `.env`

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

O `.env.example` já vem preenchido com o `FIREBASE_API_KEY` e o
`FIREBASE_DATABASE_URL` que você já usava (esses dois não são segredo,
já estavam expostos no `login.html` antigo). Só troque o `SECRET_KEY` por
qualquer valor aleatório.

### 4. Colocar os ícones do PWA

Copie os arquivos `icon-192.png` e `icon-512.png` que você já tem para
dentro da pasta `static/` deste projeto (não recriei eles aqui).

### 5. Rodar o servidor

```bash
python app.py
```

Acesse **http://localhost:5000/login** no navegador.

Como o servidor já sobe em `0.0.0.0`, também dá pra acessar de um celular
na mesma rede Wi-Fi usando o IP local do seu PC (ex:
`http://192.168.0.10:5000/login`) — sem precisar mudar nada, quando
quiser testar isso.

## Sobre a conta mestre automática

O comportamento especial que existia no `login.html` antigo foi mantido:
se o e-mail `cauadev@barbearia.com` tentar logar e a conta ainda não
existir, o backend cria essa conta automaticamente com perfil `master`.

## O que muda no dia a dia (perda do "tempo real")

Antes, as listas (lembretes, relatórios) atualizavam sozinhas em todos os
dispositivos abertos ao mesmo tempo, porque o navegador ficava "ouvindo"
o Firebase diretamente (`onValue`). Agora, como virou uma API tradicional
(igual a maioria dos sites), a lista só atualiza quando a própria página
faz uma ação (salvar, excluir, filtrar) ou é recarregada — ela não fica
mais escutando mudanças feitas em *outro* dispositivo automaticamente. Se
isso for importante pro seu dia a dia (ex: dois celulares mexendo ao
mesmo tempo), dá pra adicionar isso depois com atualização periódica ou
WebSockets — não é difícil, mas fica pra quando você quiser.

## Sobre hospedar no Vercel (mais pra frente)

Dá pra rodar Flask no Vercel (usando o runtime Python deles), mas algumas
coisas precisam ser ajustadas nessa hora:

- Trocar `FIREBASE_CREDENTIALS_PATH` por `FIREBASE_CREDENTIALS_JSON`
  (colar o conteúdo do JSON direto como variável de ambiente no painel
  da Vercel), já que lá não dá pra depender de um arquivo salvo em disco
  — o `firebase_service.py` já foi escrito pensando nisso, então essa
  parte já está pronta.
- Criar um `vercel.json` apontando pro `app.py` como função serverless.
- Trocar o `app.run(...)` de debug por um ponto de entrada compatível com
  o builder Python da Vercel.

Isso é rápido de fazer quando chegar a hora — não precisa se preocupar
com isso agora, rodando só localmente.

## Estrutura do projeto

```
barbearia-backend/
├── app.py                     # ponto de entrada Flask
├── config.py                  # lê o .env
├── servicos/
│   ├── firebase_service.py    # único ponto de acesso ao Firebase
│   └── formatacao.py          # formatação de moeda (R$) igual ao original
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

