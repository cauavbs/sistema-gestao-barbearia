"""
Decoradores de controle de acesso: exigem sessão ativa e, quando
necessário, perfil 'master'. Rotas de API recebem uma resposta JSON de
erro; rotas de página são redirecionadas.
"""

from functools import wraps

from flask import jsonify, redirect, request, session, url_for


def login_obrigatorio(view):
    """Exige que exista um usuário logado (qualquer perfil)."""

    @wraps(view)
    def rota_protegida(*args, **kwargs):
        if not session.get("uid"):
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Não autenticado."}), 401
            return redirect(url_for("autenticacao.pagina_login"))
        return view(*args, **kwargs)

    return rota_protegida


def somente_master(view):
    """Exige login e perfil 'master'."""

    @wraps(view)
    def rota_protegida(*args, **kwargs):
        if not session.get("uid"):
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Não autenticado."}), 401
            return redirect(url_for("autenticacao.pagina_login"))

        if session.get("perfil") != "master":
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Acesso negado. Apenas administradores."}), 403
            return redirect(url_for("paginas.index", erro="acesso_negado"))

        return view(*args, **kwargs)

    return rota_protegida
