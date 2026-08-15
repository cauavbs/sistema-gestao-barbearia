// routes/freezer.js
// Corresponde ao nó "registrosFreezer" do banco (vendas do freezer).

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken } = require('../middleware/auth');

const CAMINHO = 'registrosFreezer';

// GET /api/freezer?mes=08/2026 -> lista vendas do freezer, com filtro opcional por mês
router.get('/', verificarToken, async (req, res) => {
  try {
    const snapshot = await db.ref(CAMINHO).once('value');
    const dados = snapshot.val() || {};
    let lista = Object.keys(dados).map(id => ({ id, ...dados[id] }));

    const { mes } = req.query; // formato "MM/AAAA"
    if (mes) {
      lista = lista.filter(reg => reg.data && reg.data.slice(3) === mes);
    }

    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar vendas do freezer.' });
  }
});

// POST /api/freezer -> registra uma venda do freezer
router.post('/', verificarToken, async (req, res) => {
  try {
    const novoRegistro = {
      ...req.body,
      criadoPor: req.uid,
      timestamp: Date.now()
    };
    const novaRef = await db.ref(CAMINHO).push(novoRegistro);
    res.status(201).json({ id: novaRef.key, ...novoRegistro });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar venda do freezer.' });
  }
});

// PUT /api/freezer/:id -> atualiza uma venda do freezer
router.put('/:id', verificarToken, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar venda do freezer.' });
  }
});

// DELETE /api/freezer/:id -> exclui uma venda do freezer
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).remove();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir venda do freezer.' });
  }
});

module.exports = router;
