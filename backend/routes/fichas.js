// routes/fichas.js
// Modelo de rota CRUD - use este arquivo como referência para criar
// caixa.js, freezer.js, insumos.js, relatorios.js e lembretes.js.
// Corresponde ao nó "registrosBarbearia" do banco.

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken, exigirMaster } = require('../middleware/auth');

const CAMINHO = 'registrosBarbearia';

// GET /api/fichas?mes=08/2026  -> lista fichas, com filtro opcional por mês
router.get('/', verificarToken, async (req, res) => {
  try {
    const snapshot = await db.ref(CAMINHO).once('value');
    const dados = snapshot.val() || {};
    let lista = Object.keys(dados).map(id => ({ id, ...dados[id] }));

    const { mes } = req.query; // formato "MM/AAAA", igual ao usado no front hoje
    if (mes) {
      lista = lista.filter(reg => reg.data && reg.data.slice(3) === mes);
    }

    res.json(lista);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar fichas.' });
  }
});

// POST /api/fichas -> cria uma nova ficha
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
    res.status(500).json({ erro: 'Erro ao salvar ficha.' });
  }
});

// PUT /api/fichas/:id -> atualiza uma ficha (ex: marcar como paga)
router.put('/:id', verificarToken, exigirMaster, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).update(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar ficha.' });
  }
});

// DELETE /api/fichas/:id -> exclui uma ficha
router.delete('/:id', verificarToken, exigirMaster, async (req, res) => {
  try {
    await db.ref(`${CAMINHO}/${req.params.id}`).remove();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir ficha.' });
  }
});

module.exports = router;
