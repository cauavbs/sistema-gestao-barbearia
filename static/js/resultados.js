document.addEventListener('DOMContentLoaded', function () {
    const mesFiltroEl = document.getElementById('mes-filtro');
    const hoje = new Date();
    if (mesFiltroEl) mesFiltroEl.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    function formatar(valor) {
        return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    async function carregar() {
        const mes = mesFiltroEl ? mesFiltroEl.value : '';
        if (!mes) return;

        const resposta = await fetch(`/api/resultados?mes=${mes}`);
        if (!resposta.ok) return;
        const dados = await resposta.json();

        document.getElementById('res-cortes').textContent = formatar(dados.cortes);
        document.getElementById('res-freezer').textContent = formatar(dados.freezer);
        document.getElementById('res-entradas-total').textContent = formatar(dados.entradas_total);

        document.getElementById('res-insumos').textContent = formatar(dados.insumos);
        document.getElementById('res-taxas').textContent = formatar(dados.taxas);
        document.getElementById('res-saidas-total').textContent = formatar(dados.saidas_total);

        const lucroEl = document.getElementById('res-lucro');
        lucroEl.textContent = formatar(dados.lucro);
        lucroEl.style.color = dados.lucro >= 0 ? '#15803d' : '#dc2626';
    }

    if (mesFiltroEl) mesFiltroEl.addEventListener('change', carregar);
    carregar();
});
