"""Pruebas del router de compatibilidad v1 (`app/routers/legacy.py`).

Verifican dos cosas a la vez:
  1. que el frontend actual reciba exactamente la forma que espera, y
  2. que las rutas compartidas con la v2 (`POST /clientes`, `POST /citas`)
     sigan comportandose igual cuando la peticion viene con token.
"""

import datetime
import uuid

import pytest

PASSWORD = "Prueba2025*"

pytestmark = pytest.mark.integracion

# Las rutas de compatibilidad v1 quedan APAGADAS por defecto (B4 / RNF-001).
# Si ENABLE_LEGACY_ROUTES no esta activo, se omiten los tests que solo prueban
# esos endpoints legacy; los que comparten contrato con la v2 (POST /clientes,
# POST /citas) continuan.
from app.core.config import settings as _settings

REQUIERE_LEGACY = pytest.mark.skipif(
    not _settings.ENABLE_LEGACY_ROUTES,
    reason="Rutas legacy desactivadas (ENABLE_LEGACY_ROUTES=false)",
)


def _correo() -> str:
    return f"qa-legacy-{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture(scope="module")
def cliente_temporal(cliente_api):
    """Registra un cliente desechable y devuelve (token, datos)."""
    correo = _correo()
    r = cliente_api.post(
        "/api/auth/registro",
        json={"nombre": "Cliente QA Legacy", "correo": correo,
              "telefono": "3000000000", "contrasena": PASSWORD},
    )
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    token = cuerpo["access_token"]
    return token, cuerpo["usuario"]


@pytest.fixture
def slot_libre(cliente_api, cliente_temporal):
    """Un hueco real y libre en la agenda del barbero 1.

    Es de alcance por prueba (no por modulo) porque varias pruebas de este
    archivo agendan citas: si compartieran el mismo slot, la segunda chocaria
    con la primera.
    """
    token, _ = cliente_temporal
    cabecera = {"Authorization": f"Bearer {token}"}
    for dias in range(70, 130):
        fecha = (datetime.date.today() + datetime.timedelta(days=dias)).isoformat()
        r = cliente_api.get(
            f"/api/citas/disponibilidad?id_barbero=1&fecha={fecha}&id_servicio=1",
            headers=cabecera,
        )
        if r.status_code != 200:
            continue
        libres = [s for s in r.json()["slots"] if s["disponible"]]
        if libres:
            return fecha, libres[0]["hora_inicio"]
    pytest.skip("No se encontro ningun slot libre en la agenda del barbero 1")


# ----------------------------------------------------------------------
# GET /api/datos
# ----------------------------------------------------------------------

@REQUIERE_LEGACY
class TestDatos:
    def test_responde_sin_autenticacion(self, cliente_api):
        assert cliente_api.get("/api/datos").status_code == 200

    def test_trae_las_colecciones_que_lee_el_frontend(self, cliente_api):
        datos = cliente_api.get("/api/datos").json()
        for clave in ("usuarios", "servicios", "clientes", "citas", "ranking_barberos"):
            assert clave in datos, clave
            assert isinstance(datos[clave], list), clave
        assert datos["usuarios"] and datos["servicios"]

    def test_servicios_traen_los_campos_del_catalogo(self, cliente_api):
        servicio = cliente_api.get("/api/datos").json()["servicios"][0]
        for campo in ("id_servicio", "nombre", "precio", "duracion_minutos", "categoria"):
            assert campo in servicio, campo

    def test_barberos_traen_perfil_completo(self, cliente_api):
        usuarios = cliente_api.get("/api/datos").json()["usuarios"]
        barberos = [u for u in usuarios if u["id_rol"] == 2]
        assert barberos, "deberia haber al menos un barbero activo"
        for campo in ("id_usuario", "nombre", "rating", "total_resenas",
                      "experiencia_anos", "bio", "especialidades"):
            assert campo in barberos[0], campo
        assert isinstance(barberos[0]["especialidades"], list)

    def test_las_citas_usan_las_claves_de_la_v1(self, cliente_api):
        citas = cliente_api.get("/api/datos").json()["citas"]
        if not citas:
            pytest.skip("no hay citas cargadas")
        for campo in ("id_cita", "id_cliente", "id_usuario", "id_servicio",
                      "fecha", "hora", "estado"):
            assert campo in citas[0], campo
        # 'hora' debe venir como HH:MM, no como timedelta serializado
        assert len(citas[0]["hora"]) == 5 and citas[0]["hora"][2] == ":"

    def test_el_primer_usuario_es_el_administrador(self, cliente_api):
        # El frontend toma usuarios[0] como sesion inicial de demostracion.
        usuarios = cliente_api.get("/api/datos").json()["usuarios"]
        assert usuarios[0]["id_rol"] == 1


