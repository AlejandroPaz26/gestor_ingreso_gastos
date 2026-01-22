import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mysql.connector

# Cargar variables de entorno
load_dotenv()

app = FastAPI()

# --- CONFIGURACIÓN CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONEXIÓN A BASE DE DATOS ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        ssl_disabled=False
    )

# --- MODELOS DE DATOS ---
class Gasto(BaseModel):
    monto: float
    descripcion: str
    fecha: str
    categoria_id: int

class Ingreso(BaseModel):
    monto: float
    descripcion: str
    fecha: str

class Categoria(BaseModel):
    nombre: str
    icono: str = "fa-tag"

class ActualizarGasto(BaseModel):
    categoria_id: int

# --- RUTAS DE LA API ---

# 1. GASTOS
@app.post("/gastos")
def crear_gasto(gasto: Gasto):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "INSERT INTO gastos (monto, descripcion, fecha, categoria_id) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (gasto.monto, gasto.descripcion, gasto.fecha, gasto.categoria_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Gasto guardado correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gastos")
def obtener_gastos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gastos ORDER BY fecha DESC")
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    return resultados

@app.put("/gastos/{id}")
def actualizar_gasto(id: int, gasto: ActualizarGasto):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "UPDATE gastos SET categoria_id = %s WHERE id = %s"
        cursor.execute(query, (gasto.categoria_id, id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Gasto actualizado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. INGRESOS
@app.post("/ingresos")
def crear_ingreso(ingreso: Ingreso):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "INSERT INTO ingresos (monto, descripcion, fecha) VALUES (%s, %s, %s)"
        cursor.execute(query, (ingreso.monto, ingreso.descripcion, ingreso.fecha))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Ingreso guardado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ingresos")
def obtener_ingresos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM ingresos ORDER BY fecha DESC")
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    return resultados

# 3. CATEGORÍAS
@app.post("/categorias")
def crear_categoria(categoria: Categoria):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "INSERT INTO categorias (nombre, icono) VALUES (%s, %s)"
        cursor.execute(query, (categoria.nombre, categoria.icono))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Categoría creada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/categorias")
def obtener_categorias():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM categorias")
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    return resultados

@app.delete("/categorias/{id}")
def eliminar_categoria(id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM categorias WHERE id = %s", (id,))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Categoría eliminada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))