// Comportamento compartilhado por todas as páginas do painel:
// - abrir/fechar a sidebar
// - botão "Sair" (chama /logout no backend)
// - mostrar o alerta de "Acesso Negado" quando o backend redireciona
//   de volta pra Fichas com ?erro=acesso_negado
// - registrar o service worker (PWA)

document.addEventListener('DOMContentLoaded', async function () {
    const sidebar = document.getElementById('sidebar');
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const btnClose = document.getElementById('btn-close-sidebar');
    const overlay = document.getElementById('overlay');

    function fecharMenu() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    if (btnToggle && sidebar && btnClose && overlay) {
        btnToggle.addEventListener('click', function () {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });
        btnClose.addEventListener('click', fecharMenu);
        overlay.addEventListener('click', fecharMenu);
    }

    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', function () {
            window.location.href = '/logout';
        });
    }

    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('erro') === 'acesso_negado') {
        await mostrarAlerta('Acesso Negado! Apenas administradores podem acessar esta página.');
        parametros.delete('erro');
        const query = parametros.toString();
        const novaUrl = window.location.pathname + (query ? '?' + query : '');
        window.history.replaceState({}, '', novaUrl);
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('App Registrado com sucesso!'))
            .catch(err => console.log('Falha ao registrar o App: ', err));
    });
}
