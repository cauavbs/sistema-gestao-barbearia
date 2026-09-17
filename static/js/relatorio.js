document.addEventListener('DOMContentLoaded', async function () {
    const btnAbrirForm = document.getElementById('btn-abrir-form');
    const btnCancelar = document.getElementById('btn-cancelar');
    const containerForm = document.getElementById('container-formulario');
    const formRelatorio = document.getElementById('form-relatorio');
    const dataRelatorio = document.getElementById('data-relatorio');
    const listaRelatorios = document.getElementById('lista-relatorios');
    const filtroMes = document.getElementById('filtro-mes-relatorio');
    const filtroAutor = document.getElementById('filtro-autor');
    const btnLimparFiltro = document.getElementById('btn-limpar-filtro');
    const btnExportar = document.getElementById('btn-exportar');

    const agora = new Date();
    const hojeISO = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0') + '-' + String(agora.getDate()).padStart(2, '0');
    if (dataRelatorio) dataRelatorio.value = hojeISO;
    if (filtroMes) filtroMes.value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

    let listaCompleta = [];

    // Exportar é só pro master, já que agora a lista mostra relatos de
    // todo mundo. Só sabemos o perfil de quem está logado consultando
    // essa rota (a mesma que fichas.js usa).
    const respostaMe = await fetch('/api/me');
    const eu = await respostaMe.json();
    if (btnExportar && eu.perfil !== 'master') {
        btnExportar.style.display = 'none';
    }

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
        listaCompleta = await resposta.json();
        atualizarOpcoesAutor();
        renderizar();
    }

    function atualizarOpcoesAutor() {
        if (!filtroAutor) return;
        const valorAtual = filtroAutor.value;
        const autoresUnicos = [...new Set(listaCompleta.map(r => r.autor).filter(Boolean))].sort();

        filtroAutor.innerHTML = '<option value="">Todos os Autores</option>';
        autoresUnicos.forEach(autor => {
            const option = document.createElement('option');
            option.value = autor;
            option.textContent = autor;
            filtroAutor.appendChild(option);
        });
        filtroAutor.value = valorAtual;
    }

    function renderizar() {
        if (!listaRelatorios) return;
        listaRelatorios.innerHTML = '';

        const autorSelecionado = filtroAutor ? filtroAutor.value : '';
        const lista = autorSelecionado
            ? listaCompleta.filter(r => r.autor === autorSelecionado)
            : listaCompleta;

        if (lista.length === 0) {
            listaRelatorios.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; padding: 20px;">Nenhum relatório encontrado para este período.</p>';
            return;
        }

        lista.forEach(function (reg) {
            const card = document.createElement('div');
            card.style.cssText = 'background: white; border-left: 5px solid #0284c7; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9; position: relative;';

            const textoHTML = reg.texto.replace(/\n/g, '<br>');
            const autorHTML = reg.autor
                ? `<span style="color: #64748b; font-size: 0.85rem; margin-left: 10px;">✍️ ${reg.autor}</span>`
                : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; flex-wrap: wrap;">
                        <strong style="color: #475569; font-size: 1rem; display: flex; align-items: center; gap: 6px;">🗓️ ${reg.data}</strong>
                        ${autorHTML}
                    </div>
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

            await mostrarAlerta('Relatório salvo com sucesso!');
            containerForm.style.display = 'none';
            if (btnAbrirForm) btnAbrirForm.style.display = 'block';
            formRelatorio.reset();
            if (dataRelatorio) dataRelatorio.value = hojeISO;
            carregar();
        });
    }

    if (filtroMes) filtroMes.addEventListener('change', carregar);
    if (filtroAutor) filtroAutor.addEventListener('change', renderizar);
    if (btnLimparFiltro) {
        btnLimparFiltro.addEventListener('click', function () {
            if (filtroMes) filtroMes.value = '';
            if (filtroAutor) filtroAutor.value = '';
            carregar();
        });
    }

    if (listaRelatorios) {
        listaRelatorios.addEventListener('click', async function (e) {
            if (e.target.classList.contains('btn-excluir')) {
                const id = e.target.getAttribute('data-id');
                if (await mostrarConfirmacao('Tem certeza que deseja apagar permanentemente este relatório?')) {
                    const resposta = await fetch(`/api/relatorios/${id}`, { method: 'DELETE' });
                    if (!resposta.ok) {
                        const erro = await resposta.json();
                        await mostrarAlerta(erro.erro || 'Não foi possível apagar este relatório.');
                        return;
                    }
                    carregar();
                }
            }
        });
    }

    if (btnExportar) {
        btnExportar.addEventListener('click', function () {
            if (listaCompleta.length === 0) {
                mostrarAlerta('Não há dados para exportar!');
                return;
            }

            let csvContent = "\uFEFFData;Autor;Relato\n";
            listaCompleta.forEach((r) => {
                const textoUmaLinha = (r.texto || '').replace(/\r?\n/g, ' ');
                csvContent += `${r.data};${r.autor || ''};${textoUmaLinha}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "relatorios_ocorrencias.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    await carregar();
});
