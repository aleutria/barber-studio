from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import database
import models
import schemas
from auth import verificar_admin
from horario import obtener_bloqueo

router = APIRouter(prefix="/bloqueos", tags=["bloqueos"])


# GET: Listar bloqueos
@router.get("/")
async def listar_bloqueos(
    db: Session = Depends(database.get_db),
    username: str = Depends(verificar_admin),
):
    return db.query(models.BloqueoHorario).all()

# POST: Crear un bloqueo (o actualizar el motivo si ese día ya estaba bloqueado)
@router.post("/")
async def crear_bloqueo(
    bloqueo: schemas.BloqueoCreate,
    db: Session = Depends(database.get_db),
    username: str = Depends(verificar_admin),
):
    bloqueo_existente = obtener_bloqueo(db, bloqueo.fecha)

    if bloqueo_existente:
        bloqueo_existente.motivo = bloqueo.motivo
        db.commit()
        db.refresh(bloqueo_existente)
        return bloqueo_existente

    db_bloqueo = models.BloqueoHorario(**bloqueo.model_dump())
    db.add(db_bloqueo)
    db.commit()
    db.refresh(db_bloqueo)
    return db_bloqueo


# DELETE: Eliminar un bloqueo (desbloquear)
@router.delete("/{bloqueo_id}")
async def eliminar_bloqueo(
    bloqueo_id: int,
    db: Session = Depends(database.get_db),
    username: str = Depends(verificar_admin),
):
    bloqueo = (
        db.query(models.BloqueoHorario)
        .filter(models.BloqueoHorario.id == bloqueo_id)
        .first()
    )

    if not bloqueo:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    db.delete(bloqueo)
    db.commit()
    return {"mensaje": "Bloqueo eliminado"}