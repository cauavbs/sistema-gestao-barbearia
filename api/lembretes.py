"""
API de Lembretes — substitui as chamadas diretas ao Firebase que existiam
no <script type="module"> do lembrete.html original (push, onValue,
remove, update em 'registrosLembretes').
"""

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia

bp = Blueprint("api_lembretes", __name__, url_prefix="/api/lembretes")


@bp.route("", methods=["GET"])
@somente_master
def listar():
    dados = referencia("registrosLembretes").get() or {}
    lista = [{"id": id_, **valor} for id_, valor in dados.items()]
    lista.sort(key=lambda item: item.get("dataISO", ""))
    return jsonify(lista)


@bp.route("", methods=["POST"])
@somente_master
def criar():
    corpo = request.get_json(silent=True) or {}
    data_iso = corpo.get("dataISO")
    texto = (corpo.get("texto") or "").strip()

    if not data_iso or not texto:
        return jsonify({"erro": "Informe data e texto."}), 400

    data_br = "/".join(reversed(data_iso.split("-")))
    novo_registro = {"dataISO": data_iso, "dataBR": data_br, "texto": texto}

    nova_ref = referencia("registrosLembretes").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_lembrete>", methods=["PUT"])
@somente_master
def reprogramar(id_lembrete):
    corpo = request.get_json(silent=True) or {}
    nova_data_br = corpo.get("dataBR", "")
    partes = nova_data_br.split("/")

    if len(partes) != 3 or len(partes[2]) != 4:
        return jsonify({"erro": "Formato de data inválido. Use DD/MM/AAAA."}), 400

    dia, mes, ano = partes[0].zfill(2), partes[1].zfill(2), partes[2]
    nova_data_iso = f"{ano}-{mes}-{dia}"

    referencia(f"registrosLembretes/{id_lembrete}").update(
        {"dataISO": nova_data_iso, "dataBR": f"{dia}/{mes}/{ano}"}
    )
    return jsonify({"ok": True})


@bp.route("/<id_lembrete>", methods=["DELETE"])
@somente_master
def excluir(id_lembrete):
    referencia(f"registrosLembretes/{id_lembrete}").delete()
    return jsonify({"ok": True})
