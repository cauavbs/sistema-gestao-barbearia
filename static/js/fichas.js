let registrosGlobais = {};
let listaBarbeiros = [];
let perfilUsuario = null;
let nomeUsuario = null;
let idRegistroParaPagar = null;
let modoPagamentoLote = false;
let idsLotePendente = [];

document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('form-atendimento');
    const inputComprovante = document.getElementById('input-comprovante');
    const dataLocal = new Date();
    const hoje = dataLocal.getFullYear() + '-' + String(dataLocal.getMonth() + 1).padStart(2, '0') + '-' + String(dataLocal.getDate()).padStart(2, '0');
    if (document.getElementById('data-fechamento')) document.getElementById('data-fechamento').value = hoje;

    // 1. Descobre quem está logado e aplica as restrições de tela
    const respostaMe = await fetch('/api/me');
    const eu = await respostaMe.json();
    perfilUsuario = eu.perfil;
    nomeUsuario = eu.nome;
    aplicarRestricoesDePerfil();

    // 2. Carrega barbeiros e fichas
    await carregarBarbeiros();
    await carregarFichas();

    function aplicarRestricoesDePerfil() {
        if (perfilUsuario === 'barbeiro') {
            document.querySelectorAll('.link-admin').forEach(el => el.style.display = 'none');
            const blocoLanc = document.getElementById('bloco-lancamento');
            if (blocoLanc) blocoLanc.style.display = 'none';
            const btnAdmin = document.getElementById('container-botoes-admin');
            if (btnAdmin) btnAdmin.style.display = 'none';
            const filtroBusca = document.getElementById('filtro-busca');
            if (filtroBusca) filtroBusca.style.display = 'none';

            const widgetBrutoDia = document.getElementById('widget-bruto-dia');
            if (widgetBrutoDia) widgetBrutoDia.style.display = 'none';
            const widgetBrutoMes = document.getElementById('widget-bruto-mes');
            if (widgetBrutoMes) widgetBrutoMes.style.display = 'none';
            const colFaturamentoBruto = document.getElementById('coluna-faturamento-bruto');
            if (colFaturamentoBruto) colFaturamentoBruto.style.display = 'none';

            const tituloResumo = document.getElementById('titulo-resumo');
            if (tituloResumo) tituloResumo.textContent = 'Seu Desempenho (Visão do Barbeiro)';
            const resumoBarbeiroInfo = document.getElementById('resumo-barbeiro-info');
            if (resumoBarbeiroInfo) resumoBarbeiroInfo.style.display = 'block';
        }
    }

    async function carregarBarbeiros() {
        const resposta = await fetch('/api/fichas/barbeiros');
        listaBarbeiros = await resposta.json();
        renderizarOpcoesBarbeiros();
    }

    function renderizarOpcoesBarbeiros() {
        const barbeiroSelect = document.getElementById('barbeiro');
        const filtroBarbeiro = document.getElementById('filtro-barbeiro');

        if (barbeiroSelect) barbeiroSelect.innerHTML = '<option value="" disabled selected>Selecione o barbeiro</option>';
        if (filtroBarbeiro) filtroBarbeiro.innerHTML = '<option value="">Todos os Barbeiros</option>';

        if (perfilUsuario === 'barbeiro') {
            if (filtroBarbeiro) {
                filtroBarbeiro.innerHTML = `<option value="${nomeUsuario}" selected>${nomeUsuario}</option>`;
                filtroBarbeiro.style.pointerEvents = "none";
            }
        } else {
            listaBarbeiros.forEach(function (nome) {
                if (barbeiroSelect) barbeiroSelect.innerHTML += `<option value="${nome}">${nome}</option>`;
                if (filtroBarbeiro) filtroBarbeiro.innerHTML += `<option value="${nome}">${nome}</option>`;
            });
        }
    }

    async function carregarFichas() {
        const resposta = await fetch('/api/fichas');
        const lista = await resposta.json();
        registrosGlobais = {};
        lista.forEach(reg => { registrosGlobais[reg.id] = reg; });
        atualizarTela();
    }

    function atualizarTela() {
        const listaAtendimentos = document.getElementById('lista-atendimentos');
        if (!listaAtendimentos) return;
        listaAtendimentos.innerHTML = '';

        let totalFichasGeral = 0, totalFichasMes = 0, faturamentoBrutoGeral = 0, faturamentoBrutoMes = 0;
        let suaParteMes = 0;
        let qtdResultadosFiltrados = 0, faturamentoFiltrado = 0, parteBarbeiroFiltrado = 0;

        const dataFechamentoEl = document.getElementById('data-fechamento');
        const dataSelecionadaForm = dataFechamentoEl ? dataFechamentoEl.value : '';
        const dataSelecionadaBR = dataSelecionadaForm.split('-').reverse().join('/');
        const mesAnoAtual = String(new Date().getMonth() + 1).padStart(2, '0') + '/' + new Date().getFullYear();

        const fBuscaEl = document.getElementById('filtro-busca');
        const fBusca = fBuscaEl ? fBuscaEl.value.toLowerCase() : '';
        const fBarbeiroEl = document.getElementById('filtro-barbeiro');
        const fBarbeiro = fBarbeiroEl ? fBarbeiroEl.value : '';
        const fDataInicioEl = document.getElementById('filtro-data-inicio');
        const fDataInicio = fDataInicioEl ? fDataInicioEl.value : '';
        const fDataFimEl = document.getElementById('filtro-data-fim');
        const fDataFim = fDataFimEl ? fDataFimEl.value : '';
        const usandoFiltros = fBusca !== "" || fBarbeiro !== "" || fDataInicio !== "" || fDataFim !== "";

        Object.keys(registrosGlobais).forEach(function (idFirebase) {
            const registro = registrosGlobais[idFirebase];

            if (perfilUsuario === 'barbeiro' && registro.barbeiro !== nomeUsuario) return;

            if (registro.data === dataSelecionadaBR) {
                faturamentoBrutoGeral += registro.faturamento;
                totalFichasGeral += registro.fichas;
            }
            if (registro.data && registro.data.slice(3) === mesAnoAtual) {
                faturamentoBrutoMes += registro.faturamento;
                totalFichasMes += registro.fichas;
                if (registro.barbeiro === nomeUsuario) suaParteMes += registro.totalBarbeiro;
            }

            let mostrar = true;
            if (usandoFiltros) {
                if (fBusca !== "" && !registro.barbeiro.toLowerCase().includes(fBusca)) mostrar = false;
                if (fBarbeiro !== "" && registro.barbeiro !== fBarbeiro) mostrar = false;
                if (fDataInicio !== "" || fDataFim !== "") {
                    const p = registro.data.split('/');
                    const dataISO = `${p[2]}-${p[1]}-${p[0]}`;
                    if (fDataInicio !== "" && dataISO < fDataInicio) mostrar = false;
                    if (fDataFim !== "" && dataISO > fDataFim) mostrar = false;
                }
            } else {
                if (registro.data && registro.data.slice(3) !== dataSelecionadaBR.slice(3)) mostrar = false;
            }

            if (mostrar) {
                qtdResultadosFiltrados++;
                faturamentoFiltrado += registro.faturamento;
                parteBarbeiroFiltrado += registro.totalBarbeiro;

                const tr = document.createElement('tr');
                if (registro.pago) tr.classList.add('linha-paga');

                let botaoDocumento = (registro.pago && registro.comprovante) ? `<button class="btn-ver-doc" data-id="${idFirebase}" style="background-color: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;" title="Ver Comprovante Anexado">📄</button>` : '';

                let botoesAcao = '';
                if (perfilUsuario === 'master') {
                    const textoBotao = registro.pago ? 'Desfazer' : 'Pagar';
                    const corBotao = registro.pago ? '#94a3b8' : '#10b981';
                    botoesAcao = `
                        <button class="btn-pago" data-index="${idFirebase}" style="background-color: ${corBotao}; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-right: 5px;">${textoBotao}</button>
                        <button class="btn-excluir" data-index="${idFirebase}" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">X</button>
                    `;
                } else {
                    const statusTexto = registro.pago ? '✔️ Pago' : '⏳ Pendente';
                    const statusCor = registro.pago ? '#15803d' : '#b45309';
                    botoesAcao = `<span style="color: ${statusCor}; font-weight: bold; margin-left: 5px;">${statusTexto}</span>`;
                }

                const gorjetaVal = (registro.gorjeta || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const valeVal = (registro.vale || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                let colunaFaturamentoMaster = '';
                if (perfilUsuario === 'master') {
                    const fatTexto = (registro.faturamento || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    colunaFaturamentoMaster = `<td style="color: #0284c7; font-weight: bold;">${fatTexto}</td>`;
                }

                tr.innerHTML = `
                    <td>${registro.data}</td>
                    <td><strong>${registro.barbeiro.split(' ')[0]}</strong></td>
                    <td>${registro.fichas}</td>
                    <td style="color: #16a34a;">${gorjetaVal}</td>
                    <td style="color: #ef4444;">${valeVal}</td>
                    <td style="color: ${registro.totalBarbeiro < 0 ? '#ef4444' : 'green'}; font-weight: bold;">${registro.totalBarbeiroTexto}</td>
                    ${colunaFaturamentoMaster}
                    <td style="display: flex; gap: 5px; align-items: center;">
                        ${botaoDocumento}
                        ${botoesAcao}
                    </td>
                `;
                listaAtendimentos.appendChild(tr);
            }
        });

        if (document.getElementById('total-atendimentos')) document.getElementById('total-atendimentos').textContent = totalFichasGeral;
        if (document.getElementById('total-fichas-mes')) document.getElementById('total-fichas-mes').textContent = totalFichasMes;
        if (document.getElementById('total-valor')) document.getElementById('total-valor').textContent = faturamentoBrutoGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (document.getElementById('total-valor-mes')) document.getElementById('total-valor-mes').textContent = faturamentoBrutoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (document.getElementById('total-parte-barbeiro-mes')) document.getElementById('total-parte-barbeiro-mes').textContent = suaParteMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const resumoBuscaEl = document.getElementById('resumo-busca');
        if (resumoBuscaEl) {
            if (usandoFiltros) {
                resumoBuscaEl.style.display = 'flex';
                let fatFormatado = faturamentoFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                let barbFormatado = parteBarbeiroFiltrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                let textoResumo = `<span style="font-size: 1.1rem; font-weight: bold; color: #15803d;">Parte do Barbeiro: ${barbFormatado}</span>`;
                if (perfilUsuario === 'master') {
                    textoResumo = `Faturamento Bruto: <strong style="color: #0c4a6e;">${fatFormatado}</strong><br>` + textoResumo;
                }
                resumoBuscaEl.innerHTML = `<span>Exibindo <strong>${qtdResultadosFiltrados}</strong> lançamento(s).</span> <span style="text-align: right;">${textoResumo}</span>`;
            } else {
                resumoBuscaEl.style.display = 'none';
            }
        }
    }

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const dataInput = document.getElementById('data-fechamento').value;
            const barbeiroSelect = document.getElementById('barbeiro');
            const barbeiroNome = barbeiroSelect.options[barbeiroSelect.selectedIndex].text;
            const qtdFichas = parseInt(document.getElementById('qtd-fichas').value);
            const gorjeta = parseFloat(document.getElementById('valor-gorjeta').value) || 0;
            const vale = parseFloat(document.getElementById('valor-vale').value) || 0;

            const resposta = await fetch('/api/fichas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: dataInput, barbeiro: barbeiroNome, fichas: qtdFichas, gorjeta: gorjeta, vale: vale })
            });

            if (!resposta.ok) {
                const erro = await resposta.json();
                alert(erro.erro || 'Erro ao registrar fechamento.');
                return;
            }

            alert("Fechamento lançado com sucesso!");
            form.reset();
            document.getElementById('data-fechamento').value = dataInput;
            await carregarFichas();
        });
    }

    const listaAtend = document.getElementById('lista-atendimentos');
    if (listaAtend) {
        listaAtend.addEventListener('click', async function (event) {
            const idFirebase = event.target.getAttribute('data-index') || event.target.getAttribute('data-id');

            if (event.target.classList.contains('btn-excluir') && perfilUsuario === 'master') {
                if (confirm("Deseja apagar este lançamento?")) {
                    await fetch(`/api/fichas/${idFirebase}`, { method: 'DELETE' });
                    await carregarFichas();
                }
            }

            if (event.target.classList.contains('btn-pago') && perfilUsuario === 'master') {
                const registroAtual = registrosGlobais[idFirebase];

                if (registroAtual.pago) {
                    if (confirm("Deseja desfazer este pagamento?\n\n(Aviso: O gasto que foi lançado nos Insumos NÃO será apagado automaticamente. Você precisará ir na tela de Insumos e excluí-lo lá).")) {
                        await fetch(`/api/fichas/${idFirebase}/desfazer-pagamento`, { method: 'PUT' });
                        await carregarFichas();
                    }
                } else {
                    if (confirm("Deseja anexar um COMPROVANTE para este pagamento?")) {
                        idRegistroParaPagar = idFirebase;
                        modoPagamentoLote = false;
                        inputComprovante.click();
                    } else {
                        if (confirm("Deseja marcar como pago SEM COMPROVANTE?")) {
                            await fetch(`/api/fichas/${idFirebase}/pagar`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ comprovante: null })
                            });
                            alert("Pagamento registrado SEM comprovante e enviado aos Insumos com sucesso!");
                            await carregarFichas();
                        }
                    }
                }
            }

            if (event.target.classList.contains('btn-ver-doc')) {
                const registro = registrosGlobais[idFirebase];
                if (registro && registro.comprovante) {
                    const win = window.open();
                    if (registro.comprovante.includes('data:application/pdf')) {
                        win.document.write(`<iframe src="${registro.comprovante}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position:fixed;" allowfullscreen></iframe>`);
                    } else {
                        win.document.write(`<img src="${registro.comprovante}" style="max-width:100%; height:auto; display:block; margin:20px auto;" />`);
                    }
                }
            }
        });
    }

    if (inputComprovante) {
        inputComprovante.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const file = this.files[0];

                if (file.size > 2 * 1024 * 1024) {
                    alert("O arquivo é muito grande. Escolha um comprovante de até 2MB.");
                    inputComprovante.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = async function (e) {
                    const base64Comprovante = e.target.result;

                    if (modoPagamentoLote) {
                        const resposta = await fetch('/api/fichas/pagar-lote', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: idsLotePendente, comprovante: base64Comprovante })
                        });
                        const dados = await resposta.json();
                        alert(`${dados.quantidade_paga} lançamento(s) marcado(s) como pago(s) COM comprovante (e enviados aos Insumos)!`);
                        modoPagamentoLote = false;
                        idsLotePendente = [];
                    } else if (idRegistroParaPagar) {
                        await fetch(`/api/fichas/${idRegistroParaPagar}/pagar`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ comprovante: base64Comprovante })
                        });
                        idRegistroParaPagar = null;
                    }

                    inputComprovante.value = '';
                    await carregarFichas();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const fBusca = document.getElementById('filtro-busca');
    if (fBusca) fBusca.addEventListener('input', atualizarTela);
    const fBarbeiro = document.getElementById('filtro-barbeiro');
    if (fBarbeiro) fBarbeiro.addEventListener('change', atualizarTela);
    const fDataIni = document.getElementById('filtro-data-inicio');
    if (fDataIni) fDataIni.addEventListener('change', atualizarTela);
    const fDataFim = document.getElementById('filtro-data-fim');
    if (fDataFim) fDataFim.addEventListener('change', atualizarTela);
    const dataF = document.getElementById('data-fechamento');
    if (dataF) dataF.addEventListener('change', atualizarTela);
    const btnLimpar = document.getElementById('btn-limpar-filtro');
    if (btnLimpar) btnLimpar.addEventListener('click', () => {
        if (document.getElementById('filtro-busca')) document.getElementById('filtro-busca').value = '';
        if (perfilUsuario === 'master' && document.getElementById('filtro-barbeiro')) document.getElementById('filtro-barbeiro').value = '';
        if (document.getElementById('filtro-data-inicio')) document.getElementById('filtro-data-inicio').value = '';
        if (document.getElementById('filtro-data-fim')) document.getElementById('filtro-data-fim').value = '';
        atualizarTela();
    });

    const btnAdicionarBarbeiro = document.getElementById('btn-adicionar-barbeiro');
    const btnEditarBarbeiro = document.getElementById('btn-editar-barbeiro');
    const btnRemoverBarbeiro = document.getElementById('btn-remover-barbeiro');
    const barbeiroSelect = document.getElementById('barbeiro');

    async function salvarListaBarbeiros() {
        await fetch('/api/fichas/barbeiros', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barbeiros: listaBarbeiros })
        });
    }

    if (btnAdicionarBarbeiro) {
        btnAdicionarBarbeiro.addEventListener('click', async () => {
            if (perfilUsuario !== 'master') {
                alert("Apenas administradores podem adicionar barbeiros.");
                return;
            }
            const novoNome = prompt("Digite o nome do novo barbeiro (Ex: Lucas Queiroz):");
            if (novoNome && novoNome.trim() !== "") {
                const nomeFormatado = novoNome.trim();
                if (!listaBarbeiros.includes(nomeFormatado)) {
                    listaBarbeiros.push(nomeFormatado);
                    await salvarListaBarbeiros();
                    renderizarOpcoesBarbeiros();
                    barbeiroSelect.value = nomeFormatado;
                    alert(`Barbeiro "${nomeFormatado}" adicionado com sucesso!`);
                } else {
                    alert("Este barbeiro já está na lista.");
                }
            }
        });
    }

    if (btnEditarBarbeiro) {
        btnEditarBarbeiro.addEventListener('click', async () => {
            if (perfilUsuario !== 'master') {
                alert("Apenas administradores podem editar barbeiros.");
                return;
            }
            if (!barbeiroSelect.value) {
                alert("Selecione um barbeiro na caixa ao lado para editar.");
                return;
            }
            const nomeAtual = barbeiroSelect.value;
            const novoNome = prompt("Edite o nome do barbeiro:", nomeAtual);

            if (novoNome && novoNome.trim() !== "" && novoNome.trim() !== nomeAtual) {
                const nomeFormatado = novoNome.trim();
                if (listaBarbeiros.includes(nomeFormatado)) {
                    alert("Já existe um barbeiro com este nome.");
                    return;
                }
                const index = listaBarbeiros.indexOf(nomeAtual);
                if (index > -1) {
                    listaBarbeiros[index] = nomeFormatado;
                    await salvarListaBarbeiros();
                    renderizarOpcoesBarbeiros();
                    barbeiroSelect.value = nomeFormatado;
                    alert(`Nome alterado de "${nomeAtual}" para "${nomeFormatado}".`);
                }
            }
        });
    }

    if (btnRemoverBarbeiro) {
        btnRemoverBarbeiro.addEventListener('click', async () => {
            if (perfilUsuario !== 'master') {
                alert("Apenas administradores podem remover barbeiros.");
                return;
            }
            if (!barbeiroSelect.value) {
                alert("Selecione um barbeiro na caixa ao lado para remover.");
                return;
            }
            const nomeAtual = barbeiroSelect.value;
            if (confirm(`Tem certeza que deseja remover "${nomeAtual}" da lista de opções?`)) {
                const index = listaBarbeiros.indexOf(nomeAtual);
                if (index > -1) {
                    listaBarbeiros.splice(index, 1);
                    await salvarListaBarbeiros();
                    renderizarOpcoesBarbeiros();
                    alert(`Barbeiro "${nomeAtual}" foi removido da lista.`);
                }
            }
        });
    }

    // ==========================================
    // EXPORTAR EXCEL E PAGAR TODOS OS VISÍVEIS
    // ==========================================
    const btnExportar = document.getElementById('btn-exportar');
    const btnPagarVisiveis = document.getElementById('btn-pagar-visiveis');

    if (btnExportar) {
        btnExportar.addEventListener('click', function () {
            const chaves = Object.keys(registrosGlobais);
            if (chaves.length === 0) {
                alert("Não há dados para exportar!");
                return;
            }

            let csvContent = "\uFEFFData;Barbeiro;Fichas;Gorjeta;Vale;Parte Barbeiro;Parte Barbearia;Faturamento Bruto\n";

            chaves.forEach((id) => {
                const r = registrosGlobais[id];
                let gorjeta = Number(r.gorjeta || 0).toFixed(2).replace('.', ',');
                let vale = Number(r.vale || 0).toFixed(2).replace('.', ',');
                let fat = Number(r.faturamento || 0).toFixed(2).replace('.', ',');

                csvContent += `${r.data};${r.barbeiro};${r.fichas};R$ ${gorjeta};R$ ${vale};${r.totalBarbeiroTexto};${r.totalBarbeariaTexto};R$ ${fat}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.setAttribute("href", URL.createObjectURL(blob));
            link.setAttribute("download", "relatorio_fichas.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    if (btnPagarVisiveis) {
        btnPagarVisiveis.addEventListener('click', function () {
            const botoesPagos = document.querySelectorAll('#lista-atendimentos .btn-pago');
            let idsPendentes = [];

            botoesPagos.forEach(btn => {
                const idFirebase = btn.getAttribute('data-index');
                const registro = registrosGlobais[idFirebase];
                if (registro && !registro.pago) {
                    idsPendentes.push(idFirebase);
                }
            });

            if (idsPendentes.length === 0) {
                alert("Não há nenhum lançamento pendente visível na tela para pagar.");
                return;
            }

            if (confirm(`Encontrados ${idsPendentes.length} lançamento(s) pendente(s).\nDeseja anexar um ÚNICO comprovante para todos eles?`)) {
                modoPagamentoLote = true;
                idsLotePendente = idsPendentes;
                inputComprovante.click();
            } else {
                if (confirm("Deseja marcar todos como pagos SEM COMPROVANTE?")) {
                    fetch('/api/fichas/pagar-lote', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: idsPendentes, comprovante: null })
                    }).then(r => r.json()).then(dados => {
                        alert(`${dados.quantidade_paga} lançamento(s) marcado(s) como pago(s) SEM comprovante (e enviados aos Insumos)!`);
                        carregarFichas();
                    });
                }
            }
        });
    }
});
