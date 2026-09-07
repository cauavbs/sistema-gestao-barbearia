"""
API de Gestão de Perfis.

Usa o Admin SDK do Firebase para criar, editar e apagar contas de
qualquer usuário diretamente, sem afetar a sessão de quem está
logado fazendo a alteração. Excluir um perfil também apaga a conta
no Firebase Auth, revogando o acesso por completo.
"""

from firebase_admin import auth as admin_auth
from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia

bp = Blueprint("api_perfis", __name__, url_prefix="/api/perfis")


@bp.route("", methods=["GET"])
@somente_master
def listar():
    dados = referencia("usuarios").get() or {}
    lista = [{"id": uid, **valor} for uid, valor in dados.items()]
    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}

    nome = (corpo.get("nome") or "").strip()
    email = (corpo.get("email") or "").strip()
    senha = corpo.get("senha") or ""
    perfil = corpo.get("perfil", "barbeiro")

    if not nome or not email or len(senha) < 6:
        return jsonify({"erro": "Preencha nome, e-mail e uma senha com no mínimo 6 caracteres."}), 400

    try:
        novo_usuario = admin_auth.create_user(email=email, password=senha)
    except Exception as erro:  # noqa: BLE001 - repassamos a mensagem ao front
        return jsonify({"erro": f"Erro ao criar conta: {erro}"}), 400

    dados_perfil = {"nome": nome, "email": email, "senha": senha, "perfil": perfil}
    referencia(f"usuarios/{novo_usuario.uid}").set(dados_perfil)
    return jsonify({"id": novo_usuario.uid, **dados_perfil}), 201


@bp.route("/<uid>", methods=["PUT"])
@somente_master
def atualizar(uid):
    corpo = request.get_json(silent=True) or {}

    nome = (corpo.get("nome") or "").strip()
    senha = corpo.get("senha") or ""
    perfil = corpo.get("perfil", "barbeiro")

    if not nome or len(senha) < 6:
        return jsonify({"erro": "Informe o nome e uma senha com no mínimo 6 caracteres."}), 400

    try:
        admin_auth.update_user(uid, password=senha)
    except Exception as erro:  # noqa: BLE001
        return jsonify({"erro": f"Erro ao atualizar a senha: {erro}"}), 400

    referencia(f"usuarios/{uid}").update({"nome": nome, "senha": senha, "perfil": perfil})
    return jsonify({"ok": True})


@bp.route("/<uid>", methods=["DELETE"])
@somente_master
def excluir(uid):
    referencia(f"usuarios/{uid}").delete()
    try:
        admin_auth.delete_user(uid)
    except Exception:  # noqa: BLE001
        # A conta pode já não existir no Firebase Auth por algum motivo;
        # o que importa é garantir que o registro de perfil saiu.
        pass
    return jsonify({"ok": True})
