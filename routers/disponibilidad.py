from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import database
import models
from horario import es_domingo, generar_slots, obtener_bloqueo

router = APIRouter(prefix="/disponibilidad", tags=["disponibilidad"])

@router.get("/{fecha}")
async def obtener_huecos(fecha: str, db: Session = Depends(database.get_db)):
    fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()

    # Si es domingo, cerrado
    if es_domingo(fecha_obj):
        return {
            "fecha": fecha,
            "huecos_libres": [],
            "motivo_cierre": "Cerrado los domingos",
        }

    bloqueo_dia = obtener_bloqueo(db, fecha_obj)

    if bloqueo_dia:
        return {
            "fecha": fecha,
            "huecos_libres": [],
            "motivo_cierre": bloqueo_dia.motivo,
        }

    # Traer reservas existentes de ese día
    reservas = db.query(models.Reserva).all()

    horas_ocupadas = [
        r.fecha_hora.time()
        for r in reservas
        if r.fecha_hora.date() == fecha_obj
    ]

    huecos = [
        slot.strftime("%H:%M")
        for slot in generar_slots(fecha_obj)
        if slot not in horas_ocupadas
    ]

    return {
        "fecha": fecha,
        "huecos_libres": huecos,
        "motivo_cierre": None,
    }