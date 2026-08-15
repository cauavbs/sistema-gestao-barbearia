// firebaseAdmin.js
// Inicializa o Firebase Admin SDK. Este é o único lugar do sistema
// que deve ter acesso total (irrestrito) ao banco de dados.
//
// Como obter o serviceAccountKey.json:
// 1. Console do Firebase > Configurações do Projeto > Contas de serviço
// 2. Clique em "Gerar nova chave privada"
// 3. Salve o arquivo baixado como "serviceAccountKey.json" nesta pasta (backend/)
//    (esse arquivo NUNCA deve ir para o front-end nem para o GitHub)

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

module.exports = { admin, db };
