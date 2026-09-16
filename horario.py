from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

import models

DURACION_CITA_MINUTOS = 45


def es_domingo(fecha: date) -> bool:
    return fecha.weekday() == 6


def rango_apertura(fecha: date) -> tuple[time, time]:
    """Horario de apertura/cierre según el día de la semana.

    Los sábados (weekday 5) se cierra a las 14:00; el resto de días
    de apertura, a las 17:00. Los domingos no tienen rango válido
    (comprobar antes con es_domingo).
    """
    apertura = time(10, 0)
    cierre = time(14, 0) if fecha.weekday() == 5 else time(17, 0)
    return apertura, cierre


def generar_slots(fecha: date) -> list[time]:
    """Genera las horas de inicio posibles, cada 45 minutos, dentro
    del horario de apertura de ese día."""
    apertura, cierre = rango_apertura(fecha)

    inicio = datetime.combine(fecha, apertura)
    fin = datetime.combine(fecha, cierre)

    slots = []

    while inicio + timedelta(minutes=DURACION_CITA_MINUTOS) <= fin:
        slots.append(inicio.time())
        inicio += timedelta(minutes=DURACION_CITA_MINUTOS)

    return slots


def obtener_bloqueo(db: Session, fecha: date) -> models.BloqueoHorario | None:
    return (
        db.query(models.BloqueoHorario)
        .filter(models.BloqueoHorario.fecha == fecha)
        .first()
    )