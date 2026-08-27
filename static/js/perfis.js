document.addEventListener('DOMContentLoaded', async function () {
    // Autocomplete de barbeiros: antes lia do localStorage (nunca
    // funcionava, porque quem escreve essa lista é o index.html, que
    // sempre salvou no Firebase) — agora usa a mesma rota do backend
    // que o index.html usa, então fica sempre sincronizado de verdade.
    async function carregarOpcoesBarbeiros() {
        const resposta = await fetch('/api/fichas/barbeiros');
        const listaBarbeiros = await resposta.json();
        const datalist = document.getElementById('opcoes-barbeiros');
        if (!datalist) return;
        datalist.innerHTML = listaBarbeiros.map(nome => `<option value="${nome}">`).join('');
    }
    await carregarOpcoesBarbeiros();

    const listaUsuariosEl = document.getElementById('lista-usuarios');

    async function carregarUsuarios() {
        const resposta = await fetch('/api/perfis');
        const usuarios = await resposta.json();

        if (!listaUsuariosEl) return;
        listaUsuariosEl.innerHTML = '';

        usuarios.forEach((u) => {
            const tr = document.createElement('tr');

            const nivelFormatado = u.perfil === 'master'
                ? '<strong style="color: #1d4ed8; background: #eff6ff; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">Master (Total)</strong>'
                : '<span style="color: #0284c7; background: #f0f9ff; padding: 4px 10px; border-radius: 6px; border: 1px solid #bae6fd;">Barbeiro (Restrito)</span>';
            const senhaExibida = u.senha ? u.senha : '<span style="color: #94a3b8;">Não registrada</span>';

            tr.innerHTML = `
                <td><strong>${u.nome}</strong></td>
                <td>${u.email}</td>
                <td>${senhaExibida}</td>
                <td>${nivelFormatado}</td>
                <td style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-editar" data-uid="${u.id}" data-nome="${u.nome}" data-email="${u.email}" data-perfil="${u.perfil}" style="background-color: #f59e0b; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; width: auto; margin: 0; box-shadow: none;">Editar ✏️</button>
                    <button class="btn-excluir" data-uid="${u.id}" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; width: auto; margin: 0; box-shadow: none;">Excluir 🗑️</button>
                </td>
            `;
            listaUsuariosEl.appendChild(tr);
        });
    }

    if (listaUsuariosEl) {
        listaUsuariosEl.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-excluir')) {
                const uid = e.target.getAttribute('data-uid');
                if (confirm("Deseja remover o acesso deste usuário do sistema?")) {
                    await fetch(`/api/perfis/${uid}`, { method: 'DELETE' });
                    alert("Acesso removido com sucesso!");
                    await carregarUsuarios();
                }
            }

            if (e.target.classList.contains('btn-editar')) {
                document.getElementById('edit-uid').value = e.target.getAttribute('data-uid');
                document.getElementById('edit-nome').value = e.target.getAttribute('data-nome');
                document.getElementById('edit-email').value = e.target.getAttribute('data-email');
                document.getElementById('edit-senha').value = '';
                document.getElementById('edit-perfil').value = e.target.getAttribute('data-perfil');
                document.getElementById('modal-editar').style.display = 'flex';
            }
        });
    }

    const btnFecharModal = document.getElementById('btn-fechar-modal');
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            document.getElementById('modal-editar').style.display = 'none';
        });
    }

    const formEditar = document.getElementById('form-editar');
    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.textContent = "Salvando...";
            btnSubmit.disabled = true;

            const uid = document.getElementById('edit-uid').value;
            const novaSenha = document.getElementById('edit-senha').value;
            const novoNome = document.getElementById('edit-nome').value.trim();
            const novoPerfil = document.getElementById('edit-perfil').value;

            try {
                const resposta = await fetch(`/api/perfis/${uid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: novoNome, senha: novaSenha, perfil: novoPerfil })
                });

                if (!resposta.ok) {
                    const erro = await resposta.json();
                    throw new Error(erro.erro || 'Erro desconhecido.');
                }

                alert("Perfil atualizado com sucesso!");
                document.getElementById('modal-editar').style.display = 'none';
                await carregarUsuarios();
            } catch (erro) {
                alert("Erro ao atualizar o perfil: " + erro.message);
            } finally {
                btnSubmit.textContent = "Salvar Alterações ✔️";
                btnSubmit.disabled = false;
            }
        });
    }

    const formPerfil = document.getElementById('form-perfil');
    if (formPerfil) {
        formPerfil.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome-usuario').value.trim();
            const email = document.getElementById('email-usuario').value.trim();
            const senha = document.getElementById('senha-usuario').value;
            const perfil = document.getElementById('tipo-perfil').value;

            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.textContent = "Criando...";
            btnSubmit.disabled = true;

            try {
                const resposta = await fetch('/api/perfis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, email, senha, perfil })
                });

                if (!resposta.ok) {
                    const erro = await resposta.json();
                    throw new Error(erro.erro || 'Erro desconhecido.');
                }

                alert(`Perfil de ${nome} criado com sucesso!`);
                formPerfil.reset();
                await carregarUsuarios();
            } catch (erro) {
                alert("Erro ao criar perfil: " + erro.message);
            } finally {
                btnSubmit.textContent = "Criar Conta de Acesso ✔️";
                btnSubmit.disabled = false;
            }
        });
    }

    await carregarUsuarios();
});
