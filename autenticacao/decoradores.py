"""
Antes, o controle de acesso ("só master pode ver essa página") era feito
no JavaScript de cada HTML, depois que o Firebase avisava quem era o
usuário logado (onAuthStateChanged). Isso é fácil de burlar, porque roda
inteiramente no navegador do usuário.

Agora esse controle passa a ser feito aqui, no servidor, antes mesmo da
página ser gerada — muito mais seguro.
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
    """Exige login E perfil 'master' (equivalente ao antigo alert +
    redirecionamento que existia em lembrete.html, relatorio.html e
    resultados.html)."""

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
