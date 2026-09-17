document.getElementById('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const erroEl = document.getElementById('mensagem-erro');
    erroEl.style.display = 'none';

    try {
        const resposta = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            erroEl.textContent = dados.erro || 'E-mail ou senha incorretos.';
            erroEl.style.display = 'block';
            return;
        }

        window.location.href = '/';
    } catch (erro) {
        erroEl.textContent = 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
        erroEl.style.display = 'block';
    }
});
