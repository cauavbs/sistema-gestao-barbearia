// server.js
// Ponto de entrada do backend. Roda com: npm start (ou npm run dev com nodemon)

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // comprovantes em base64 podem passar do limite padrão (100kb)

const fichasRoutes = require('./routes/fichas');
const barbeirosRoutes = require('./routes/barbeiros');
const caixaRoutes = require('./routes/caixa');
const freezerRoutes = require('./routes/freezer');
const insumosRoutes = require('./routes/insumos');
const relatoriosRoutes = require('./routes/relatorios');
const lembretesRoutes = require('./routes/lembretes');
const usuariosRoutes = require('./routes/usuarios');

app.use('/api/fichas', fichasRoutes);
app.use('/api/barbeiros', barbeirosRoutes);
app.use('/api/caixa', caixaRoutes);
app.use('/api/freezer', freezerRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/lembretes', lembretesRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend do Sistema Barbearia rodando na porta ${PORT}`);
});
