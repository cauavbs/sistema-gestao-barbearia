"""API de Insumos e Contas."""

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia
from servicos.formatacao import formatar_moeda

bp = Blueprint("api_insumos", __name__, url_prefix="/api/insumos")

MAX_TAMANHO_COMPROVANTE = 2_900_000  # ~2MB em base64 (com folga de overhead)


@bp.route("", methods=["GET"])
@somente_master
def listar():
    dados = referencia("registrosInsumos").get() or {}
    lista = [{"id": id_, **valor} for id_, valor in dados.items()]
    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}

    data_iso = corpo.get("data")
    conta = (corpo.get("conta") or "").strip()
    quantidade = corpo.get("quantidade")
    valor_unitario = corpo.get("valorUnitario")
    comprovante = corpo.get("comprovante")

    if not data_iso or not conta or not quantidade or valor_unitario is None:
        return jsonify({"erro": "Preencha data, conta/produto, quantidade e valor."}), 400

    if comprovante and len(comprovante) > MAX_TAMANHO_COMPROVANTE:
        return jsonify({"erro": "Comprovante muito grande (máximo aproximado de 2MB)."}), 400

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
        "conta": conta,
        "quantidade": quantidade,
        "valor_unitario": valor_unitario,
        "total": total,
        "valor_unitario_texto": formatar_moeda(valor_unitario),
        "total_texto": formatar_moeda(total),
        "comprovante": comprovante,
    }

    nova_ref = referencia("registrosInsumos").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_insumo>", methods=["DELETE"])
@somente_master
def excluir(id_insumo):
    referencia(f"registrosInsumos/{id_insumo}").delete()
    return jsonify({"ok": True})
