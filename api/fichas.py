"""
API de Fichas e Faturamento + lista de barbeiros.

Regras de negócio:
- Cada ficha vale R$ 20,00 de faturamento bruto.
- Comissão por ficha: R$ 10,00 para o barbeiro e R$ 10,00 para a
  barbearia, exceto aos domingos, quando é R$ 17,00 para o barbeiro e
  R$ 3,00 para a barbearia.
- Marcar uma ficha como "paga" lança automaticamente um gasto
  correspondente em Insumos. Desfazer o pagamento não remove esse
  gasto automaticamente.

Esta rota é acessível a qualquer usuário logado (master ou barbeiro).
Um barbeiro só vê as próprias fichas; o master vê tudo, sem filtro.
As ações de escrita (criar, excluir, pagar, editar a lista de
barbeiros) exigem perfil master.
"""

from datetime import datetime

from flask import Blueprint, jsonify, request, session

from autenticacao.decoradores import login_obrigatorio, somente_master
from servicos.firebase_service import referencia
from servicos.formatacao import formatar_moeda

bp = Blueprint("api_fichas", __name__, url_prefix="/api/fichas")

VALOR_POR_FICHA = 20.00
COMISSAO_BARBEIRO_PADRAO = 10.00
COMISSAO_BARBEARIA_PADRAO = 10.00
COMISSAO_BARBEIRO_DOMINGO = 17.00
COMISSAO_BARBEARIA_DOMINGO = 3.00

MAX_TAMANHO_COMPROVANTE = 2_900_000  # ~2MB em base64 (com folga de overhead)


def _e_domingo(data_iso: str) -> bool:
    data_obj = datetime.strptime(data_iso, "%Y-%m-%d").date()
    return data_obj.weekday() == 6  # Python: segunda=0 ... domingo=6


@bp.route("", methods=["GET"])
@login_obrigatorio
def listar():
    dados = referencia("registrosBarbearia").get() or {}
    lista = [{"id": id_, **valor} for id_, valor in dados.items()]

    # Um barbeiro só pode ver as próprias fichas; o master vê tudo.
    if session.get("perfil") != "master":
        lista = [item for item in lista if item.get("barbeiro") == session.get("nome")]

    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}

    data_iso = corpo.get("data")
    barbeiro = (corpo.get("barbeiro") or "").strip()
    fichas = corpo.get("fichas")
    gorjeta = corpo.get("gorjeta") or 0
    vale = corpo.get("vale") or 0

    if not data_iso or not barbeiro or not fichas:
        return jsonify({"erro": "Informe data, barbeiro e quantidade de fichas."}), 400

    try:
        fichas = int(fichas)
        gorjeta = float(gorjeta)
        vale = float(vale)
    except (TypeError, ValueError):
        return jsonify({"erro": "Valores numéricos inválidos."}), 400

    if fichas <= 0:
        return jsonify({"erro": "A quantidade de fichas deve ser maior que zero."}), 400
    if gorjeta < 0 or vale < 0:
        return jsonify({"erro": "Gorjeta e vale não podem ser negativos."}), 400

    if _e_domingo(data_iso):
        comissao_barbeiro, comissao_barbearia = COMISSAO_BARBEIRO_DOMINGO, COMISSAO_BARBEARIA_DOMINGO
    else:
        comissao_barbeiro, comissao_barbearia = COMISSAO_BARBEIRO_PADRAO, COMISSAO_BARBEARIA_PADRAO

    total_barbeiro = (fichas * comissao_barbeiro) + gorjeta - vale
    total_barbearia = fichas * comissao_barbearia
    faturamento = fichas * VALOR_POR_FICHA
    data_br = "/".join(reversed(data_iso.split("-")))

    novo_registro = {
        "data": data_br,
        "barbeiro": barbeiro,
        "fichas": fichas,
        "gorjeta": gorjeta,
        "vale": vale,
        "totalBarbeiro": total_barbeiro,
        "totalBarbearia": total_barbearia,
        "faturamento": faturamento,
        "totalBarbeiroTexto": formatar_moeda(total_barbeiro),
        "totalBarbeariaTexto": formatar_moeda(total_barbearia),
        "pago": False,
        "comprovante": None,
    }

    nova_ref = referencia("registrosBarbearia").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_ficha>", methods=["DELETE"])
