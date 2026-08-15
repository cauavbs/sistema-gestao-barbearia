// routes/lembretes.js
// Corresponde ao nó "registrosLembretes" do banco.
// Restrito a usuários com perfil "master".

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken, exigirMaster } = require('../middleware/auth');

const CAMINHO = 'registrosLembretes';

router.get('/', verificarToken, exigirMaster, async (req, res) => {
  try {
    const snapshot = await db.ref(CAMINHO).once('value');
    const dados = snapshot.val() || {};
    const lista = Object.keys(dados)
      .map(id => ({ id, ...dados[id] }))
      .sort((a, b) => new Date(a.dataISO) - new Date(b.dataISO));

    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar lembretes.' });
  }
});

router.post('/', verificarToken, exigirMaster, async (req, res) => {
  try {
    const novoRegistro = {
      dataISO: req.body.dataISO,
      dataBR: req.body.dataBR,
      texto: req.body.texto
    };
    const novaRef = await db.ref(CAMINHO).push(novoRegistro);
    res.status(201).json({ id: novaRef.key, ...novoRegistro });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar lembrete.' });
  }
});

// Reprogramar (atualizar data)
router.put('/:id', verificarToken, exigirMaster, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar lembrete.' });
  }
});

// Concluir/excluir
router.delete('/:id', verificarToken, exigirMaster, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).remove();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir lembrete.' });
  }
});

module.exports = router;
