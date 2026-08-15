// routes/caixa.js
// Corresponde ao nó "registrosCaixa" do banco (taxas de máquina, etc).

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken } = require('../middleware/auth');

const CAMINHO = 'registrosCaixa';

// GET /api/caixa?mes=08/2026 -> lista lançamentos de caixa, com filtro opcional por mês
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
    res.status(500).json({ erro: 'Erro ao buscar caixa.' });
  }
});

// POST /api/caixa -> cria um novo lançamento de caixa
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
    res.status(500).json({ erro: 'Erro ao salvar lançamento de caixa.' });
  }
});

// PUT /api/caixa/:id -> atualiza um lançamento de caixa
router.put('/:id', verificarToken, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar lançamento de caixa.' });
  }
});

// DELETE /api/caixa/:id -> exclui um lançamento de caixa
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).remove();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir lançamento de caixa.' });
  }
});

module.exports = router;