@somente_master
def excluir(id_ficha):
    referencia(f"registrosBarbearia/{id_ficha}").delete()
    return jsonify({"ok": True})


def _lancar_insumo_pagamento(registro: dict, comprovante):
    referencia("registrosInsumos").push(
        {
            "data": registro.get("data"),
            "conta": f"Pagamento do barbeiro {registro.get('barbeiro')}",
            "quantidade": 1,
            "valor_unitario": registro.get("totalBarbeiro"),
            "total": registro.get("totalBarbeiro"),
            "valor_unitario_texto": registro.get("totalBarbeiroTexto"),
            "total_texto": registro.get("totalBarbeiroTexto"),
            "comprovante": comprovante,
        }
    )


@bp.route("/<id_ficha>/pagar", methods=["PUT"])
@somente_master
def pagar(id_ficha):
    corpo = request.get_json(silent=True) or {}
    comprovante = corpo.get("comprovante")

    if comprovante and len(comprovante) > MAX_TAMANHO_COMPROVANTE:
        return jsonify({"erro": "Comprovante muito grande (máximo aproximado de 2MB)."}), 400

    registro = referencia(f"registrosBarbearia/{id_ficha}").get()
    if not registro:
        return jsonify({"erro": "Lançamento não encontrado."}), 404

    referencia(f"registrosBarbearia/{id_ficha}").update({"pago": True, "comprovante": comprovante})
    _lancar_insumo_pagamento(registro, comprovante)
    return jsonify({"ok": True})


@bp.route("/<id_ficha>/desfazer-pagamento", methods=["PUT"])
@somente_master
def desfazer_pagamento(id_ficha):
    referencia(f"registrosBarbearia/{id_ficha}").update({"pago": False, "comprovante": None})
    return jsonify({"ok": True})


@bp.route("/pagar-lote", methods=["POST"])
@somente_master
def pagar_lote():
    corpo = request.get_json(silent=True) or {}
    ids = corpo.get("ids") or []
    comprovante = corpo.get("comprovante")

    if comprovante and len(comprovante) > MAX_TAMANHO_COMPROVANTE:
        return jsonify({"erro": "Comprovante muito grande (máximo aproximado de 2MB)."}), 400
    if not ids:
        return jsonify({"erro": "Nenhum lançamento informado."}), 400

    quantidade_paga = 0
    for id_ficha in ids:
        registro = referencia(f"registrosBarbearia/{id_ficha}").get()
        if not registro or registro.get("pago"):
            continue
        referencia(f"registrosBarbearia/{id_ficha}").update({"pago": True, "comprovante": comprovante})
        _lancar_insumo_pagamento(registro, comprovante)
        quantidade_paga += 1

    return jsonify({"ok": True, "quantidade_paga": quantidade_paga})


# ---------------------------------------------------------------
# Lista de barbeiros (nó 'barbeirosBarbearia' no Firebase).
# ---------------------------------------------------------------


@bp.route("/barbeiros", methods=["GET"])
@login_obrigatorio
def listar_barbeiros():
    dados = referencia("barbeirosBarbearia").get()
    if not dados:
        dados = ["Barbeiro 1", "Barbeiro 2", "Barbeiro 3"]
        referencia("barbeirosBarbearia").set(dados)
    elif isinstance(dados, dict):
        dados = list(dados.values())
    return jsonify(dados)


@bp.route("/barbeiros", methods=["PUT"])
@somente_master
def salvar_barbeiros():
    corpo = request.get_json(silent=True) or {}
    lista = corpo.get("barbeiros")
    if not isinstance(lista, list):
        return jsonify({"erro": "Envie a lista completa de nomes em 'barbeiros'."}), 400
    referencia("barbeirosBarbearia").set(lista)
    return jsonify({"ok": True, "barbeiros": lista})
