document.addEventListener('DOMContentLoaded', function () {
    const btnAbrirForm = document.getElementById('btn-abrir-form');
    const btnCancelar = document.getElementById('btn-cancelar');
    const containerForm = document.getElementById('container-formulario');
    const formRelatorio = document.getElementById('form-relatorio');
    const dataRelatorio = document.getElementById('data-relatorio');
    const listaRelatorios = document.getElementById('lista-relatorios');
    const filtroMes = document.getElementById('filtro-mes-relatorio');
    const btnLimparFiltro = document.getElementById('btn-limpar-filtro');

    const agora = new Date();
    const hojeISO = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0') + '-' + String(agora.getDate()).padStart(2, '0');
    if (dataRelatorio) dataRelatorio.value = hojeISO;
    if (filtroMes) filtroMes.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

    if (btnAbrirForm && containerForm) {
        btnAbrirForm.addEventListener('click', function () {
            containerForm.style.display = 'block';
            btnAbrirForm.style.display = 'none';
        });
    }

    if (btnCancelar && containerForm && btnAbrirForm) {
        btnCancelar.addEventListener('click', function () {
            containerForm.style.display = 'none';
            btnAbrirForm.style.display = 'block';
            formRelatorio.reset();
            if (dataRelatorio) dataRelatorio.value = hojeISO;
        });
    }

    async function carregar() {
        const mes = filtroMes ? filtroMes.value : '';
        const url = mes ? `/api/relatorios?mes=${mes}` : '/api/relatorios';
        const resposta = await fetch(url);
        const lista = await resposta.json();
        renderizar(lista);
    }

    function renderizar(lista) {
        if (!listaRelatorios) return;
        listaRelatorios.innerHTML = '';

        if (lista.length === 0) {
            listaRelatorios.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; padding: 20px;">Nenhum relatório encontrado para este período.</p>';
            return;
        }

        lista.forEach(function (reg) {
            const card = document.createElement('div');
            card.style.cssText = 'background: white; border-left: 5px solid #0284c7; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; position: relative;';

            const textoHTML = reg.texto.replace(/\n/g, '<br>');

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <strong style="color: #475569; font-size: 1rem; display: flex; align-items: center; gap: 6px;">🗓️ ${reg.data}</strong>
                    <button class="btn-excluir" data-id="${reg.id}" style="background-color: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; width: auto; margin-top: 0; box-shadow: none;" title="Apagar Relatório">Apagar 🗑️</button>
                </div>
                <p style="color: #1e293b; line-height: 1.6; font-size: 1.02rem;">${textoHTML}</p>
            `;
            listaRelatorios.appendChild(card);
        });
    }

    if (formRelatorio) {
        formRelatorio.addEventListener('submit', async function (e) {
            e.preventDefault();
            const data = dataRelatorio.value;
            const texto = document.getElementById('texto-relatorio').value.trim();

            await fetch('/api/relatorios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, texto })
            });

            alert('Relatório salvo com sucesso!');
            containerForm.style.display = 'none';
            if (btnAbrirForm) btnAbrirForm.style.display = 'block';
            formRelatorio.reset();
            if (dataRelatorio) dataRelatorio.value = hojeISO;
            carregar();
        });
    }

    if (filtroMes) filtroMes.addEventListener('change', carregar);
    if (btnLimparFiltro) {
        btnLimparFiltro.addEventListener('click', function () {
            if (filtroMes) filtroMes.value = '';
            carregar();
        });
    }

    if (listaRelatorios) {
        listaRelatorios.addEventListener('click', async function (e) {
            if (e.target.classList.contains('btn-excluir')) {
                const id = e.target.getAttribute('data-id');
                if (confirm('Tem certeza que deseja apagar permanentemente este relatório?')) {
                    await fetch(`/api/relatorios/${id}`, { method: 'DELETE' });
                    carregar();
                }
            }
        });
    }

    carregar();
});
