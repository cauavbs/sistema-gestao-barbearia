document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('form-venda');
    const listaVendas = document.getElementById('lista-vendas');
    const totalProdutosEl = document.getElementById('total-produtos');
    const totalValorEl = document.getElementById('total-valor');
    const totalValorMesEl = document.getElementById('total-valor-mes');
    const btnExportar = document.getElementById('btn-exportar');
    const filtroProdutoSelect = document.getElementById('filtro-produto');

    const dataLocal = new Date();
    const hoje = dataLocal.getFullYear() + '-' + String(dataLocal.getMonth() + 1).padStart(2, '0') + '-' + String(dataLocal.getDate()).padStart(2, '0');
    const dataVendaEl = document.getElementById('data-venda');
    if (dataVendaEl) dataVendaEl.value = hoje;

    let registrosFreezerGlobais = {};

    async function carregar() {
        const resposta = await fetch('/api/freezer');
        const lista = await resposta.json();
        registrosFreezerGlobais = {};
        lista.forEach(reg => { registrosFreezerGlobais[reg.id] = reg; });
        atualizarTela();
    }

    function atualizarOpcoesFiltro() {
        if (!filtroProdutoSelect) return;
        const valorAtual = filtroProdutoSelect.value;
        filtroProdutoSelect.innerHTML = '<option value="">Todos os Produtos</option>';

        const produtosUnicos = [...new Set(Object.values(registrosFreezerGlobais).map(r => r.produto))];

        produtosUnicos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto;
            option.textContent = produto;
            filtroProdutoSelect.appendChild(option);
        });

        filtroProdutoSelect.value = valorAtual;
    }

    const filtroBusca = document.getElementById('filtro-busca');
    if (filtroBusca) filtroBusca.addEventListener('input', atualizarTela);

    if (filtroProdutoSelect) filtroProdutoSelect.addEventListener('change', atualizarTela);
    const fDataInicio = document.getElementById('filtro-data-inicio');
    if (fDataInicio) fDataInicio.addEventListener('change', atualizarTela);
    const fDataFim = document.getElementById('filtro-data-fim');
    if (fDataFim) fDataFim.addEventListener('change', atualizarTela);

    const btnLimparFiltro = document.getElementById('btn-limpar-filtro');
    if (btnLimparFiltro) {
        btnLimparFiltro.addEventListener('click', function () {
            if (document.getElementById('filtro-busca')) document.getElementById('filtro-busca').value = '';
            if (document.getElementById('filtro-produto')) document.getElementById('filtro-produto').value = '';
            if (document.getElementById('filtro-data-inicio')) document.getElementById('filtro-data-inicio').value = '';
            if (document.getElementById('filtro-data-fim')) document.getElementById('filtro-data-fim').value = '';
            atualizarTela();
        });
    }

    function atualizarTela() {
        if (!listaVendas) return;
        listaVendas.innerHTML = '';
        let totalProdutosGeral = 0;
        let faturamentoBrutoGeral = 0;
        let faturamentoBrutoMes = 0;

        let qtdResultadosFiltrados = 0;
        let valorTotalFiltrado = 0;

        const dataSelecionadaForm = dataVendaEl ? dataVendaEl.value : '';
        const dataSelecionadaBR = dataSelecionadaForm ? dataSelecionadaForm.split('-').reverse().join('/') : '';
        const mesAnoAtual = String(new Date().getMonth() + 1).padStart(2, '0') + '/' + new Date().getFullYear();

        const fBusca = filtroBusca ? filtroBusca.value.toLowerCase() : '';
        const fProduto = filtroProdutoSelect ? filtroProdutoSelect.value : '';
        const fDataInicioVal = fDataInicio ? fDataInicio.value : '';
        const fDataFimVal = fDataFim ? fDataFim.value : '';
        const usandoFiltros = fBusca !== "" || fProduto !== "" || fDataInicioVal !== "" || fDataFimVal !== "";

        atualizarOpcoesFiltro();

        Object.keys(registrosFreezerGlobais).forEach((idFirebase) => {
            const registro = registrosFreezerGlobais[idFirebase];

            if (registro.data === dataSelecionadaBR) {
                faturamentoBrutoGeral += registro.total;
                totalProdutosGeral += registro.quantidade;
            }
            if (registro.data && registro.data.slice(3) === mesAnoAtual) {
                faturamentoBrutoMes += registro.total;
            }

            let mostrar = true;
            if (usandoFiltros) {
                if (fBusca !== "" && !registro.produto.toLowerCase().includes(fBusca)) mostrar = false;
                if (fProduto !== "" && registro.produto !== fProduto) mostrar = false;
                if (fDataInicioVal !== "" || fDataFimVal !== "") {
                    const p = registro.data.split('/');
                    const dataISO = `${p[2]}-${p[1]}-${p[0]}`;
                    if (fDataInicioVal !== "" && dataISO < fDataInicioVal) mostrar = false;
                    if (fDataFimVal !== "" && dataISO > fDataFimVal) mostrar = false;
                }
            } else {
                const mesAnoSelecionado = dataSelecionadaBR ? dataSelecionadaBR.slice(3) : '';
                if (registro.data && registro.data.slice(3) !== mesAnoSelecionado) {
                    mostrar = false;
                }
            }

            if (mostrar) {
                qtdResultadosFiltrados++;
                valorTotalFiltrado += registro.total;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${registro.data}</td>
                    <td><strong>${registro.produto}</strong></td>
                    <td>${registro.quantidade}</td>
                    <td>${registro.valorUnitarioTexto}</td>
                    <td style="color: #15803d; font-weight: bold;">${registro.totalTexto}</td>
                    <td>
                        <button class="btn-excluir" data-id="${idFirebase}">Excluir</button>
                    </td>
                `;
                listaVendas.appendChild(tr);
            }
        });

        if (totalProdutosEl) totalProdutosEl.textContent = totalProdutosGeral;
        if (totalValorEl) totalValorEl.textContent = faturamentoBrutoGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (totalValorMesEl) totalValorMesEl.textContent = faturamentoBrutoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const resumoBuscaEl = document.getElementById('resumo-busca');
        if (resumoBuscaEl) {
            if (usandoFiltros) {
                resumoBuscaEl.style.display = 'flex';
                let textoBuscado = filtroBusca ? filtroBusca.value : '';
                let trechoTexto = textoBuscado !== "" ? ` para "<strong>${textoBuscado}</strong>"` : "";
                let valorFormatado = valorTotalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                resumoBuscaEl.innerHTML = `<span>Exibindo <strong>${qtdResultadosFiltrados}</strong> resultado(s)${trechoTexto}.</span> <span>Total filtrado: <strong style="color: #0c4a6e;">${valorFormatado}</strong></span>`;
            } else {
                resumoBuscaEl.style.display = 'none';
            }
        }
    }

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const dataInput = dataVendaEl ? dataVendaEl.value : '';
            const produtoInput = document.getElementById('nome-produto').value.trim();
            const qtdProduto = parseInt(document.getElementById('qtd-produto').value);
            const valorProduto = parseFloat(document.getElementById('valor-produto').value);

            const resposta = await fetch('/api/freezer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: dataInput, produto: produtoInput, quantidade: qtdProduto, valorUnitario: valorProduto })
            });

            if (!resposta.ok) {
                const erro = await resposta.json();
                alert(erro.erro || 'Erro ao lançar a venda.');
                return;
            }

            alert("Venda lançada com sucesso!");
            form.reset();
            if (dataVendaEl) dataVendaEl.value = dataInput;
            await carregar();
        });
    }

    if (listaVendas) {
        listaVendas.addEventListener('click', async function (event) {
            if (event.target.classList.contains('btn-excluir')) {
                const idFirebase = event.target.getAttribute('data-id');
                if (confirm("Deseja apagar esta venda do freezer do banco de dados?")) {
                    await fetch(`/api/freezer/${idFirebase}`, { method: 'DELETE' });
                    await carregar();
                }
            }
        });
    }

    if (btnExportar) {
        btnExportar.addEventListener('click', function () {
            const chaves = Object.keys(registrosFreezerGlobais);
            if (chaves.length === 0) {
                alert("Não há dados para exportar!");
                return;
            }

            let csvContent = "\uFEFFData;Produto;Quantidade;Valor Unitário;Total\n";

            chaves.forEach((id) => {
                const r = registrosFreezerGlobais[id];
                let vu = r.valorUnitario.toFixed(2).replace('.', ',');
                let t = r.total.toFixed(2).replace('.', ',');
                csvContent += `${r.data};${r.produto};${r.quantidade};R$ ${vu};R$ ${t}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "fechamento_freezer.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    if (dataVendaEl) dataVendaEl.addEventListener('change', atualizarTela);

    await carregar();
});
