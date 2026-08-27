"""
API de Relatórios e Ocorrências — substitui as chamadas diretas ao
Firebase que existiam no relatorio.html original (push, onValue, remove
em 'registrosRelatorios').
"""

import time

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia

bp = Blueprint("api_relatorios", __name__, url_prefix="/api/relatorios")


@bp.route("", methods=["GET"])
@somente_master
def listar():
    mes_ano = request.args.get("mes", "")  # formato esperado: YYYY-MM
    dados = referencia("registrosRelatorios").get() or {}
    lista = [{"id": id_, **valor} for id_, valor in dados.items()]

    if mes_ano:
        ano, mes = mes_ano.split("-")
        mes_ano_br = f"{mes}/{ano}"
        lista = [item for item in lista if (item.get("data") or "")[3:] == mes_ano_br]

    lista.sort(key=lambda item: item.get("timestamp", 0), reverse=True)
    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}
    data_iso = corpo.get("data")  # vem do <input type="date"> como YYYY-MM-DD
    texto = (corpo.get("texto") or "").strip()

    if not data_iso or not texto:
        return jsonify({"erro": "Informe data e texto."}), 400

    data_br = "/".join(reversed(data_iso.split("-")))
    novo_registro = {
        "data": data_br,
        "texto": texto,
        "timestamp": int(time.time() * 1000),
    }

    nova_ref = referencia("registrosRelatorios").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_relatorio>", methods=["DELETE"])
@somente_master
def excluir(id_relatorio):
    referencia(f"registrosRelatorios/{id_relatorio}").delete()
    return jsonify({"ok": True})
