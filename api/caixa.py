"""
API de Classificação e Troco (classificacao.html): fechamento de caixa
do dia e configuração das taxas de máquina de cartão.

Diferença importante em relação ao original: as taxas de débito/crédito
antes ficavam salvas no localStorage do navegador (cada computador ou
celular guardava o próprio valor, então dois masters em dispositivos
diferentes podiam ver taxas diferentes). Agora ficam salvas no Firebase
(nó 'configuracoesBarbearia/taxasMaquina'), então valem para todo mundo
que acessar o sistema, em qualquer aparelho.
"""

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia
from servicos.formatacao import formatar_moeda

bp = Blueprint("api_caixa", __name__, url_prefix="/api/caixa")

VALOR_POR_FICHA = 20.00
TAXAS_PADRAO = {"debito": 0, "debito2": 0, "credito": 0, "credito2": 0}


@bp.route("/taxas", methods=["GET"])
@somente_master
def obter_taxas():
    dados = referencia("configuracoesBarbearia/taxasMaquina").get()
    return jsonify({**TAXAS_PADRAO, **(dados or {})})


@bp.route("/taxas", methods=["PUT"])
@somente_master
def salvar_taxas():
    corpo = request.get_json(silent=True) or {}
    taxas = {
        "debito": float(corpo.get("debito", 0) or 0),
        "debito2": float(corpo.get("debito2", 0) or 0),
        "credito": float(corpo.get("credito", 0) or 0),
        "credito2": float(corpo.get("credito2", 0) or 0),
    }
    referencia("configuracoesBarbearia/taxasMaquina").set(taxas)
    return jsonify(taxas)


def _fichas_do_dia(data_br: str) -> int:
    registros = referencia("registrosBarbearia").get() or {}
    total = 0
    for reg in registros.values():
        if reg.get("data") == data_br:
            total += int(reg.get("fichas") or 0)
    return total


@bp.route("/fichas-do-dia", methods=["GET"])
@somente_master
def fichas_do_dia():
    data_iso = request.args.get("data", "")
    data_br = "/".join(reversed(data_iso.split("-"))) if data_iso else ""
    return jsonify({"totalFichas": _fichas_do_dia(data_br)})


@bp.route("", methods=["GET"])
@somente_master
def listar():
    dados = referencia("registrosCaixa").get() or {}
    lista = [{"id": id_, **valor} for id_, valor in dados.items()]
    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}

    data_iso = corpo.get("data")
    if not data_iso:
        return jsonify({"erro": "Informe a data."}), 400
    data_br = "/".join(reversed(data_iso.split("-")))

    try:
        troco = float(corpo.get("troco", 0) or 0)
        pix = int(corpo.get("pix", 0) or 0)
        debito = int(corpo.get("debito", 0) or 0)
        debito2 = int(corpo.get("debito2", 0) or 0)
        credito = int(corpo.get("credito", 0) or 0)
        credito2 = int(corpo.get("credito2", 0) or 0)
    except (TypeError, ValueError):
        return jsonify({"erro": "Valores numéricos inválidos."}), 400

    taxas = referencia("configuracoesBarbearia/taxasMaquina").get() or {}
    taxa_debito = float(taxas.get("debito", 0) or 0)
    taxa_debito2 = float(taxas.get("debito2", 0) or 0)
    taxa_credito = float(taxas.get("credito", 0) or 0)
    taxa_credito2 = float(taxas.get("credito2", 0) or 0)

    total_fichas_dia = _fichas_do_dia(data_br)
    total_digital = pix + debito + debito2 + credito + credito2
    fichas_dinheiro = max(total_fichas_dia - total_digital, 0)

    valor_em_dinheiro = fichas_dinheiro * VALOR_POR_FICHA
    total_gaveta = troco + valor_em_dinheiro

    bruto_debito = debito * VALOR_POR_FICHA
    bruto_debito2 = debito2 * VALOR_POR_FICHA
    bruto_credito = credito * VALOR_POR_FICHA
    bruto_credito2 = credito2 * VALOR_POR_FICHA

    total_desconto = (
        bruto_debito * (taxa_debito / 100)
        + bruto_debito2 * (taxa_debito2 / 100)
        + bruto_credito * (taxa_credito / 100)
        + bruto_credito2 * (taxa_credito2 / 100)
    )
    digital_liquido = (
        pix * VALOR_POR_FICHA + bruto_debito + bruto_debito2 + bruto_credito + bruto_credito2
    ) - total_desconto

    novo_registro = {
        "data": data_br,
        "troco": troco,
        "totalFichas": total_fichas_dia,
        "pix": pix,
        "debito": debito,
        "debito2": debito2,
        "credito": credito,
        "credito2": credito2,
        "fichasDinheiro": fichas_dinheiro,
        "taxasMaquina": total_desconto,
        "digitalLiquido": digital_liquido,
        "totalGaveta": total_gaveta,
        "totalGavetaTexto": formatar_moeda(total_gaveta),
    }

    nova_ref = referencia("registrosCaixa").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_caixa>", methods=["DELETE"])
@somente_master
def excluir(id_caixa):
    referencia(f"registrosCaixa/{id_caixa}").delete()
    return jsonify({"ok": True})
