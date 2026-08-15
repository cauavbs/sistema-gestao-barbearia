// routes/usuarios.js
// Corresponde ao nó "usuarios" do banco (perfis: master / comum, etc).
// Gestão de perfis é sensível -> restrita a "master".

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken, exigirMaster } = require('../middleware/auth');

const CAMINHO = 'usuarios';

// Retorna o perfil do próprio usuário logado (qualquer usuário autenticado pode ver o seu)
router.get('/me', verificarToken, async (req, res) => {
  try {
    const snapshot = await db.ref(`${CAMINHO}/${req.uid}`).once('value');
    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
});

// Lista todos os usuários (só master)
router.get('/', verificarToken, exigirMaster, async (req, res) => {
  try {
    const snapshot = await db.ref(CAMINHO).once('value');
    const dados = snapshot.val() || {};
    const lista = Object.keys(dados).map(uid => ({ uid, ...dados[uid] }));
    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuários.' });
  }
});

// Atualiza o perfil de um usuário (ex: promover a master) - só master
router.put('/:uid', verificarToken, exigirMaster, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.uid}`).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

module.exports = router;
