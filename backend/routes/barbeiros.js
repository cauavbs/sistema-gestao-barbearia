// routes/barbeiros.js
// Corresponde ao nó "barbeirosBarbearia" do banco: um array simples de nomes.
// Qualquer usuário logado pode LISTAR (precisa aparecer no formulário de fichas);
// só "master" pode ALTERAR a lista (adicionar/editar/remover).

const express = require('express');
const router = express.Router();
const { db } = require('../firebaseAdmin');
const { verificarToken, exigirMaster } = require('../middleware/auth');

const CAMINHO = 'barbeirosBarbearia';
const PADRAO = ['Barbeiro 1', 'Barbeiro 2', 'Barbeiro 3'];

// GET /api/barbeiros -> retorna a lista (array de nomes)
router.get('/', verificarToken, async (req, res) => {
  try {
    const snapshot = await db.ref(CAMINHO).once('value');
    const dados = snapshot.val();

    if (dados) {
      const lista = Array.isArray(dados) ? dados : Object.values(dados);
      return res.json(lista);
    }

    // Se nunca existiu, cria a lista padrão (mesmo comportamento do front antigo)
    await db.ref(CAMINHO).set(PADRAO);
    res.json(PADRAO);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar barbeiros.' });
  }
});

// PUT /api/barbeiros -> substitui a lista inteira. Body: { lista: ["Nome 1", "Nome 2"] }
router.put('/', verificarToken, exigirMaster, async (req, res) => {
  try {
    const { lista } = req.body;
    if (!Array.isArray(lista)) {
      return res.status(400).json({ erro: 'Envie { lista: [...] } com um array de nomes.' });
    }
    await db.ref(CAMINHO).set(lista);
    res.json({ ok: true, lista });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar barbeiros.' });
  }
});

module.exports = router;
