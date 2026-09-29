"""Comprobación técnica local basada en la función aportada por el usuario.

No localiza puntos, evalúa enfoque ni detecta o cuantifica micotoxinas.
Puede ejecutarse con CPython o con Pyodide, sin modificar esta lógica.
"""
import json
import os
import warnings

import cv2
from PIL import Image, UnidentifiedImageError

# Límites de recursos de la copia de trabajo, NO criterios del ensayo LFA.
MAX_BYTES = 20 * 1024 * 1024
MAX_PIXELS = 2048 * 2048
MAX_SIDE = 2048


def _resultado(estado, mensaje, ancho=0, alto=0, formato=None):
    return {"estado": estado, "mensaje": mensaje, "ancho": ancho, "alto": alto,
            "formato": formato, "alcance": "archivo", "matriz": "pendiente-de-calibracion"}


def revisar_imagen(ruta_imagen, min_ancho=100, min_alto=100,
                   formatos_validos=("JPEG", "PNG")):
    """Devuelve un informe serializable: válida, inválida o error técnico.

    El mínimo configurable es un filtro técnico del prototipo; no demuestra
    resolución suficiente para leer la matriz. La app usa 200 x 200, como el
    ejemplo suministrado. Recibe una copia acotada, nunca el original grande.
    """
    if not isinstance(min_ancho, int) or not isinstance(min_alto, int) or min_ancho < 1 or min_alto < 1:
        return _resultado("error", "La configuración de dimensiones no es válida.")
    try:
        if not os.path.isfile(ruta_imagen):
            return _resultado("invalid", "El archivo no existe.")
        tamano = os.path.getsize(ruta_imagen)
        if not 0 < tamano <= MAX_BYTES:
            return _resultado("invalid", "El archivo está vacío o supera el límite de 20 MiB.")
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(ruta_imagen) as img:
                formato, (ancho, alto) = img.format, img.size
                if formato not in formatos_validos:
                    return _resultado("invalid", f"Formato no válido: {formato}.")
                if ancho > MAX_SIDE or alto > MAX_SIDE or ancho * alto > MAX_PIXELS:
                    return _resultado("invalid", "La copia de trabajo supera el límite de memoria.")
                if ancho < min_ancho or alto < min_alto:
                    return _resultado("invalid", f"La imagen es demasiado pequeña: {ancho} × {alto} px. Mínimo técnico: {min_ancho} × {min_alto} px.", ancho, alto, formato)
                if getattr(img, "is_animated", False):
                    return _resultado("invalid", "Selecciona una fotografía estática.")
                # Image.open por sí solo es perezoso: verify y load comprueban el archivo y sus píxeles.
                img.verify()
            with Image.open(ruta_imagen) as img:
                img.load()
        # Pillow ya se ha cerrado antes de decodificar con OpenCV.
        cv_img = cv2.imread(ruta_imagen, cv2.IMREAD_UNCHANGED)
        if cv_img is None:
            return _resultado("invalid", "OpenCV no puede leer la imagen.")
        try:
            if cv_img.shape[1] != ancho or cv_img.shape[0] != alto:
                return _resultado("invalid", "Los lectores no coinciden en las dimensiones de la imagen.")
        finally:
            del cv_img
        return _resultado("valid", "Archivo válido para revisión técnica.", ancho, alto, formato)
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return _resultado("invalid", "La imagen está dañada, no se puede identificar o excede los límites de recursos.")
    except PermissionError:
        return _resultado("error", "No se puede acceder a la imagen. Vuelve a seleccionarla.")
    except OSError:
        return _resultado("invalid", "No se puede decodificar la imagen; puede estar dañada o incompleta.")
    except (MemoryError, cv2.error):
        return _resultado("error", "No se ha podido completar la lectura. Inténtalo de nuevo con una copia más pequeña.")
    except Exception:
        # No devolver rutas privadas ni trazas del dispositivo a la interfaz.
        return _resultado("error", "No se ha podido comprobar la imagen. Inténtalo de nuevo.")


def imagen_valida(ruta_imagen, min_ancho=100, min_alto=100,
                  formatos_validos=("JPEG", "PNG")):
    """Interfaz (bool, mensaje) del ejemplo original, reutilizable en el ordenador."""
    informe = revisar_imagen(ruta_imagen, min_ancho, min_alto, formatos_validos)
    return informe["estado"] == "valid", informe["mensaje"]


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("imagen")
    parser.add_argument("--min-ancho", type=int, default=200)
    parser.add_argument("--min-alto", type=int, default=200)
    args = parser.parse_args()
    print(json.dumps(revisar_imagen(args.imagen, args.min_ancho, args.min_alto), ensure_ascii=False))
