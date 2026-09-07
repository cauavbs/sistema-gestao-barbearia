"""
Rotas que renderizam as páginas do painel administrativo.

Fichas e Faturamento aceita qualquer usuário logado (master ou
barbeiro) — o perfil é o que diferencia o que cada um vê, não a rota.
Todas as outras páginas administrativas são restritas a perfil
'master'.
"""

from flask import Blueprint, render_template

from autenticacao.decoradores import login_obrigatorio, somente_master

bp = Blueprint("paginas", __name__)


@bp.route("/")
@bp.route("/index")
@login_obrigatorio
def index():
    return render_template("index.html", active_page="index")


@bp.route("/classificacao")
@somente_master
def classificacao():
    return render_template("classificacao.html", active_page="classificacao")


@bp.route("/freezer")
@somente_master
def freezer():
    return render_template("freezer.html", active_page="freezer")


@bp.route("/insumos")
@somente_master
def insumos():
    return render_template("insumos.html", active_page="insumos")


@bp.route("/resultados")
@somente_master
def resultados():
    return render_template("resultados.html", active_page="resultados")


@bp.route("/grafico")
@somente_master
def grafico():
    return render_template("grafico.html", active_page="grafico")


@bp.route("/relatorio")
@somente_master
def relatorio():
    return render_template("relatorio.html", active_page="relatorio")


@bp.route("/lembrete")
@somente_master
def lembrete():
    return render_template("lembrete.html", active_page="lembrete")


@bp.route("/perfis")
@somente_master
def perfis():
    return render_template("perfis.html", active_page="perfis")
