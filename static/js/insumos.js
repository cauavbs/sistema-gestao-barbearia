document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('form-insumo');
    const listaGastos = document.getElementById('lista-gastos');
    const totalQtdGastosEl = document.getElementById('total-qtd-gastos');
    const totalGastoDiaEl = document.getElementById('total-gasto-dia');
    const totalGastoMesEl = document.getElementById('total-gasto-mes');
    const btnExportar = document.getElementById('btn-exportar');
    const filtroContaSelect = document.getElementById('filtro-conta');

    const dataLocal = new Date();
    const hoje = dataLocal.getFullYear() + '-' + String(dataLocal.getMonth() + 1).padStart(2, '0') + '-' + String(dataLocal.getDate()).padStart(2, '0');
    const dataGastoEl = document.getElementById('data-gasto');
    if (dataGastoEl) dataGastoEl.value = hoje;

    let registrosInsumosGlobais = {};

    async function carregar() {
        const resposta = await fetch('/api/insumos');
        const lista = await resposta.json();
        registrosInsumosGlobais = {};
        lista.forEach(reg => { registrosInsumosGlobais[reg.id] = reg; });
        atualizarTela();
    }

    function atualizarOpcoesFiltro() {
        if (!filtroContaSelect) return;
        const valorAtual = filtroContaSelect.value;
        filtroContaSelect.innerHTML = '<option value="">Todas as Contas e Produtos</option>';
        const contasUnicas = [...new Set(Object.values(registrosInsumosGlobais).map(r => r.conta))];
        contasUnicas.forEach(conta => {
            const option = document.createElement('option');
            option.value = conta;
            option.textContent = conta;
            filtroContaSelect.appendChild(option);
        });
        filtroContaSelect.value = valorAtual;
    }

    const filtroBusca = document.getElementById('filtro-busca');
    if (filtroBusca) filtroBusca.addEventListener('input', atualizarTela);

    if (filtroContaSelect) filtroContaSelect.addEventListener('change', atualizarTela);
    const fDataInicio = document.getElementById('filtro-data-inicio');
    if (fDataInicio) fDataInicio.addEventListener('change', atualizarTela);
    const fDataFim = document.getElementById('filtro-data-fim');
    if (fDataFim) fDataFim.addEventListener('change', atualizarTela);

    const btnLimparFiltro = document.getElementById('btn-limpar-filtro');
    if (btnLimparFiltro) {
        btnLimparFiltro.addEventListener('click', function () {
            if (document.getElementById('filtro-busca')) document.getElementById('filtro-busca').value = '';
            if (document.getElementById('filtro-conta')) document.getElementById('filtro-conta').value = '';
            if (document.getElementById('filtro-data-inicio')) document.getElementById('filtro-data-inicio').value = '';
            if (document.getElementById('filtro-data-fim')) document.getElementById('filtro-data-fim').value = '';
            atualizarTela();
        });
    }

    function atualizarTela() {
        if (!listaGastos) return;
        listaGastos.innerHTML = '';
        let totalQuantidadeDia = 0;
        let gastoBrutoDia = 0;
        let gastoBrutoMes = 0;

        let qtdResultadosFiltrados = 0;
        let valorTotalFiltrado = 0;

        const dataSelecionadaForm = dataGastoEl ? dataGastoEl.value : '';
        const dataSelecionadaBR = dataSelecionadaForm ? dataSelecionadaForm.split('-').reverse().join('/') : '';
        const mesAnoAtual = String(new Date().getMonth() + 1).padStart(2, '0') + '/' + new Date().getFullYear();

        const fBusca = filtroBusca ? filtroBusca.value.toLowerCase() : '';
        const fConta = filtroContaSelect ? filtroContaSelect.value : '';
        const fDataInicioVal = fDataInicio ? fDataInicio.value : '';
        const fDataFimVal = fDataFim ? fDataFim.value : '';
        const usandoFiltros = fBusca !== "" || fConta !== "" || fDataInicioVal !== "" || fDataFimVal !== "";

        atualizarOpcoesFiltro();

        Object.keys(registrosInsumosGlobais).forEach((idFirebase) => {
            const registro = registrosInsumosGlobais[idFirebase];

            if (registro.data === dataSelecionadaBR) {
                gastoBrutoDia += Number(registro.total);
                totalQuantidadeDia += Number(registro.quantidade);
            }
            if (registro.data && registro.data.slice(3) === mesAnoAtual) {
                gastoBrutoMes += Number(registro.total);
            }

            let mostrar = true;
            if (usandoFiltros) {
                if (fBusca !== "" && !registro.conta.toLowerCase().includes(fBusca)) mostrar = false;
                if (fConta !== "" && registro.conta !== fConta) mostrar = false;
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
                valorTotalFiltrado += Number(registro.total);

                const tr = document.createElement('tr');

                let botaoDocumento = '';
                if (registro.comprovante) {
                    botaoDocumento = `<button class="btn-ver-doc" data-doc="${registro.comprovante}" style="background-color: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin: 0; height: 32px; display: flex; align-items: center; justify-content: center;" title="Ver Comprovante Anexado">📄</button>`;
                }

                tr.innerHTML = `
                    <td>${registro.data}</td>
                    <td><strong>${registro.conta}</strong></td>
                    <td>${registro.quantidade}</td>
                    <td>${registro.valor_unitario_texto || registro.valorUnitarioTexto}</td>
                    <td style="color: #dc2626; font-weight: bold;">${registro.total_texto || registro.totalTexto}</td>
                    <td style="display: flex; gap: 8px; align-items: center;">
                        ${botaoDocumento}
                        <button class="btn-excluir" data-id="${idFirebase}">Excluir</button>
                    </td>
                `;
                listaGastos.appendChild(tr);
            }
        });

        if (totalQtdGastosEl) totalQtdGastosEl.textContent = totalQuantidadeDia;
        if (totalGastoDiaEl) totalGastoDiaEl.textContent = gastoBrutoDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (totalGastoMesEl) totalGastoMesEl.textContent = gastoBrutoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const resumoBuscaEl = document.getElementById('resumo-busca');
        if (resumoBuscaEl) {
            if (usandoFiltros) {
                resumoBuscaEl.style.display = 'flex';
                let textoBuscado = filtroBusca ? filtroBusca.value : '';
                let trechoTexto = textoBuscado !== "" ? ` para "<strong>${textoBuscado}</strong>"` : "";
                let valorFormatado = valorTotalFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                resumoBuscaEl.innerHTML = `<span>Exibindo <strong>${qtdResultadosFiltrados}</strong> resultado(s)${trechoTexto}.</span> <span>Total filtrado: <strong style="color: #991b1b;">${valorFormatado}</strong></span>`;
            } else {
                resumoBuscaEl.style.display = 'none';
            }
        }
    }

    let registroPendenteInsumo = null;
    const fileInputInsumo = document.getElementById('input-comprovante-insumo');

    async function salvarNoBanco(registro) {
        const resposta = await fetch('/api/insumos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registro)
        });

        if (!resposta.ok) {
            const erro = await resposta.json();
            await mostrarAlerta(erro.erro || 'Erro ao lançar o gasto.');
            return;
        }

        form.reset();
        if (dataGastoEl) dataGastoEl.value = registro.data;
        await mostrarAlerta("Gasto lançado com sucesso!");
        await carregar();
    }

    if (fileInputInsumo) {
        fileInputInsumo.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (!file) {
                if (registroPendenteInsumo) {
                    salvarNoBanco(registroPendenteInsumo);
                    registroPendenteInsumo = null;
                }
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                await mostrarAlerta("Para não sobrecarregar o banco de dados, escolha um comprovante de até 2MB.");
                fileInputInsumo.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                if (registroPendenteInsumo) {
                    registroPendenteInsumo.comprovante = event.target.result;
                    salvarNoBanco(registroPendenteInsumo);
                    registroPendenteInsumo = null;
                }
                fileInputInsumo.value = '';
            };
            reader.readAsDataURL(file);
        });
    }

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const dataInput = dataGastoEl ? dataGastoEl.value : '';
            const contaInput = document.getElementById('nome-conta').value.trim();
            const qtdConta = parseInt(document.getElementById('qtd-conta').value);
            const valorConta = parseFloat(document.getElementById('valor-conta').value);

            const novoRegistro = {
                data: dataInput,
                conta: contaInput,
                quantidade: qtdConta,
                valorUnitario: valorConta
            };

            if (await mostrarConfirmacao("Deseja anexar um comprovante para este gasto?")) {
                registroPendenteInsumo = novoRegistro;
                if (fileInputInsumo) fileInputInsumo.click();
            } else {
                salvarNoBanco(novoRegistro);
            }
        });
    }

    if (listaGastos) {
        listaGastos.addEventListener('click', async function (event) {
            if (event.target.classList.contains('btn-excluir')) {
                const idFirebase = event.target.getAttribute('data-id');
                if (await mostrarConfirmacao("Deseja apagar este gasto do banco de dados?")) {
                    fetch(`/api/insumos/${idFirebase}`, { method: 'DELETE' }).then(carregar);
                }
            }

            if (event.target.classList.contains('btn-ver-doc')) {
                const docBase64 = event.target.getAttribute('data-doc');
                fetch(docBase64).then(res => res.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                });
            }
        });
    }

    if (btnExportar) {
        btnExportar.addEventListener('click', async function () {
            const chaves = Object.keys(registrosInsumosGlobais);
            if (chaves.length === 0) {
                await mostrarAlerta("Não há dados para exportar!");
                return;
            }
            let csvContent = "\uFEFFData;Conta/Produto;Quantidade;Valor Unitário;Total Gasto\n";
            chaves.forEach((id) => {
                const r = registrosInsumosGlobais[id];
                let vu = Number(r.valor_unitario || r.valorUnitario).toFixed(2).replace('.', ',');
                let t = Number(r.total).toFixed(2).replace('.', ',');
                csvContent += `${r.data};${r.conta};${r.quantidade};R$ ${vu};R$ ${t}\n`;
            });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "historico_gastos_insumos.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    if (dataGastoEl) dataGastoEl.addEventListener('change', atualizarTela);

    await carregar();
});
