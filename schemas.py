from pydantic import BaseModel
from datetime import date, datetime


class ReservaCreate(BaseModel):
    nombre: str
    telefono: str
    fecha_hora: datetime

class ReservaResponse(ReservaCreate):
    id: int

    class Config:
        from_attributes = True

class BloqueoCreate(BaseModel):
    fecha: date
    motivo: str = "Cerrado"

class BloqueoResponse(BloqueoCreate):
    id: int

    class Config:
        from_attributes = True

class EstadisticaResponse(BaseModel):
    anio: int
    mes: int
    total_citas: int

    class Config:
        from_attributes = True

class ResumenEstadisticas(BaseModel):

    mes_actual: EstadisticaResponse
    historico: list[EstadisticaResponse]