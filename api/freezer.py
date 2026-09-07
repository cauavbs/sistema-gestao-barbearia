"""API de Vendas do Freezer."""

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia
from servicos.formatacao import formatar_moeda

bp = Blueprint("api_freezer", __name__, url_prefix="/api/freezer")


@bp.route("", methods=["GET"])
@somente_master
def listar():
    dados = referencia("registrosFreezer").get() or {}
    lista = [{"id": id_, **valor} for id_, valor in dados.items()]
    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}

    data_iso = corpo.get("data")
    produto = (corpo.get("produto") or "").strip()
    quantidade = corpo.get("quantidade")
    valor_unitario = corpo.get("valorUnitario")

    if not data_iso or not produto or not quantidade or valor_unitario is None:
        return jsonify({"erro": "Preencha data, produto, quantidade e valor unitário."}), 400

    try:
        quantidade = int(quantidade)
        valor_unitario = float(valor_unitario)
    except (TypeError, ValueError):
        return jsonify({"erro": "Valores numéricos inválidos."}), 400

    if quantidade <= 0:
        return jsonify({"erro": "A quantidade deve ser maior que zero."}), 400
    if valor_unitario < 0:
        return jsonify({"erro": "O valor não pode ser negativo."}), 400

    total = quantidade * valor_unitario
    data_br = "/".join(reversed(data_iso.split("-")))

    novo_registro = {
        "data": data_br,
        "produto": produto,
        "quantidade": quantidade,
        "valorUnitario": valor_unitario,
        "total": total,
        "valorUnitarioTexto": formatar_moeda(valor_unitario),
        "totalTexto": formatar_moeda(total),
    }

    nova_ref = referencia("registrosFreezer").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_venda>", methods=["DELETE"])
@somente_master
def excluir(id_venda):
    referencia(f"registrosFreezer/{id_venda}").delete()
    return jsonify({"ok": True})
