from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

import models


def _primer_dia_mes(fecha: date) -> date:
    return fecha.replace(day=1)


def archivar_meses_pasados(db: Session) -> None:

    inicio_mes_actual = _primer_dia_mes(date.today())

    reservas_pasadas = (
        db.query(models.Reserva)
        .filter(models.Reserva.fecha_hora < inicio_mes_actual)
        .all()
    )

    if not reservas_pasadas:
        return

    conteo_por_mes = defaultdict(int)

    for reserva in reservas_pasadas:
        clave = (reserva.fecha_hora.year, reserva.fecha_hora.month)
        conteo_por_mes[clave] += 1

    for (anio, mes), cantidad in conteo_por_mes.items():
        estadistica = (
            db.query(models.EstadisticaMensual)
            .filter(
                models.EstadisticaMensual.anio == anio,
                models.EstadisticaMensual.mes == mes,
            )
            .first()
        )

        if estadistica:
            estadistica.total_citas += cantidad
        else:
            db.add(
                models.EstadisticaMensual(
                    anio=anio, mes=mes, total_citas=cantidad
                )
            )

    for reserva in reservas_pasadas:
        db.delete(reserva)

    db.commit()