# ----------------------------------------------------------------------
# POST /api/login
# ----------------------------------------------------------------------

@REQUIERE_LEGACY
class TestLoginV1:
    def test_devuelve_el_perfil_plano(self, cliente_api):
        r = cliente_api.post(
            "/api/login",
            json={"correo": "cliente1@example.com", "contrasena": "Globde2025*"},
        )
        assert r.status_code == 200, r.text
        cuerpo = r.json()
        # Plano: sin envoltorio "usuario", como leia el frontend v1.
        assert "usuario" not in cuerpo
        for campo in ("id_usuario", "nombre", "correo", "id_rol", "puntos"):
            assert campo in cuerpo, campo
        assert cuerpo["id_rol"] == 3

    def test_incluye_token_para_la_migracion_futura(self, cliente_api):
        cuerpo = cliente_api.post(
            "/api/login",
            json={"correo": "cliente1@example.com", "contrasena": "Globde2025*"},
        ).json()
        assert cuerpo["access_token"] and cuerpo["token_type"] == "bearer"

    def test_credenciales_incorrectas(self, cliente_api):
        r = cliente_api.post(
            "/api/login", json={"correo": _correo(), "contrasena": "LoQueSea1"}
        )
        assert r.status_code == 401


# ----------------------------------------------------------------------
# POST /api/clientes  (publico en v1, con token sigue siendo v2)
# ----------------------------------------------------------------------

class TestClientesV1:
    def test_registro_publico_sin_token(self, cliente_api):
        r = cliente_api.post(
            "/api/clientes",
            json={"nombre": "QA Legacy Registro", "correo": _correo(),
                  "telefono": "3001234567", "contrasena": PASSWORD},
        )
        assert r.status_code == 201, r.text
        cuerpo = r.json()
        for campo in ("id_usuario", "nombre", "correo", "telefono"):
            assert campo in cuerpo, campo
        assert cuerpo["id_rol"] == 3

    def test_el_registrado_puede_iniciar_sesion(self, cliente_api):
        correo = _correo()
        cliente_api.post(
            "/api/clientes",
            json={"nombre": "QA Legacy Login", "correo": correo,
                  "telefono": "3001234568", "contrasena": PASSWORD},
        )
        r = cliente_api.post("/api/login", json={"correo": correo, "contrasena": PASSWORD})
        assert r.status_code == 200
        assert r.json()["correo"] == correo

    def test_correo_duplicado_da_conflicto(self, cliente_api):
        correo = _correo()
        cuerpo = {"nombre": "QA Legacy Dup", "correo": correo,
                  "telefono": "3001234569", "contrasena": PASSWORD}
        assert cliente_api.post("/api/clientes", json=cuerpo).status_code == 201
        assert cliente_api.post("/api/clientes", json=cuerpo).status_code == 409

    def test_password_debil_rechazada(self, cliente_api):
        r = cliente_api.post(
            "/api/clientes",
            json={"nombre": "QA Legacy Debil", "correo": _correo(),
                  "telefono": "3001234570", "contrasena": "123"},
        )
        assert r.status_code == 422

    def test_con_token_admin_conserva_la_respuesta_v2(self, cliente_api, token_admin, auth):
        r = cliente_api.post(
            "/api/clientes",
            headers=auth(token_admin),
            json={"nombre": "QA Legacy Admin", "correo": _correo(),
                  "telefono": "3001234571", "contrasena": PASSWORD},
        )
        assert r.status_code == 201, r.text
        cuerpo = r.json()
        # ClienteResumenOut, no el perfil plano de la v1.
        assert "total_citas" in cuerpo and "id_cliente" in cuerpo
        assert "access_token" not in cuerpo

    def test_el_listado_v2_sigue_protegido(self, cliente_api):
        assert cliente_api.get("/api/clientes").status_code == 401


