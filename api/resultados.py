"""
API de Resultados do Mês: soma cortes, freezer, insumos e taxas de
máquina do mês selecionado.

Os campos lidos (faturamento, taxasMaquina, total) vêm de
registrosBarbearia, registrosCaixa e registrosFreezer.
"""

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia

bp = Blueprint("api_resultados", __name__, url_prefix="/api/resultados")


def _total_do_mes(registros: dict, campo: str, mes_ano_br: str) -> float:
    total = 0
    for registro in registros.values():
        if (registro.get("data") or "")[3:] == mes_ano_br:
            total += registro.get(campo, 0) or 0
    return total


@bp.route("", methods=["GET"])
@somente_master
def resumo():
    mes_ano = request.args.get("mes")  # formato esperado: YYYY-MM
    if not mes_ano or "-" not in mes_ano:
        return jsonify({"erro": "Parâmetro 'mes' é obrigatório (formato YYYY-MM)."}), 400

    ano, mes = mes_ano.split("-")
    mes_ano_br = f"{mes}/{ano}"

    cortes = referencia("registrosBarbearia").get() or {}
    caixa = referencia("registrosCaixa").get() or {}
    freezer = referencia("registrosFreezer").get() or {}
    insumos = referencia("registrosInsumos").get() or {}

    total_cortes = _total_do_mes(cortes, "faturamento", mes_ano_br)
    total_freezer = _total_do_mes(freezer, "total", mes_ano_br)
    total_insumos = _total_do_mes(insumos, "total", mes_ano_br)
    total_taxas = _total_do_mes(caixa, "taxasMaquina", mes_ano_br)

    total_entradas = total_cortes + total_freezer
    total_saidas = total_insumos + total_taxas

    return jsonify(
        {
            "cortes": total_cortes,
            "freezer": total_freezer,
            "entradas_total": total_entradas,
            "insumos": total_insumos,
            "taxas": total_taxas,
            "saidas_total": total_saidas,
            "lucro": total_entradas - total_saidas,
        }
    )
