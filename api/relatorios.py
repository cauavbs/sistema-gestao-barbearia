"""API de Relatórios e Ocorrências, com os dados salvos em 'registrosRelatorios'."""

import time

from flask import Blueprint, jsonify, request, session

from autenticacao.decoradores import login_obrigatorio
from servicos.firebase_service import referencia

bp = Blueprint("api_relatorios", __name__, url_prefix="/api/relatorios")


@bp.route("", methods=["GET"])
@login_obrigatorio
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
@login_obrigatorio
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
        # O autor vem da sessão, nunca do que o cliente manda no corpo da
        # requisição — assim ninguém consegue lançar um relato em nome
        # de outra pessoa.
        "autor": session.get("nome", "Desconhecido"),
        "timestamp": int(time.time() * 1000),
    }

    nova_ref = referencia("registrosRelatorios").push(novo_registro)
    return jsonify({"id": nova_ref.key, **novo_registro}), 201


@bp.route("/<id_relatorio>", methods=["DELETE"])
@login_obrigatorio
def excluir(id_relatorio):
    registro = referencia(f"registrosRelatorios/{id_relatorio}").get()
    if not registro:
        return jsonify({"erro": "Relatório não encontrado."}), 404

    eh_master = session.get("perfil") == "master"
    eh_autor = registro.get("autor") == session.get("nome")
    if not eh_master and not eh_autor:
        return jsonify({"erro": "Você só pode excluir relatos que você mesmo lançou."}), 403

    referencia(f"registrosRelatorios/{id_relatorio}").delete()
    return jsonify({"ok": True})
