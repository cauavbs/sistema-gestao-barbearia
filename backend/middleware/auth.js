// middleware/auth.js
// Substitui as checagens de "onAuthStateChanged" + "perfil !== 'master'"
// que hoje ficam soltas em cada HTML. Agora essa verificação acontece
// no servidor, em toda requisição, e não pode ser burlada pelo navegador.

const { admin, db } = require('../firebaseAdmin');

// Confirma que a requisição veio de um usuário logado (token válido do Firebase Auth)
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Usar DEPOIS de verificarToken nas rotas restritas a administradores
// (equivalente ao "perfil !== 'master'" que existia no front-end)
async function exigirMaster(req, res, next) {
  try {
    const snapshot = await db.ref(`usuarios/${req.uid}`).once('value');
    const usuario = snapshot.val();

    if (!usuario || usuario.perfil !== 'master') {
      return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao verificar permissão.' });
  }
}

module.exports = { verificarToken, exigirMaster };
