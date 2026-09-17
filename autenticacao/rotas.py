"""
Rotas de autenticação.

O Firebase Admin SDK não valida e-mail/senha diretamente — isso só é
possível pelo SDK de cliente ou pela API REST "Identity Toolkit" do
Google. O backend faz uma chamada HTTP para essa API REST para
conferir a senha e, a partir daí, controla a sessão do usuário via
cookie assinado do Flask.

Regra especial: se o login falhar e o e-mail for
"cauadev@barbearia.com", essa conta mestre é criada automaticamente
na primeira tentativa.
"""

import time
from collections import defaultdict

import requests
from firebase_admin import auth as admin_auth
from firebase_admin.auth import EmailAlreadyExistsError
from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for

from autenticacao.decoradores import login_obrigatorio
from config import Config
from servicos.firebase_service import inicializar_firebase, referencia

bp = Blueprint("autenticacao", __name__)

EMAIL_MESTRE_PADRAO = "cauadev@barbearia.com"
URL_LOGIN_FIREBASE = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"

# Limite simples de tentativas de login por IP, guardado em memória.
# Não sobrevive a um restart do servidor e não é compartilhado entre
# processos (se um dia rodar com vários workers/gunicorn -w, cada um
# teria seu próprio contador) — suficiente para barrar tentativas
# repetidas num processo único, mas não substitui algo como
# Flask-Limiter com Redis se este projeto crescer bastante.
MAX_TENTATIVAS = 5
JANELA_BLOQUEIO_SEGUNDOS = 300  # 5 minutos
_tentativas_por_ip = defaultdict(list)


def _ip_bloqueado(ip: str) -> bool:
    agora = time.time()
    tentativas = _tentativas_por_ip[ip]
    tentativas[:] = [t for t in tentativas if agora - t < JANELA_BLOQUEIO_SEGUNDOS]
    return len(tentativas) >= MAX_TENTATIVAS


def _registrar_tentativa_falha(ip: str) -> None:
    _tentativas_por_ip[ip].append(time.time())


def _limpar_tentativas(ip: str) -> None:
    _tentativas_por_ip.pop(ip, None)


def _autenticar_no_firebase(email: str, senha: str) -> requests.Response:
    return requests.post(
        URL_LOGIN_FIREBASE,
        params={"key": Config.FIREBASE_API_KEY},
        json={"email": email, "password": senha, "returnSecureToken": True},
        timeout=10,
    )


def _iniciar_sessao(uid: str, email: str, perfil: str, nome: str) -> None:
    session.clear()
    session["uid"] = uid
    session["email"] = email
    session["perfil"] = perfil
    session["nome"] = nome
    session.permanent = True


@bp.route("/login", methods=["GET"])
def pagina_login():
    if session.get("uid"):
        return redirect(url_for("paginas.index"))
    return render_template("login.html")


@bp.route("/login", methods=["POST"])
def fazer_login():
    ip = request.remote_addr or "desconhecido"
    if _ip_bloqueado(ip):
        return jsonify(
            {"erro": "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."}
        ), 429

    try:
        inicializar_firebase()
    except RuntimeError as erro:
        # Falha de configuração local (ex: .env incompleto, arquivo de
        # credencial não encontrado) — devolvemos a mensagem exata pro
        # front-end mostrar, em vez de estourar um erro 500 genérico.
        return jsonify({"erro": f"Erro de configuração no servidor: {erro}"}), 500

    corpo = request.get_json(silent=True) or {}
    email = (corpo.get("email") or "").strip()
    senha = corpo.get("senha") or ""

    if not email or not senha:
        return jsonify({"erro": "Informe e-mail e senha."}), 400

    try:
        resposta = _autenticar_no_firebase(email, senha)
    except requests.exceptions.RequestException as erro:
        # O servidor Python não conseguiu falar com o Firebase pela
        # internet (sem conexão, firewall bloqueando, DNS, etc.) — isso
        # é diferente de "o navegador não conseguiu falar com o Flask".
        return jsonify(
            {"erro": f"Não foi possível conectar ao Firebase pela internet: {erro}"}
        ), 502

    if resposta.status_code == 200:
        dados = resposta.json()
        uid = dados["localId"]

        perfil_salvo = referencia(f"usuarios/{uid}").get() or {}
        perfil = perfil_salvo.get("perfil", "comum")
        nome = perfil_salvo.get("nome", email)

        _iniciar_sessao(uid, email, perfil, nome)
        _limpar_tentativas(ip)
        return jsonify({"ok": True})

    codigo_erro = resposta.json().get("error", {}).get("message", "")
    codigos_credencial_invalida = {
        "INVALID_LOGIN_CREDENTIALS",
        "EMAIL_NOT_FOUND",
        "INVALID_PASSWORD",
    }

    if codigo_erro in codigos_credencial_invalida and email == EMAIL_MESTRE_PADRAO:
        # Cria a conta mestre automaticamente na primeira vez que ela tentar logar.
        try:
            novo_usuario = admin_auth.create_user(email=email, password=senha)
            referencia(f"usuarios/{novo_usuario.uid}").set(
                {"email": email, "perfil": "master", "nome": "Cauã Dev"}
            )
            _iniciar_sessao(novo_usuario.uid, email, "master", "Cauã Dev")
            _limpar_tentativas(ip)
            return jsonify({"ok": True, "criado": True})
        except EmailAlreadyExistsError:
            # A conta mestre já existe — o problema real é a senha
            # informada estar errada, não falta de conta. Cai pro erro
            # padrão de credenciais inválidas abaixo, em vez de mostrar
            # uma mensagem de "erro ao criar conta" confusa.
            pass
        except Exception as erro:  # noqa: BLE001 - queremos repassar a mensagem ao front
            return jsonify({"erro": f"Erro ao criar conta mestre: {erro}"}), 400

    _registrar_tentativa_falha(ip)
    return jsonify({"erro": "E-mail ou senha incorretos. Verifique seus dados."}), 401


@bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("autenticacao.pagina_login"))


@bp.route("/api/me")
@login_obrigatorio
def eu():
    return jsonify(
        {
            "uid": session.get("uid"),
            "email": session.get("email"),
            "perfil": session.get("perfil"),
            "nome": session.get("nome"),
        }
    )