# ----------------------------------------------------------------------
# POST /api/citas  (acepta payload v1 y v2)
# ----------------------------------------------------------------------

class TestCitasV1:
    def test_crea_con_payload_v1(self, cliente_api, cliente_temporal, slot_libre):
        _, usuario = cliente_temporal
        fecha, hora = slot_libre
        r = cliente_api.post(
            "/api/citas",
            json={"id_cliente": usuario["id_cliente"], "id_usuario": 2,
                  "id_servicio": 1, "fecha": fecha, "hora": hora,
                  "observaciones": "creada desde el frontend v1"},
        )
        assert r.status_code == 201, r.text
        cita = r.json()
        # Claves de la v1 y de la v2 en la misma respuesta.
        assert cita["hora"] == cita["hora_inicio"][:5]
        assert cita["id_usuario"] == 2
        assert cita["id_barbero"] == 1
        assert cita["estado"] == "pendiente"

    def test_traduce_id_usuario_a_id_barbero(self, cliente_api, cliente_temporal, slot_libre):
        _, usuario = cliente_temporal
        fecha, hora = slot_libre
        cita = cliente_api.post(
            "/api/citas",
            json={"id_cliente": usuario["id_cliente"], "id_usuario": 2,
                  "id_servicio": 1, "fecha": fecha, "hora": hora},
        ).json()
        # id_usuario 2 es el usuario del barbero 1 en la semilla.
        assert cita["id_barbero"] == 1

    def test_barbero_inexistente(self, cliente_api, cliente_temporal, slot_libre):
        _, usuario = cliente_temporal
        fecha, hora = slot_libre
        r = cliente_api.post(
            "/api/citas",
            json={"id_cliente": usuario["id_cliente"], "id_usuario": 99999,
                  "id_servicio": 1, "fecha": fecha, "hora": hora},
        )
        assert r.status_code == 400

    def test_faltan_datos(self, cliente_api):
        r = cliente_api.post("/api/citas", json={"id_usuario": 2})
        assert r.status_code == 400

    def test_el_solapamiento_se_sigue_validando(self, cliente_api, cliente_temporal, slot_libre):
        _, usuario = cliente_temporal
        fecha, hora = slot_libre
        cuerpo = {"id_cliente": usuario["id_cliente"], "id_usuario": 2,
                  "id_servicio": 1, "fecha": fecha, "hora": hora}
        assert cliente_api.post("/api/citas", json=cuerpo).status_code == 201
        assert cliente_api.post("/api/citas", json=cuerpo).status_code == 409

    def test_con_token_el_payload_v2_sigue_funcionando(self, cliente_api, cliente_temporal,
                                                       slot_libre, auth):
        token, _ = cliente_temporal
        fecha, hora = slot_libre
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1, "fecha": fecha, "hora_inicio": hora},
        )
        assert r.status_code == 201, r.text
        assert r.json()["codigo_reserva"].startswith("GB-")

    def test_un_cliente_no_puede_agendar_para_otro(self, cliente_api, cliente_temporal,
                                                   slot_libre, auth):
        token, usuario = cliente_temporal
        fecha, hora = slot_libre
        otro = 1 if usuario["id_cliente"] != 1 else 2
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_cliente": otro, "id_barbero": 1, "id_servicio": 1,
                  "fecha": fecha, "hora_inicio": hora},
        )
        assert r.status_code == 403


# ----------------------------------------------------------------------
# El contrato v2 no se ve afectado
# ----------------------------------------------------------------------

class TestV2Intacta:
    def test_auth_login_sigue_devolviendo_la_sesion_completa(self, cliente_api):
        cuerpo = cliente_api.post(
            "/api/auth/login",
            json={"correo": "cliente1@example.com", "contrasena": "Globde2025*"},
        ).json()
        assert "usuario" in cuerpo and cuerpo["token_type"] == "bearer"

    def test_las_rutas_protegidas_siguen_pidiendo_token(self, cliente_api):
        for ruta in ("/api/citas", "/api/usuarios", "/api/facturas"):
            assert cliente_api.get(ruta).status_code == 401, ruta
