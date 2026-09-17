document.addEventListener('DOMContentLoaded', function () {
    const formLembrete = document.getElementById('form-lembrete');
    const listaLembretes = document.getElementById('lista-lembretes');

    async function carregarLembretes() {
        const resposta = await fetch('/api/lembretes');
        const lembretes = await resposta.json();
        renderizar(lembretes);
    }

    function renderizar(lembretes) {
        if (!listaLembretes) return;
        listaLembretes.innerHTML = '';

        if (lembretes.length === 0) {
            listaLembretes.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; padding: 20px;">Você não tem nenhum lembrete agendado.</p>';
            return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        lembretes.forEach(function (reg) {
            const partesData = reg.dataISO.split('-');
            const dataPrazo = new Date(partesData[0], partesData[1] - 1, partesData[2]);
            dataPrazo.setHours(0, 0, 0, 0);

            const diferencaDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));

            let corBorda, corFundo, icone, textoStatus;

            if (diferencaDias <= 7) {
                corBorda = '#ef4444';
                corFundo = '#fef2f2';
                icone = '❗';
                textoStatus = diferencaDias < 0
                    ? `Atrasado há ${Math.abs(diferencaDias)} dia(s)`
                    : (diferencaDias === 0 ? 'Vence Hoje!' : `Vence em ${diferencaDias} dia(s)`);
            } else if (diferencaDias <= 30) {
                corBorda = '#f59e0b';
                corFundo = '#fefce8';
                icone = '⚠️';
                textoStatus = `Vence em ${diferencaDias} dias`;
            } else {
                corBorda = '#22c55e';
                corFundo = '#f0fdf4';
                icone = '✅';
                textoStatus = `Tranquilo (Vence em ${diferencaDias} dias)`;
            }

            const card = document.createElement('div');
            card.style.cssText = `background: ${corFundo}; border-left: 5px solid ${corBorda}; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;`;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="font-size: 1.1rem; margin-right: 5px;">${icone}</span>
                        <strong style="color: ${corBorda}; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">${textoStatus}</strong>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn-reprogramar" data-id="${reg.id}" data-br="${reg.dataBR}" style="background-color: #1e3a8a; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; width: auto; margin-top: 0; box-shadow: none;" title="Escolher uma nova data">Reprogramar 📅</button>
                        <button class="btn-excluir" data-id="${reg.id}" style="background-color: #10b981; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; width: auto; margin-top: 0; box-shadow: none;" title="Concluir e Apagar Lembrete">Concluído ✔️</button>
                    </div>
                </div>
                <h3 style="color: #0f172a; margin: 5px 0 10px 0; font-size: 1.15rem; font-weight: 700;">${reg.texto}</h3>
                <p style="color: #64748b; font-size: 0.9rem; margin: 0;"><strong>Data Limite:</strong> ${reg.dataBR}</p>
            `;
            listaLembretes.appendChild(card);
        });
    }

    if (formLembrete) {
        formLembrete.addEventListener('submit', async function (e) {
            e.preventDefault();
            const dataISO = document.getElementById('data-lembrete').value;
            const texto = document.getElementById('texto-lembrete').value.trim();

            await fetch('/api/lembretes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataISO, texto })
            });

            formLembrete.reset();
            await mostrarAlerta('Lembrete agendado com sucesso!');
            carregarLembretes();
        });
    }

    if (listaLembretes) {
        listaLembretes.addEventListener('click', async function (e) {
            if (e.target.classList.contains('btn-excluir')) {
                const id = e.target.getAttribute('data-id');
                if (await mostrarConfirmacao('Marcar este lembrete como concluído e removê-lo da lista?')) {
                    await fetch(`/api/lembretes/${id}`, { method: 'DELETE' });
                    carregarLembretes();
                }
            }

            if (e.target.classList.contains('btn-reprogramar')) {
                const id = e.target.getAttribute('data-id');
                const dataAtualBR = e.target.getAttribute('data-br');
                const novaData = await mostrarPrompt('Digite a nova data para o lembrete (Formato: DD/MM/AAAA):', dataAtualBR);

                if (novaData && novaData !== dataAtualBR) {
                    const partes = novaData.split('/');
                    if (partes.length === 3 && partes[2].length === 4) {
                        await fetch(`/api/lembretes/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ dataBR: novaData })
                        });
                        carregarLembretes();
                    } else {
                        await mostrarAlerta('Formato de data inválido! Por favor, use o padrão Dia/Mês/Ano (Exemplo: 25/08/2026).');
                    }
                }
            }
        });
    }

    carregarLembretes();
});
