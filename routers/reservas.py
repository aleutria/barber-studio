from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
from auth import verificar_admin
from estadisticas import archivar_meses_pasados
from horario import es_domingo, generar_slots, obtener_bloqueo
from telegram import enviar_notificacion_telegram

router = APIRouter(prefix="/reservas", tags=["reservas"])


@router.post("/", response_model=schemas.ReservaResponse)
async def crear_reserva(
    reserva: schemas.ReservaCreate, db: Session = Depends(database.get_db)
):
    # Archiva los meses ya cerrados antes de nada, así el archivado
    # ocurre solo con el tráfico normal de reservas, sin cron.
    archivar_meses_pasados(db)

    fecha_reserva = reserva.fecha_hora.date()
    hora_reserva = reserva.fecha_hora.time()

    # 1. Validar si es domingo
    if es_domingo(fecha_reserva):
        raise HTTPException(
            status_code=400,
            detail="❌ Los domingos estamos cerrados",
        )

    # 2. Validar si el día está bloqueado
    bloqueo_dia = obtener_bloqueo(db, fecha_reserva)

    if bloqueo_dia:
        raise HTTPException(
            status_code=400,
            detail=f"❌ Este día está cerrado: {bloqueo_dia.motivo}",
        )

    # 3. Validación de horario y slots de 45 minutos
    if hora_reserva not in generar_slots(fecha_reserva):
        raise HTTPException(
            status_code=400,
            detail="❌ LO SENTIMOS, ESE HORARIO NO ESTÁ DISPONIBLE.",
        )

    # 4. Validación de duplicados
    cita_existente = (
        db.query(models.Reserva)
        .filter(models.Reserva.fecha_hora == reserva.fecha_hora)
        .first()
    )

    if cita_existente:
        raise HTTPException(
            status_code=400,
            detail="❌ Este horario ya está reservado.",
        )

    db_reserva = models.Reserva(**reserva.model_dump())

    db.add(db_reserva)
    db.commit()
    db.refresh(db_reserva)

    mensaje = (
        "🔔 NUEVA RESERVA\n\n"
        f"👤 Cliente: {db_reserva.nombre}\n"
        f"📞 Teléfono: {db_reserva.telefono}\n"
        f"📅 Fecha: {fecha_reserva.strftime('%d/%m/%Y')}\n"
        f"🕐 Hora: {hora_reserva.strftime('%H:%M')}"
    )

    await enviar_notificacion_telegram(mensaje)

    return db_reserva


# GET: Listar todas las reservas
@router.get("/", response_model=list[schemas.ReservaResponse])
async def listar_reservas(
    db: Session = Depends(database.get_db),
    username: str = Depends(verificar_admin),
):

    archivar_meses_pasados(db)

    return db.query(models.Reserva).all()


@router.delete("/{reserva_id}")
async def eliminar_reserva(
    reserva_id: int,
    db: Session = Depends(database.get_db),
    username: str = Depends(verificar_admin),
):
    cita = (
        db.query(models.Reserva)
        .filter(models.Reserva.id == reserva_id)
        .first()
    )

    if not cita:
        raise HTTPException(status_code=404, detail="❌ Cita no encontrada")

    db.delete(cita)
    db.commit()
    return {"mensaje": " ✅ Cita eliminada correctamente"}