"""
API do Gráfico Comparativo: agrega vários meses de uma vez (cortes,
freezer, entradas/saídas/lucro, desempenho por barbeiro e formas de
pagamento) para alimentar os gráficos Chart.js no front-end.
"""

from flask import Blueprint, jsonify, request

from autenticacao.decoradores import somente_master
from servicos.firebase_service import referencia

bp = Blueprint("api_grafico", __name__, url_prefix="/api/grafico")

NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def _somar_por_mes(registros, chave_mes, campo):
    total = 0
    for registro in registros:
        if (registro.get("data") or "")[3:] == chave_mes:
            total += registro.get(campo) or 0
    return total


def _criar_lista_meses(mes_final: str, quantidade: int):
    ano, mes = (int(parte) for parte in mes_final.split("-"))
    meses = []
    for i in range(quantidade - 1, -1, -1):
        total = ano * 12 + (mes - 1) - i
        ano_calc = total // 12
        mes_calc = total % 12  # 0-based (0 = janeiro)
        chave = f"{mes_calc + 1:02d}/{ano_calc}"
        rotulo = f"{NOMES_MES[mes_calc]}/{str(ano_calc)[2:]}"
        meses.append({"chave": chave, "rotulo": rotulo})
    return meses


@bp.route("", methods=["GET"])
@somente_master
def comparativo():
    mes_final = request.args.get("mes_final", "")
    quantidade_str = request.args.get("quantidade", "6")

    try:
        quantidade = int(quantidade_str)
    except ValueError:
        return jsonify({"erro": "Quantidade de meses inválida."}), 400

    if not mes_final or quantidade < 2 or quantidade > 24:
        return jsonify({"erro": "Informe mes_final (YYYY-MM) e uma quantidade entre 2 e 24."}), 400

    meses = _criar_lista_meses(mes_final, quantidade)

    cortes_arr = list((referencia("registrosBarbearia").get() or {}).values())
    freezer_arr = list((referencia("registrosFreezer").get() or {}).values())
    insumos_arr = list((referencia("registrosInsumos").get() or {}).values())
    caixa_arr = list((referencia("registrosCaixa").get() or {}).values())

    barbeiros_unicos = sorted({r.get("barbeiro") for r in cortes_arr if r.get("barbeiro")})

    resultados = []
    for mes in meses:
        chave = mes["chave"]
        cortes = _somar_por_mes(cortes_arr, chave, "faturamento")
        total_freezer = _somar_por_mes(freezer_arr, chave, "total")
        saidas = _somar_por_mes(insumos_arr, chave, "total")
        entradas = cortes + total_freezer
        lucro = entradas - saidas

        faturamento_barbeiros = {
            nome: sum(
                (r.get("faturamento") or 0)
                for r in cortes_arr
                if (r.get("data") or "")[3:] == chave and r.get("barbeiro") == nome
            )
            for nome in barbeiros_unicos
        }

        resultados.append(
            {
                **mes,
                "cortes": cortes,
                "freezer": total_freezer,
                "entradas": entradas,
                "saidas": saidas,
                "lucro": lucro,
                "faturamentoBarbeiros": faturamento_barbeiros,
                "pix": _somar_por_mes(caixa_arr, chave, "pix"),
                "debito": _somar_por_mes(caixa_arr, chave, "debito"),
                "credito": _somar_por_mes(caixa_arr, chave, "credito"),
                "dinheiro": _somar_por_mes(caixa_arr, chave, "fichasDinheiro"),
            }
        )

    return jsonify({"meses": resultados, "barbeiros": barbeiros_unicos})
