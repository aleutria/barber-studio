import os
import secrets

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

load_dotenv()

ADMIN_USER = os.getenv("ADMIN_USER")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not ADMIN_USER or not ADMIN_PASSWORD:
    raise RuntimeError(
        "Faltan ADMIN_USER o ADMIN_PASSWORD en el archivo .env"
    )

security = HTTPBasic()


def verificar_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    is_user_ok = secrets.compare_digest(credentials.username, ADMIN_USER)
    is_pass_ok = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)

    if not (is_user_ok and is_pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username