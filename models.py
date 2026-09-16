from sqlalchemy import Column, Date, DateTime, Integer, String, UniqueConstraint
from database import Base


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    fecha_hora = Column(DateTime, nullable=False)


class BloqueoHorario(Base):
    __tablename__ = "bloqueos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, unique=True, index=True, nullable=False)
    motivo = Column(String, default="Cerrado")


class EstadisticaMensual(Base):
    
    __tablename__ = "estadisticas_mensuales"

    id = Column(Integer, primary_key=True, index=True)
    anio = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)  # 1-12
    total_citas = Column(Integer, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("anio", "mes", name="uq_anio_mes"),)