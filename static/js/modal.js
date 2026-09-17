// Modal próprio, no visual do sistema, para substituir os diálogos nativos
// do navegador (alert/confirm/prompt), que travam a tela inteira e não
// combinam com o resto do layout.
//
// Uso (em qualquer outro .js, dentro de uma função async):
//   await mostrarAlerta('Lançamento salvo com sucesso!');
//   const ok = await mostrarConfirmacao('Apagar este item?');
//   const valor = await mostrarPrompt('Nova data:', '25/12/2026');
//
// As três funções ficam disponíveis globalmente (window.mostrarAlerta etc.)
// porque cada página carrega seu próprio arquivo .js separado, sem módulos.

(function () {
    function criarEstrutura() {
        let overlay = document.getElementById('modal-overlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true">
                <p class="modal-mensagem" id="modal-mensagem"></p>
                <div class="modal-input-container" id="modal-input-container" style="display:none;">
                    <input type="text" id="modal-input" class="modal-input">
                </div>
                <div class="modal-acoes" id="modal-acoes"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function abrirModal({ mensagem, comInput = false, valorInicial = '', botoes }) {
        return new Promise(resolve => {
            const overlay = criarEstrutura();
            const mensagemEl = overlay.querySelector('#modal-mensagem');
            const inputContainer = overlay.querySelector('#modal-input-container');
            const input = overlay.querySelector('#modal-input');
            const acoesEl = overlay.querySelector('#modal-acoes');

            mensagemEl.textContent = mensagem;
            acoesEl.innerHTML = '';

            if (comInput) {
                inputContainer.style.display = 'block';
                input.value = valorInicial;
            } else {
                inputContainer.style.display = 'none';
            }

            function fechar(valorResolvido) {
                overlay.classList.remove('ativo');
                document.removeEventListener('keydown', aoTeclar);
                resolve(valorResolvido);
            }

            function aoTeclar(evento) {
                if (evento.key === 'Escape') {
                    const botaoCancelar = botoes.find(b => b.papel === 'cancelar');
                    fechar(botaoCancelar ? botaoCancelar.valor : null);
                } else if (evento.key === 'Enter' && comInput) {
                    const botaoConfirmar = botoes.find(b => b.papel === 'confirmar');
                    if (botaoConfirmar) fechar(comInput ? input.value : botaoConfirmar.valor);
                }
            }

            botoes.forEach(botao => {
                const btnEl = document.createElement('button');
                btnEl.type = 'button';
                btnEl.textContent = botao.texto;
                btnEl.className = 'modal-btn ' + (botao.estilo || 'modal-btn-primario');
                btnEl.addEventListener('click', () => {
                    if (comInput && botao.papel === 'confirmar') {
                        fechar(input.value);
                    } else {
                        fechar(botao.valor);
                    }
                });
                acoesEl.appendChild(btnEl);
            });

            document.addEventListener('keydown', aoTeclar);
            overlay.classList.add('ativo');
            if (comInput) {
                setTimeout(() => input.focus(), 50);
            }
        });
    }

    window.mostrarAlerta = function (mensagem) {
        return abrirModal({
            mensagem,
            botoes: [{ texto: 'OK', papel: 'confirmar', valor: true, estilo: 'modal-btn-primario' }],
        });
    };

    window.mostrarConfirmacao = function (mensagem) {
        return abrirModal({
            mensagem,
            botoes: [
                { texto: 'Cancelar', papel: 'cancelar', valor: false, estilo: 'modal-btn-secundario' },
                { texto: 'Confirmar', papel: 'confirmar', valor: true, estilo: 'modal-btn-primario' },
            ],
        }).then(valor => Boolean(valor));
    };

    window.mostrarPrompt = function (mensagem, valorInicial = '') {
        return abrirModal({
            mensagem,
            comInput: true,
            valorInicial,
            botoes: [
                { texto: 'Cancelar', papel: 'cancelar', valor: null, estilo: 'modal-btn-secundario' },
                { texto: 'OK', papel: 'confirmar', valor: null, estilo: 'modal-btn-primario' },
            ],
        });
    };
})();
