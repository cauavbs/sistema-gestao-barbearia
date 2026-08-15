// js/api.js
// Camada única de comunicação do front-end com o backend.
// Importe este arquivo nas páginas no lugar de "getDatabase/ref/onValue" do Firebase.
// O Firebase Auth continua sendo usado só para LOGIN (auth.currentUser, onAuthStateChanged).

const API_BASE = 'http://localhost:3000/api'; // trocar pela URL do servidor quando publicar

async function chamarApi(caminho, opcoes = {}) {
  const auth = window.firebaseAuth; // definido em cada página (ver login.html / index.html)
  const usuario = auth.currentUser;

  if (!usuario) {
    window.location.href = '/login.html';
    return;
  }

  const token = await usuario.getIdToken();

  const resposta = await fetch(`${API_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opcoes.headers || {})
    }
  });

  if (resposta.status === 401) {
    window.location.href = '/login.html';
    return;
  }
  if (resposta.status === 403) {
    alert('Acesso negado. Apenas administradores podem realizar esta ação.');
    return;
  }
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.erro || 'Erro na requisição.');
  }

  return resposta.status === 204 ? null : resposta.json();
}

const api = {
  usuarios: {
    meuPerfil: () => chamarApi('/usuarios/me')
  },
  fichas: {
    listar: (mes) => chamarApi(`/fichas${mes ? `?mes=${mes}` : ''}`),
    criar: (dados) => chamarApi('/fichas', { method: 'POST', body: JSON.stringify(dados) }),
    atualizar: (id, dados) => chamarApi(`/fichas/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
    excluir: (id) => chamarApi(`/fichas/${id}`, { method: 'DELETE' })
  },
  barbeiros: {
    listar: () => chamarApi('/barbeiros'),
    salvarLista: (lista) => chamarApi('/barbeiros', { method: 'PUT', body: JSON.stringify({ lista }) })
  },
  insumos: {
    criar: (dados) => chamarApi('/insumos', { method: 'POST', body: JSON.stringify(dados) })
  }
};
