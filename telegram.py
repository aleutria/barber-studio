import os

import httpx
from dotenv import load_dotenv


load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


async def enviar_notificacion_telegram(mensaje: str):
    url = (
        f"https://api.telegram.org/"
        f"bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    )

    datos = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": mensaje,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=datos)

    response.raise_for_status()