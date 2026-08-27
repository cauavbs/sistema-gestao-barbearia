from datetime import timedelta

from flask import Flask, send_from_directory

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
    # host="0.0.0.0" já deixa pronto para acessar pelo celular via rede
    # local (usando o IP do seu PC), mesmo rodando só localmente por
    # enquanto (http://localhost:5000 continua funcionando normalmente).
    app.run(debug=True, host="0.0.0.0", port=5000)
