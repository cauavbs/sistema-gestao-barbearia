import os
from dotenv import load_dotenv

# Carrega o arquivo .env (se existir) para as variáveis de ambiente
load_dotenv()


class Config:
    """Configurações centrais da aplicação, lidas do arquivo .env."""

    # Chave usada pelo Flask para assinar o cookie de sessão (login).
    # Troque por um valor aleatório antes de usar em produção.
    SECRET_KEY = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao")

    # Chave pública do projeto Firebase, usada para autenticar
    # (e-mail/senha) contra o Firebase via REST API.
    FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY", "")

    # URL do Realtime Database.
    FIREBASE_DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")

    # Caminho para o arquivo JSON da conta de serviço (Admin SDK).
    # Gerado em: Console do Firebase > Configurações do projeto > Contas de serviço.
    FIREBASE_CREDENTIALS_PATH = os.environ.get(
        "FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json"
    )

    # Alternativa ao FIREBASE_CREDENTIALS_PATH: colar o conteúdo do JSON
    # diretamente numa variável de ambiente. Útil para hospedagens como o
    # Vercel, onde não dá pra depender de um arquivo salvo no disco.
    FIREBASE_CREDENTIALS_JSON = os.environ.get("FIREBASE_CREDENTIALS_JSON", "")

    # Cookies de sessão só acessíveis via HTTP (não via JS) e só enviados
    # em navegação do mesmo site — reduz risco de roubo de sessão.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Cookie de sessão só trafega em conexões HTTPS (a Vercel sempre serve
    # em HTTPS, então isso fica ligado por padrão). Ao rodar localmente em
    # http://localhost, defina SESSION_COOKIE_SECURE=false no .env se o
    # login não funcionar por causa disso.
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "true").lower() != "false"
