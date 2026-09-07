// Service Worker do Sistema Barbearia.
//
// Só os arquivos estáticos (CSS, JS, ícones, manifest) são
// pré-cacheados na instalação, porque eles são públicos (não passam
// por login). As páginas do painel (index, insumos, freezer, etc.)
// exigem login — pré-cachear todas de uma vez faria um barbeiro comum
// receber 403 nas páginas exclusivas de master, e isso derrubaria a
// instalação inteira do Service Worker (cache.addAll aborta tudo se
// uma única requisição falhar).
//
// Por isso as páginas (e qualquer outro GET) entram no cache aos
// poucos: toda vez que o usuário abre uma página com sucesso estando
// online, a resposta é guardada; se depois tentar abrir a mesma
// página sem internet, o Service Worker usa essa cópia salva.

const CACHE_NAME = 'barbearia-app-v3';

const ARQUIVOS_ESTATICOS = [
  '/static/style.css',
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/js/comum.js',
  '/static/js/login.js',
  '/static/js/fichas.js',
  '/static/js/classificacao.js',
  '/static/js/freezer.js',
  '/static/js/insumos.js',
  '/static/js/resultados.js',
  '/static/js/grafico.js',
  '/static/js/relatorio.js',
  '/static/js/lembrete.js',
  '/static/js/perfis.js',
];

// Instalação do Service Worker: guarda os arquivos estáticos (públicos).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARQUIVOS_ESTATICOS))
  );
  self.skipWaiting();
});

// Ativação: apaga versões antigas do cache.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nomes =>
      Promise.all(
        nomes.map(nome => (nome !== CACHE_NAME ? caches.delete(nome) : null))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: tenta a rede primeiro (dados sempre atualizados, já que é
// um sistema financeiro). Se der certo, guarda uma cópia no cache pra
// uso offline futuro. Se a rede falhar (sem internet), tenta servir do
// cache; se não tiver nada salvo, a falha segue normalmente.
self.addEventListener('fetch', event => {
  const { request } = event;

  // Só GET entra nessa lógica. POST/PUT/DELETE (criar, pagar, excluir
  // fichas etc.) nunca devem ser cacheados nem "simulados" offline —
  // é melhor falhar visivelmente do que fingir que salvou.
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(resposta => {
        // Só guarda respostas realmente bem-sucedidas e do próprio site
        // (evita cachear erros, redirecionamentos ou páginas de login
        // servidas por engano no lugar de uma página protegida).
        if (resposta.ok && resposta.type === 'basic') {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(request))
  );
});
