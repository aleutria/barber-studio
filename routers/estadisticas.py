from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import database
import models
import schemas
from auth import verificar_admin

router = APIRouter(prefix="/estadisticas", tags=["estadisticas"])


def _rango_mes_actual() -> tuple[date, date]:
    hoy = date.today()
    inicio = hoy.replace(day=1)

    if inicio.month == 12:
        fin = inicio.replace(year=inicio.year + 1, month=1)
    else:
        fin = inicio.replace(month=inicio.month + 1)

    return inicio, fin


@router.get("/", response_model=schemas.ResumenEstadisticas)
async def listar_estadisticas(
    db: Session = Depends(database.get_db),
    username: str = Depends(verificar_admin),
):
    inicio_mes, fin_mes = _rango_mes_actual()

    total_mes_actual = (
        db.query(models.Reserva)
        .filter(
            models.Reserva.fecha_hora >= inicio_mes,
            models.Reserva.fecha_hora < fin_mes,
        )
        .count()
    )

    mes_actual = schemas.EstadisticaResponse(
        anio=inicio_mes.year,
        mes=inicio_mes.month,
        total_citas=total_mes_actual,
    )

    historico = (
        db.query(models.EstadisticaMensual)
        .order_by(
            models.EstadisticaMensual.anio.desc(),
            models.EstadisticaMensual.mes.desc(),
        )
        .all()
    )

    return schemas.ResumenEstadisticas(
        mes_actual=mes_actual, historico=historico
    )