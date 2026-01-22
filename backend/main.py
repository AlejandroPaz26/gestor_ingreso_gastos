import os
from dotenv import load_dotenv # Importar esto

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fastapi.middleware.cors import CORSMiddleware

import mysql.connector
load_dotenv()



app = FastAPI()

# --- CONFIGURACIÓN CORS ---
# Esto permite que tu HTML (Frontend) hable con este Python (Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite conexiones desde cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELO DE DATOS (Lo que esperamos recibir del HTML) ---
class Gasto(BaseModel):
    monto: float
    descripcion: str
    fecha: str
    categoria_id: int


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # "*" significa: "Acepta conexiones de cualquier sitio web"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONEXIÓN A BASE DE DATOS ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),      # Lee del archivo oculto
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        ssl_disabled=False
    )

# --- RUTAS DE LA API ---

# 1. Guardar un nuevo gasto (POST)
@app.post("/gastos")
def crear_gasto(gasto: Gasto):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        INSERT INTO gastos (monto, descripcion, fecha, categoria_id)
        VALUES (%s, %s, %s, %s)
        """
        valores = (gasto.monto, gasto.descripcion, gasto.fecha, gasto.categoria_id)
        
        cursor.execute(query, valores)
        conn.commit() # ¡Importante! Guarda los cambios permanentemente
        
        cursor.close()
        conn.close()
        return {"mensaje": "Gasto guardado correctamente"}
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. Leer todos los gastos (GET) - Para los gráficos
@app.get("/gastos")
def obtener_gastos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True) # dictionary=True devuelve JSON bonito
    
    cursor.execute("SELECT * FROM gastos ORDER BY fecha DESC")
    resultados = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return resultados


    # PARA LA GESTION DE INGRESOS
    # --- MODELO PARA INGRESOS ---
class Ingreso(BaseModel):
    monto: float
    descripcion: str
    fecha: str

# --- RUTAS PARA INGRESOS ---

# 1. Guardar Ingreso
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

# 2. Leer Ingresos
@app.get("/ingresos")
def obtener_ingresos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM ingresos ORDER BY fecha DESC")
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    return resultados

    # INTERCAMBIO AGREGAR O BORRAR CATEGORIAS PERSONALIZADAS
    # --- MODELO PARA CATEGORÍA ---
class Categoria(BaseModel):
    nombre: str
    icono: str = "fa-tag" # Icono por defecto si no envían uno

# --- RUTAS PARA CATEGORÍAS ---

# 1. Crear nueva categoría
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

# 2. Leer todas las categorías
@app.get("/categorias")
def obtener_categorias():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM categorias")
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    return resultados

# 3. Eliminar categoría
@app.delete("/categorias/{id}")
def eliminar_categoria(id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # OJO: Si borras una categoría, los gastos asociados podrían quedar huérfanos.
        # Por seguridad, primero pasamos esos gastos a NULL o a una categoría "Otros" (ID 0 o similar).
        # Para este ejemplo simple, dejaremos que la base de datos maneje el SET NULL que configuramos al inicio.
        cursor.execute("DELETE FROM categorias WHERE id = %s", (id,))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Categoría eliminada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


        # PARA EDITAR EL CUADRO MENSUAL DE CATEGORIAS
        

# Modelo para actualizar (solo lo que necesitemos cambiar)
class ActualizarGasto(BaseModel):
    categoria_id: int

@app.put("/gastos/{id}")
def actualizar_gasto(id: int, gasto: ActualizarGasto):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Actualizamos la categoría del gasto
        query = "UPDATE gastos SET categoria_id = %s WHERE id = %s"
        cursor.execute(query, (gasto.categoria_id, id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"mensaje": "Gasto actualizado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))