// Comportamento compartilhado por todas as páginas do painel:
// - abrir/fechar a sidebar
// - botão "Sair" (chama /logout no backend)
// - mostrar o alerta de "Acesso Negado" quando o backend redireciona
//   de volta pra Fichas com ?erro=acesso_negado
// - esconder do menu os links restritos a master, pra quem for barbeiro
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

    // Um barbeiro só enxerga Fichas e Faturamento e Relatórios e
    // Ocorrências no menu — os demais links (.link-admin) ficam
    // restritos a master. Isso roda em toda página (via base.html),
    // então vale independente de qual tela a pessoa estiver.
    try {
        const respostaMe = await fetch('/api/me');
        const eu = await respostaMe.json();
        if (eu.perfil !== 'master') {
            document.querySelectorAll('.link-admin').forEach(el => el.style.display = 'none');
        }
    } catch (erro) {
        console.log('Não foi possível verificar o perfil do usuário: ', erro);
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('App Registrado com sucesso!'))
            .catch(err => console.log('Falha ao registrar o App: ', err));
    });
}

