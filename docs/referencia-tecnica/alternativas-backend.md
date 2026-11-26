<!--
  ¿Qué? Compara cuatro frameworks para construir la API backend de GLOBDE.
  ¿Para qué? Explicar la selección tecnológica con criterios visibles y verificables.
  ¿Impacto? Da contexto a la arquitectura actual y evita presentar una alternativa como migración aprobada.
-->

# Evaluación de alternativas para el backend

## Alcance

Esta comparación evalúa frameworks para una API REST. Es cualitativa y se basa
en las capacidades descritas por la documentación oficial; no es un benchmark de
rendimiento ni una propuesta para reescribir el sistema.

## Stack implementado

GLOBDE utiliza **Python 3.13+, FastAPI, Uvicorn, Pydantic v2 y Alembic**. La API
persiste datos en TiDB Cloud, compatible con MySQL. La selección de FastAPI
coincide con la implementación existente; este documento no afirma que las
otras opciones hayan sido desplegadas o probadas en GLOBDE.

## Opciones comparadas

| Framework | Lenguaje y enfoque | Validación y documentación de API | Capacidades del framework | Ajuste al estado actual |
|---|---|---|---|---|
| **FastAPI** | Python; orientado a APIs y ASGI | Tipos de Python, integración con Pydantic y esquema OpenAPI generado | Enfocado en APIs; la persistencia y varias funciones se integran con bibliotecas adicionales | **Alto**: es el framework existente y encaja con los contratos y validaciones actuales |
| **Django + Django REST Framework** | Python; framework web completo y toolkit REST adicional | Serializadores y esquema de API mediante Django REST Framework | Incluye ORM, administración y autenticación; suma más componentes que una API mínima necesita | **Medio**: permite construir una API robusta, pero implicaría adaptar capas ya implementadas |
| **Flask** | Python; framework WSGI minimalista | Extensiones y decisiones explícitas para validación y documentación | Núcleo pequeño y extensible; ORM, autenticación y herramientas de API se eligen por separado | **Medio**: conserva Python, pero requiere ensamblar y mantener más piezas |
| **Express** | JavaScript o TypeScript sobre Node.js; framework web minimalista | Middleware y bibliotecas adicionales para esquemas y documentación | Enrutamiento y middleware flexibles; persistencia, validación y autenticación dependen de paquetes elegidos | **Bajo**: cambiaría el lenguaje y el entorno de ejecución del backend actual |

Las calificaciones de ajuste describen el esfuerzo relativo de encaje con el
código existente, no una valoración universal de calidad. Los cuatro enfoques
pueden conectarse a una base compatible mediante controladores adecuados; esa
posibilidad no sustituye pruebas de compatibilidad ni de migraciones.

## Criterios de decisión

1. **Compatibilidad con el código actual:** reutilizar rutas, servicios, contratos,
   autenticación y pruebas existentes.
2. **Validación y contrato HTTP:** definir entradas y salidas y mantener una
   especificación consultable de la API.
3. **Composición de persistencia:** integrar el controlador de base de datos y
   las migraciones existentes sin presumir compatibilidad no verificada.
4. **Costo de cambio:** estimar los componentes que tendrían que reescribirse y
   probarse; no se asigna una cifra porque no se realizó una migración piloto.

## Selección para GLOBDE

Se mantiene **FastAPI** porque es la opción ya implementada, integra validación
con Pydantic y genera el contrato OpenAPI usado por la API. Cambiar a otra
alternativa exigiría adaptar y volver a validar rutas, autenticación,
persistencia, pruebas, despliegue y documentación. No se afirma que FastAPI
supere a las demás en rendimiento: no se ejecutó una comparación de carga.

## Referencias oficiales

- [FastAPI: documentación](https://fastapi.tiangolo.com/)
- [Django: documentación](https://docs.djangoproject.com/en/stable/)
- [Django REST Framework: documentación](https://www.django-rest-framework.org/)
- [Flask: documentación](https://flask.palletsprojects.com/)
- [Express: documentación](https://expressjs.com/)
