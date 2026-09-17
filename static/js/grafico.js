let graficoComparativo = null;
let graficoBarbeiros = null;
let graficoPagamentos = null;

const CORES_BARBEIROS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

document.addEventListener('DOMContentLoaded', function () {
    const mesFinalEl = document.getElementById('mes-final');
    const periodoEl = document.getElementById('periodo-comparacao');
    const btnAtualizar = document.getElementById('btn-atualizar-grafico');
    const statusEl = document.getElementById('status-grafico');

    const hoje = new Date();
    if (mesFinalEl) mesFinalEl.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    async function atualizarGraficos() {
        const mesFinal = mesFinalEl ? mesFinalEl.value : '';
        const quantidade = periodoEl ? periodoEl.value : '6';

        if (!mesFinal) {
            if (statusEl) statusEl.textContent = 'Selecione um mês válido.';
            return;
        }

        if (statusEl) statusEl.textContent = 'Carregando...';

        const resposta = await fetch(`/api/grafico?mes_final=${mesFinal}&quantidade=${quantidade}`);
        if (!resposta.ok) {
            if (statusEl) statusEl.textContent = 'Erro ao carregar os dados.';
            return;
        }

        const dados = await resposta.json();
        renderizarGraficoComparativo(dados.meses);
        renderizarGraficoBarbeiros(dados.meses, dados.barbeiros);
        renderizarGraficoPagamentos(dados.meses);
        renderizarTabela(dados.meses);
        renderizarTotais(dados.meses);

        if (statusEl) statusEl.textContent = `Exibindo os últimos ${quantidade} mês(es), até ${dados.meses[dados.meses.length - 1].rotulo}.`;
    }

    function formatarMoeda(valor) {
        return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function renderizarTotais(meses) {
        let entradas = 0, saidas = 0, lucro = 0;
        meses.forEach(m => { entradas += m.entradas; saidas += m.saidas; lucro += m.lucro; });

        const elEntradas = document.getElementById('total-entradas-periodo');
        const elSaidas = document.getElementById('total-saidas-periodo');
        const elLucro = document.getElementById('total-lucro-periodo');
        if (elEntradas) elEntradas.textContent = formatarMoeda(entradas);
        if (elSaidas) elSaidas.textContent = formatarMoeda(saidas);
        if (elLucro) {
            elLucro.textContent = formatarMoeda(lucro);
            elLucro.style.color = lucro >= 0 ? '#1d4ed8' : '#dc2626';
        }
    }

    function renderizarGraficoComparativo(meses) {
        const canvas = document.getElementById('grafico-comparativo');
        if (!canvas) return;
        const rotulos = meses.map(m => m.rotulo);

        if (graficoComparativo) graficoComparativo.destroy();
        graficoComparativo = new Chart(canvas, {
            type: 'line',
            data: {
                labels: rotulos,
                datasets: [
                    { label: 'Entradas', data: meses.map(m => m.entradas), borderColor: '#16a34a', backgroundColor: '#16a34a', tension: 0.3, pointRadius: 4 },
                    { label: 'Saídas', data: meses.map(m => m.saidas), borderColor: '#dc2626', backgroundColor: '#dc2626', tension: 0.3, pointRadius: 4 },
                    { label: 'Lucro', data: meses.map(m => m.lucro), borderColor: '#1d4ed8', backgroundColor: '#1d4ed8', tension: 0.3, pointRadius: 4, borderDash: [6, 4] }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { ticks: { callback: (v) => formatarMoeda(v) } } }
            }
        });
    }

    function renderizarGraficoBarbeiros(meses, barbeiros) {
        const canvas = document.getElementById('grafico-barbeiros');
        if (!canvas) return;
        const rotulos = meses.map(m => m.rotulo);

        const datasets = barbeiros.map((nome, i) => ({
            label: nome,
            data: meses.map(m => m.faturamentoBarbeiros[nome] || 0),
            borderColor: CORES_BARBEIROS[i % CORES_BARBEIROS.length],
            backgroundColor: CORES_BARBEIROS[i % CORES_BARBEIROS.length],
            tension: 0.3,
            pointRadius: 4,
            fill: false
        }));

        if (graficoBarbeiros) graficoBarbeiros.destroy();
        graficoBarbeiros = new Chart(canvas, {
            type: 'line',
            data: { labels: rotulos, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { ticks: { callback: (v) => formatarMoeda(v) } } }
            }
        });
    }

    function renderizarGraficoPagamentos(meses) {
        const canvas = document.getElementById('grafico-pagamentos');
        if (!canvas) return;
        const rotulos = meses.map(m => m.rotulo);

        if (graficoPagamentos) graficoPagamentos.destroy();
        graficoPagamentos = new Chart(canvas, {
            type: 'line',
            data: {
                labels: rotulos,
                datasets: [
                    { label: 'Pix', data: meses.map(m => m.pix), borderColor: '#0891b2', backgroundColor: '#0891b2', tension: 0.3, pointRadius: 4 },
                    { label: 'Débito', data: meses.map(m => m.debito), borderColor: '#2563eb', backgroundColor: '#2563eb', tension: 0.3, pointRadius: 4 },
                    { label: 'Crédito', data: meses.map(m => m.credito), borderColor: '#7c3aed', backgroundColor: '#7c3aed', tension: 0.3, pointRadius: 4 },
                    { label: 'Dinheiro', data: meses.map(m => m.dinheiro), borderColor: '#16a34a', backgroundColor: '#16a34a', tension: 0.3, pointRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    function renderizarTabela(meses) {
        const tabela = document.getElementById('tabela-comparativa');
        if (!tabela) return;
        tabela.innerHTML = '';

        meses.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.rotulo}</strong></td>
                <td>${formatarMoeda(m.cortes)}</td>
                <td>${formatarMoeda(m.freezer)}</td>
                <td style="color: #15803d;">${formatarMoeda(m.entradas)}</td>
                <td style="color: #dc2626;">${formatarMoeda(m.saidas)}</td>
                <td style="color: ${m.lucro >= 0 ? '#15803d' : '#dc2626'}; font-weight: bold;">${formatarMoeda(m.lucro)}</td>
            `;
            tabela.appendChild(tr);
        });
    }

    if (btnAtualizar) btnAtualizar.addEventListener('click', atualizarGraficos);
    if (mesFinalEl) mesFinalEl.addEventListener('change', atualizarGraficos);
    if (periodoEl) periodoEl.addEventListener('change', atualizarGraficos);

    atualizarGraficos();
});