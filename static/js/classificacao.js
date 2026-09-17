document.addEventListener('DOMContentLoaded', async function () {
    const dataCaixa = document.getElementById('data-caixa');
    const trocoInicial = document.getElementById('troco-inicial');
    const fichasPix = document.getElementById('fichas-pix');
    const fichasDebito = document.getElementById('fichas-debito');
    const fichasDebito2 = document.getElementById('fichas-debito2');
    const fichasCredito = document.getElementById('fichas-credito');
    const fichasCredito2 = document.getElementById('fichas-credito2');
    const formCaixa = document.getElementById('form-caixa');
    const listaCaixas = document.getElementById('lista-caixas');
    const btnExportar = document.getElementById('btn-exportar');

    const dataLocal = new Date();
    const hoje = dataLocal.getFullYear() + '-' + String(dataLocal.getMonth() + 1).padStart(2, '0') + '-' + String(dataLocal.getDate()).padStart(2, '0');
    if (dataCaixa) dataCaixa.value = hoje;

    // Taxas agora vêm do backend (nó configuracoesBarbearia/taxasMaquina no
    // Firebase), em vez do localStorage do navegador — assim valem para
    // qualquer aparelho que o master usar, não só o de sempre.
    let taxaDebito = 0, taxaDebito2 = 0, taxaCredito = 0, taxaCredito2 = 0;

    async function carregarTaxas() {
        const resposta = await fetch('/api/caixa/taxas');
        const taxas = await resposta.json();
        taxaDebito = Number(taxas.debito) || 0;
        taxaDebito2 = Number(taxas.debito2) || 0;
        taxaCredito = Number(taxas.credito) || 0;
        taxaCredito2 = Number(taxas.credito2) || 0;
        atualizarLabelsTaxas();
    }

    async function salvarTaxas() {
        await fetch('/api/caixa/taxas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ debito: taxaDebito, debito2: taxaDebito2, credito: taxaCredito, credito2: taxaCredito2 })
        });
    }

    const labelTaxaDebito = document.getElementById('label-taxa-debito');
    const labelTaxaDebito2 = document.getElementById('label-taxa-debito2');
    const labelTaxaCredito = document.getElementById('label-taxa-credito');
    const labelTaxaCredito2 = document.getElementById('label-taxa-credito2');

    function atualizarLabelsTaxas() {
        if (labelTaxaDebito) labelTaxaDebito.textContent = `(${taxaDebito.toFixed(2)}%)`;
        if (labelTaxaDebito2) labelTaxaDebito2.textContent = `(${taxaDebito2.toFixed(2)}%)`;
        if (labelTaxaCredito) labelTaxaCredito.textContent = `(${taxaCredito.toFixed(2)}%)`;
        if (labelTaxaCredito2) labelTaxaCredito2.textContent = `(${taxaCredito2.toFixed(2)}%)`;
    }

    if (document.getElementById('btn-taxa-debito')) {
        document.getElementById('btn-taxa-debito').addEventListener('click', async function () {
            const nova = await mostrarPrompt("Digite a taxa da máquina para DÉBITO 1 (ex: 1,99):", taxaDebito);
            if (nova !== null && nova.trim() !== '') {
                taxaDebito = parseFloat(nova.replace(',', '.'));
                await salvarTaxas();
                atualizarLabelsTaxas(); calcularCaixa();
            }
        });
    }
    if (document.getElementById('btn-taxa-debito2')) {
        document.getElementById('btn-taxa-debito2').addEventListener('click', async function () {
            const nova = await mostrarPrompt("Digite a taxa da máquina para DÉBITO 2 (ex: 1,99):", taxaDebito2);
            if (nova !== null && nova.trim() !== '') {
                taxaDebito2 = parseFloat(nova.replace(',', '.'));
                await salvarTaxas();
                atualizarLabelsTaxas(); calcularCaixa();
            }
        });
    }
    if (document.getElementById('btn-taxa-credito')) {
        document.getElementById('btn-taxa-credito').addEventListener('click', async function () {
            const nova = await mostrarPrompt("Digite a taxa da máquina para CRÉDITO 1 (ex: 4,99):", taxaCredito);
            if (nova !== null && nova.trim() !== '') {
                taxaCredito = parseFloat(nova.replace(',', '.'));
                await salvarTaxas();
                atualizarLabelsTaxas(); calcularCaixa();
            }
        });
    }
    if (document.getElementById('btn-taxa-credito2')) {
        document.getElementById('btn-taxa-credito2').addEventListener('click', async function () {
            const nova = await mostrarPrompt("Digite a taxa da máquina para CRÉDITO 2 (ex: 4,99):", taxaCredito2);
            if (nova !== null && nova.trim() !== '') {
                taxaCredito2 = parseFloat(nova.replace(',', '.'));
                await salvarTaxas();
                atualizarLabelsTaxas(); calcularCaixa();
            }
        });
    }

    let registrosCaixaGlobais = {};
    let totalFichasDiaAtual = 0;

    async function buscarFichasDoDia() {
        if (!dataCaixa || !dataCaixa.value) { totalFichasDiaAtual = 0; return; }
        const resposta = await fetch(`/api/caixa/fichas-do-dia?data=${dataCaixa.value}`);
        const dados = await resposta.json();
        totalFichasDiaAtual = dados.totalFichas || 0;
    }

    async function carregarHistorico() {
        const resposta = await fetch('/api/caixa');
        const lista = await resposta.json();
        registrosCaixaGlobais = {};
        lista.forEach(reg => { registrosCaixaGlobais[reg.id] = reg; });
        atualizarTabelaCaixa();
    }

    function calcularCaixa() {
        const displayFichas = document.getElementById('display-fichas-dia');
        if (displayFichas) displayFichas.textContent = totalFichasDiaAtual;

        const troco = parseFloat(trocoInicial.value) || 0;
        const pix = parseInt(fichasPix.value) || 0;
        const debito = parseInt(fichasDebito.value) || 0;
        const debito2 = parseInt(fichasDebito2.value) || 0;
        const credito = parseInt(fichasCredito.value) || 0;
        const credito2 = parseInt(fichasCredito2.value) || 0;

        const totalDigital = pix + debito + debito2 + credito + credito2;
        let fichasDinheiro = totalFichasDiaAtual - totalDigital;
        if (fichasDinheiro < 0) fichasDinheiro = 0;

        const displayDinheiro = document.getElementById('display-fichas-dinheiro');
        if (displayDinheiro) displayDinheiro.textContent = fichasDinheiro;

        const valorPorFicha = 20.00;
        const valorEmDinheiro = fichasDinheiro * valorPorFicha;
        const totalNaGaveta = troco + valorEmDinheiro;

        const brutoDebito = debito * valorPorFicha;
        const brutoDebito2 = debito2 * valorPorFicha;
        const brutoCredito = credito * valorPorFicha;
        const brutoCredito2 = credito2 * valorPorFicha;

        const descontoDebito = brutoDebito * (taxaDebito / 100);
        const descontoDebito2 = brutoDebito2 * (taxaDebito2 / 100);
        const descontoCredito = brutoCredito * (taxaCredito / 100);
        const descontoCredito2 = brutoCredito2 * (taxaCredito2 / 100);

        const totalDesconto = descontoDebito + descontoDebito2 + descontoCredito + descontoCredito2;
        const digitalLiquido = (brutoPixSeguro(pix, valorPorFicha) + brutoDebito + brutoDebito2 + brutoCredito + brutoCredito2) - totalDesconto;

        const elValDin = document.getElementById('display-valor-dinheiro');
        if (elValDin) elValDin.textContent = valorEmDinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elDescTax = document.getElementById('display-desconto-taxas');
        if (elDescTax) elDescTax.textContent = "- " + totalDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elDigLiq = document.getElementById('display-digital-liquido');
        if (elDigLiq) elDigLiq.textContent = digitalLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elTotCx = document.getElementById('display-total-caixa');
        if (elTotCx) elTotCx.textContent = totalNaGaveta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function brutoPixSeguro(pix, valorPorFicha) {
        return pix * valorPorFicha;
    }

    if (dataCaixa) {
        dataCaixa.addEventListener('change', async function () {
            await buscarFichasDoDia();
            calcularCaixa();
            atualizarTabelaCaixa();
        });
    }
    if (trocoInicial) trocoInicial.addEventListener('input', calcularCaixa);
    if (fichasPix) fichasPix.addEventListener('input', calcularCaixa);
    if (fichasDebito) fichasDebito.addEventListener('input', calcularCaixa);
    if (fichasDebito2) fichasDebito2.addEventListener('input', calcularCaixa);
    if (fichasCredito) fichasCredito.addEventListener('input', calcularCaixa);
    if (fichasCredito2) fichasCredito2.addEventListener('input', calcularCaixa);

    if (formCaixa) {
        formCaixa.addEventListener('submit', async function (e) {
            e.preventDefault();

            const resposta = await fetch('/api/caixa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: dataCaixa.value,
                    troco: parseFloat(trocoInicial.value) || 0,
                    pix: parseInt(fichasPix.value) || 0,
                    debito: parseInt(fichasDebito.value) || 0,
                    debito2: parseInt(fichasDebito2.value) || 0,
                    credito: parseInt(fichasCredito.value) || 0,
                    credito2: parseInt(fichasCredito2.value) || 0
                })
            });

            if (!resposta.ok) {
                const erro = await resposta.json();
                await mostrarAlerta(erro.erro || 'Erro ao salvar o fechamento de caixa.');
                return;
            }

            await mostrarAlerta('Fechamento de caixa salvo com sucesso!');
            fichasPix.value = 0; fichasDebito.value = 0; fichasDebito2.value = 0; fichasCredito.value = 0; fichasCredito2.value = 0;
            calcularCaixa();
            await carregarHistorico();
        });
    }

    const fInicio = document.getElementById('filtro-data-inicio');
    const fFim = document.getElementById('filtro-data-fim');
    const btnLimpar = document.getElementById('btn-limpar-filtro');

    if (fInicio) fInicio.addEventListener('change', atualizarTabelaCaixa);
    if (fFim) fFim.addEventListener('change', atualizarTabelaCaixa);
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function () {
            if (fInicio) fInicio.value = '';
            if (fFim) fFim.value = '';
            atualizarTabelaCaixa();
        });
    }

    function atualizarTabelaCaixa() {
        if (!listaCaixas) return;
        listaCaixas.innerHTML = '';

        const dataSelecionadaForm = dataCaixa ? dataCaixa.value : '';
        const dataSelecionadaBR = dataSelecionadaForm ? dataSelecionadaForm.split('-').reverse().join('/') : '';
        const mesAnoSelecionado = dataSelecionadaBR ? dataSelecionadaBR.slice(3) : '';

        const fDataInicio = fInicio ? fInicio.value : '';
        const fDataFim = fFim ? fFim.value : '';
        const usandoFiltros = fDataInicio !== "" || fDataFim !== "";

        Object.keys(registrosCaixaGlobais).forEach((idFirebase) => {
            const reg = registrosCaixaGlobais[idFirebase];
            let mostrar = true;

            if (usandoFiltros) {
                const p = reg.data.split('/');
                const dataISO = `${p[2]}-${p[1]}-${p[0]}`;
                if (fDataInicio !== "" && dataISO < fDataInicio) mostrar = false;
                if (fDataFim !== "" && dataISO > fDataFim) mostrar = false;
            } else {
                if (reg.data && reg.data.slice(3) !== mesAnoSelecionado) {
                    mostrar = false;
                }
            }

            if (mostrar) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${reg.data}</td>
                    <td>R$ ${reg.troco.toFixed(2).replace('.', ',')}</td>
                    <td>${reg.totalFichas}</td>
                    <td>${reg.pix || 0}</td>
                    <td>${reg.debito || 0}</td>
                    <td>${reg.debito2 || 0}</td>
                    <td>${reg.credito || 0}</td>
                    <td>${reg.credito2 || 0}</td>
                    <td><strong>${reg.fichasDinheiro}</strong></td>
                    <td style="color: #15803d; font-weight: bold;">${reg.totalGavetaTexto}</td>
                    <td>
                        <button class="btn-excluir" data-id="${idFirebase}">Excluir</button>
                    </td>
                `;
                listaCaixas.appendChild(tr);
            }
        });
    }

    if (listaCaixas) {
        listaCaixas.addEventListener('click', async function (e) {
            if (e.target.classList.contains('btn-excluir')) {
                const idFirebase = e.target.getAttribute('data-id');
                if (await mostrarConfirmacao("Deseja apagar este fechamento de caixa?")) {
                    await fetch(`/api/caixa/${idFirebase}`, { method: 'DELETE' });
                    await carregarHistorico();
                }
            }
        });
    }

    if (btnExportar) {
        btnExportar.addEventListener('click', async function () {
            const chaves = Object.keys(registrosCaixaGlobais);
            if (chaves.length === 0) {
                await mostrarAlerta("Não há dados para exportar!");
                return;
            }

            let csvContent = "\uFEFFData;Troco Inicial;Fichas Totais;Pix;Débito 1;Débito 2;Crédito 1;Crédito 2;Fichas Dinheiro;Total Gaveta\n";

            chaves.forEach((id) => {
                const reg = registrosCaixaGlobais[id];
                let t = reg.troco.toFixed(2).replace('.', ',');
                csvContent += `${reg.data};R$ ${t};${reg.totalFichas};${reg.pix || 0};${reg.debito || 0};${reg.debito2 || 0};${reg.credito || 0};${reg.credito2 || 0};${reg.fichasDinheiro};${reg.totalGavetaTexto}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "fechamento_caixa_troco.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Carga inicial
    await carregarTaxas();
    await buscarFichasDoDia();
    calcularCaixa();
    await carregarHistorico();
});
