"""
Ponto único de acesso ao Firebase.

Só o servidor fala com o Firebase, usando a conta de serviço (Admin
SDK), que tem acesso total ao banco. O controle de quem pode
ler/escrever cada coisa fica centralizado em
autenticacao/decoradores.py.
"""

import json
import os

import firebase_admin
from firebase_admin import credentials, db

from config import Config

_app_firebase = None


def inicializar_firebase():
    """Inicializa o Firebase Admin SDK uma única vez (idempotente)."""
    global _app_firebase

    if _app_firebase is not None:
        return _app_firebase

    if not Config.FIREBASE_DATABASE_URL:
        raise RuntimeError(
            "FIREBASE_DATABASE_URL não configurada. Confira o arquivo .env."
        )

    if Config.FIREBASE_CREDENTIALS_JSON:
        # Credencial vinda de variável de ambiente (ex: hospedagem no Vercel)
        info_credencial = json.loads(Config.FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(info_credencial)
    else:
        # Credencial vinda de um arquivo local (uso comum em desenvolvimento)
        if not os.path.exists(Config.FIREBASE_CREDENTIALS_PATH):
            raise RuntimeError(
                f"Arquivo de credenciais do Firebase não encontrado em "
                f"'{Config.FIREBASE_CREDENTIALS_PATH}'. Veja o README.md "
                f"para saber como gerar esse arquivo no Console do Firebase."
            )
        cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS_PATH)

    _app_firebase = firebase_admin.initialize_app(
        cred, {"databaseURL": Config.FIREBASE_DATABASE_URL}
    )
    return _app_firebase


def referencia(caminho: str):
    """Retorna uma referência do Realtime Database para o caminho dado."""
    inicializar_firebase()
    return db.reference(caminho)
