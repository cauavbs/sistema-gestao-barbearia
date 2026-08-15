// routes/relatorios.js
// Corresponde ao nó "registrosRelatorios" do banco.
// Restrito a usuários com perfil "master" (antes isso era checado só no front).

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken, exigirMaster } = require('../middleware/auth');

const CAMINHO = 'registrosRelatorios';

router.get('/', verificarToken, exigirMaster, async (req, res) => {
  try {
    const snapshot = await db.ref(CAMINHO).once('value');
    const dados = snapshot.val() || {};
    let lista = Object.keys(dados).map(id => ({ id, ...dados[id] }));

    const { mes } = req.query; // "MM/AAAA"
    if (mes) {
      lista = lista.filter(reg => reg.data && reg.data.slice(3) === mes);
    }
    lista.sort((a, b) => b.timestamp - a.timestamp);

    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar relatórios.' });
  }
});

router.post('/', verificarToken, exigirMaster, async (req, res) => {
  try {
    const novoRegistro = {
      data: req.body.data,
      texto: req.body.texto,
      timestamp: Date.now()
    };
    const novaRef = await db.ref(CAMINHO).push(novoRegistro);
    res.status(201).json({ id: novaRef.key, ...novoRegistro });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar relatório.' });
  }
});

router.delete('/:id', verificarToken, exigirMaster, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).remove();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir relatório.' });
  }
});

module.exports = router;
