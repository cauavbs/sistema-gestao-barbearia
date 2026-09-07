from datetime import timedelta

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from config import Config


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.permanent_session_lifetime = timedelta(days=7)

    @app.route("/sw.js")
    def service_worker():
        # Precisa ficar servido na raiz (e não em /static/sw.js) para o
        # Service Worker ter escopo sobre o site inteiro, e não só sobre
        # a pasta /static/.
        resposta = send_from_directory(app.static_folder, "sw.js")
        resposta.headers["Content-Type"] = "application/javascript"
        resposta.headers["Cache-Control"] = "no-cache"
        return resposta

    @app.errorhandler(Exception)
    def erro_inesperado(erro):
        # Cobre qualquer falha não tratada nas rotas de API — inclusive
        # o Firebase estar fora do ar, lento, ou com timeout — sem precisar
        # de um try/except repetido em cada rota. Erros HTTP "normais"
        # (404, 403, os que os decoradores já retornam de propósito etc.)
        # continuam passando direto, sem cair aqui.
        if isinstance(erro, HTTPException):
            return erro

        app.logger.exception("Erro inesperado em %s", request.path)

        if request.path.startswith("/api/"):
            return jsonify({
                "erro": "Não foi possível falar com o banco de dados agora. Tente novamente em instantes."
            }), 503

        # Para páginas normais (não-API), deixa o Flask tratar do jeito
        # padrão (página de erro / traceback em modo debug).
        raise erro

    from api.caixa import bp as bp_api_caixa
    from api.fichas import bp as bp_api_fichas
    from api.freezer import bp as bp_api_freezer
    from api.grafico import bp as bp_api_grafico
    from api.insumos import bp as bp_api_insumos
    from api.lembretes import bp as bp_api_lembretes
    from api.perfis import bp as bp_api_perfis
    from api.relatorios import bp as bp_api_relatorios
    from api.resultados import bp as bp_api_resultados
    from autenticacao.rotas import bp as bp_autenticacao
    from paginas.rotas import bp as bp_paginas

    app.register_blueprint(bp_autenticacao)
    app.register_blueprint(bp_paginas)
    app.register_blueprint(bp_api_lembretes)
    app.register_blueprint(bp_api_relatorios)
    app.register_blueprint(bp_api_resultados)
    app.register_blueprint(bp_api_fichas)
    app.register_blueprint(bp_api_caixa)
    app.register_blueprint(bp_api_freezer)
    app.register_blueprint(bp_api_insumos)
    app.register_blueprint(bp_api_perfis)
    app.register_blueprint(bp_api_grafico)

    return app


app = create_app()

if __name__ == "__main__":
    # host="0.0.0.0" permite acesso pela rede local (usando o IP da
    # máquina), além de http://localhost:5000.
    app.run(debug=True, host="0.0.0.0", port=5000)
