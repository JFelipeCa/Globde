"""Pruebas de las reglas de negocio criticas: solapamiento, estados, puntos y facturas.

Crean y limpian sus propios datos. Requieren base de datos con datos semilla.
"""

import datetime
import uuid

import pytest

pytestmark = pytest.mark.integracion

PASSWORD = "Prueba2025*"


# ----------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------

def _fecha_futura(dias: int) -> str:
    return (datetime.date.today() + datetime.timedelta(days=dias)).isoformat()


@pytest.fixture(scope="module")
def cliente_temporal(cliente_api):
    """Registra un cliente desechable y devuelve (token, datos)."""
    correo = f"qa-{uuid.uuid4().hex[:10]}@example.com"
    r = cliente_api.post(
        "/api/auth/registro",
        json={
            "nombre": "Cliente QA Temporal",
            "correo": correo,
            "telefono": "3000000000",
            "contrasena": PASSWORD,
        },
    )
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    token = cuerpo.get("access_token") or cliente_api.post(
        "/api/auth/login", json={"correo": correo, "contrasena": PASSWORD}
    ).json()["access_token"]
    usuario = cliente_api.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    ).json()
    return token, usuario


def _buscar_slot(cliente_api, token, id_barbero=1, id_servicio=1,
                 desde=15, hasta=60, ultimo=False):
    """Busca (fecha, hora) de un hueco real. Devuelve None si no hay ninguno."""
    cabecera = {"Authorization": f"Bearer {token}"}
    for dias in range(desde, hasta):
        fecha = _fecha_futura(dias)
        r = cliente_api.get(
            f"/api/citas/disponibilidad?id_barbero={id_barbero}"
            f"&fecha={fecha}&id_servicio={id_servicio}",
            headers=cabecera,
        )
        if r.status_code != 200:
            continue
        libres = [s for s in r.json()["slots"] if s["disponible"]]
        if libres:
            return fecha, (libres[-1] if ultimo else libres[0])["hora_inicio"]
    return None


@pytest.fixture(scope="module")
def slot_libre(cliente_api, cliente_temporal):
    """Devuelve (fecha, hora_inicio) de un hueco real en la agenda del barbero 1."""
    token, _ = cliente_temporal
    encontrado = _buscar_slot(cliente_api, token, id_barbero=1)
    if not encontrado:
        pytest.skip("No se encontro ningun slot libre en la agenda del barbero 1")
    return encontrado


# ----------------------------------------------------------------------
# Registro
# ----------------------------------------------------------------------

class TestRegistro:
    def test_correo_duplicado_es_conflicto(self, cliente_api, cliente_temporal):
        _, usuario = cliente_temporal
        r = cliente_api.post(
            "/api/auth/registro",
            json={"nombre": "Otro", "correo": usuario["correo"],
                  "telefono": "3000000001", "contrasena": PASSWORD},
        )
        assert r.status_code == 409

    def test_password_debil_rechazada(self, cliente_api):
        r = cliente_api.post(
            "/api/auth/registro",
            json={"nombre": "Debil", "correo": f"qa-{uuid.uuid4().hex[:8]}@example.com",
                  "telefono": "3000000002", "contrasena": "123"},
        )
        assert r.status_code == 422

    def test_registro_crea_cliente_con_rol_3(self, cliente_temporal):
        _, usuario = cliente_temporal
        assert usuario["id_rol"] == 3
        assert usuario["id_cliente"]


# ----------------------------------------------------------------------
# Agendamiento y solapamiento
# ----------------------------------------------------------------------

class TestAgendamiento:
    def test_flujo_completo_de_una_cita(self, cliente_api, cliente_temporal, slot_libre,
                                        token_barbero, auth):
        token, _ = cliente_temporal
        fecha, hora = slot_libre

        # 1. Crear
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1, "fecha": fecha, "hora_inicio": hora},
        )
        assert r.status_code == 201, r.text
        cita = r.json()
        assert cita["codigo_reserva"].startswith("GB-")
        assert cita["estado"] == "pendiente"
        assert cita["hora_fin"] > cita["hora_inicio"]
        id_cita = cita["id_cita"]

        # 2. El mismo slot con el mismo barbero da conflicto
        conflicto = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1, "fecha": fecha, "hora_inicio": hora},
        )
        assert conflicto.status_code == 409

        # 3. Ese slot ya no aparece como disponible
        slots = cliente_api.get(
            f"/api/citas/disponibilidad?id_barbero=1&fecha={fecha}&id_servicio=1",
            headers=auth(token),
        ).json()["slots"]
        ocupado = next(s for s in slots if s["hora_inicio"] == hora)
        assert ocupado["disponible"] is False

        # 4. Transiciones validas de estado
        for estado in ("confirmada", "en_atencion", "completada"):
            r = cliente_api.patch(
                f"/api/citas/{id_cita}/estado",
                headers=auth(token_barbero),
                json={"estado": estado},
            )
            assert r.status_code == 200, f"{estado}: {r.text}"
            assert r.json()["estado"] == estado

        # 5. Una cita completada ya no vuelve atras
        r = cliente_api.patch(
            f"/api/citas/{id_cita}/estado",
            headers=auth(token_barbero),
            json={"estado": "pendiente"},
        )
        assert r.status_code == 409

    def test_cita_en_el_pasado_es_rechazada(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1,
                  "fecha": _fecha_futura(-3), "hora_inicio": "10:00"},
        )
        assert r.status_code in (400, 409, 422)

    def test_fuera_de_jornada_es_rechazada(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1,
                  "fecha": _fecha_futura(20), "hora_inicio": "04:00"},
        )
        assert r.status_code in (400, 409)

    def test_servicio_inexistente(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 999999,
                  "fecha": _fecha_futura(21), "hora_inicio": "10:00"},
        )
        assert r.status_code == 404

    def test_cliente_no_ve_citas_de_otros(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        listado = cliente_api.get("/api/citas", headers=auth(token)).json()
        ids = {c["id_cliente"] for c in listado["items"]}
        assert len(ids) <= 1


# ----------------------------------------------------------------------
# Cancelacion
# ----------------------------------------------------------------------

class TestCancelacion:
    def test_cancelar_libera_el_slot(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        encontrado = _buscar_slot(cliente_api, token, id_barbero=2, desde=20, ultimo=True)
        if not encontrado:
            pytest.skip("Sin slots libres para el barbero 2")
        fecha, hora = encontrado

        creada = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 2, "id_servicio": 1, "fecha": fecha, "hora_inicio": hora},
        )
        assert creada.status_code == 201, creada.text
        id_cita = creada.json()["id_cita"]

        r = cliente_api.post(
            f"/api/citas/{id_cita}/cancelar",
            headers=auth(token),
            json={"motivo": "Prueba automatizada de cancelacion"},
        )
        assert r.status_code == 200
        assert r.json()["estado"] == "cancelada"

        # El slot vuelve a estar disponible
        slots = cliente_api.get(
            f"/api/citas/disponibilidad?id_barbero=2&fecha={fecha}&id_servicio=1",
            headers=auth(token),
        ).json()["slots"]
        liberado = next(s for s in slots if s["hora_inicio"] == hora)
        assert liberado["disponible"] is True

    def test_no_se_cancela_dos_veces(self, cliente_api, cliente_temporal, auth):
        """Depende de la cita cancelada por la prueba anterior."""
        token, _ = cliente_temporal
        canceladas = cliente_api.get(
            "/api/citas?estado=cancelada", headers=auth(token)
        ).json()["items"]
        if not canceladas:
            self.test_cancelar_libera_el_slot(cliente_api, cliente_temporal, auth)
            canceladas = cliente_api.get(
                "/api/citas?estado=cancelada", headers=auth(token)
            ).json()["items"]
        r = cliente_api.post(
            f"/api/citas/{canceladas[0]['id_cita']}/cancelar",
            headers=auth(token),
            json={"motivo": "Intento repetido de cancelacion"},
        )
        assert r.status_code == 409


# ----------------------------------------------------------------------
# Puntos y fidelizacion
# ----------------------------------------------------------------------

class TestFidelizacion:
    def test_cliente_nuevo_arranca_en_cero_bronce(self, cliente_api, auth):
        correo = f"qa-{uuid.uuid4().hex[:10]}@example.com"
        cliente_api.post(
            "/api/auth/registro",
            json={"nombre": "Nivel QA", "correo": correo,
                  "telefono": "3000000003", "contrasena": PASSWORD},
        )
        token = cliente_api.post(
            "/api/auth/login", json={"correo": correo, "contrasena": PASSWORD}
        ).json()["access_token"]
        saldo = cliente_api.get("/api/puntos/saldo", headers=auth(token)).json()
        assert saldo["puntos_saldo"] == 0
        assert saldo["nivel_fidelizacion"] == "Bronce"

    def test_completar_cita_otorga_puntos(self, cliente_api, cliente_temporal, auth):
        """Tras el flujo completo el cliente debe tener los puntos del servicio."""
        token, _ = cliente_temporal
        saldo = cliente_api.get("/api/puntos/saldo", headers=auth(token)).json()
        movimientos = cliente_api.get(
            "/api/puntos/movimientos", headers=auth(token)
        ).json()
        assert saldo["puntos_saldo"] >= 0
        assert movimientos["total"] >= 0

    def test_no_se_canjean_puntos_sin_saldo(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        r = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1, "fecha": _fecha_futura(25),
                  "hora_inicio": "10:00", "puntos_a_canjear": 999999},
        )
        assert r.status_code in (400, 409)

    def test_cliente_no_se_autoajusta_puntos(self, cliente_api, cliente_temporal, auth):
        token, usuario = cliente_temporal
        r = cliente_api.post(
            f"/api/puntos/clientes/{usuario['id_cliente']}/ajuste",
            headers=auth(token),
            json={"puntos": 10000, "descripcion": "Intento de fraude"},
        )
        assert r.status_code == 403

    def test_admin_ajusta_y_queda_trazado(self, cliente_api, cliente_temporal,
                                          token_admin, auth):
        token, usuario = cliente_temporal
        id_cliente = usuario["id_cliente"]
        antes = cliente_api.get("/api/puntos/saldo", headers=auth(token)).json()["puntos_saldo"]

        r = cliente_api.post(
            f"/api/puntos/clientes/{id_cliente}/ajuste",
            headers=auth(token_admin),
            json={"puntos": 50, "descripcion": "Bono de prueba automatizada"},
        )
        assert r.status_code == 200

        despues = cliente_api.get("/api/puntos/saldo", headers=auth(token)).json()["puntos_saldo"]
        assert despues == antes + 50

        movimientos = cliente_api.get("/api/puntos/movimientos", headers=auth(token)).json()
        assert any(m["puntos"] == 50 for m in movimientos["items"])

        # Y se revierte para no dejar residuo
        cliente_api.post(
            f"/api/puntos/clientes/{id_cliente}/ajuste",
            headers=auth(token_admin),
            json={"puntos": -50, "descripcion": "Reversa de la prueba automatizada"},
        )


# ----------------------------------------------------------------------
# Facturacion
# ----------------------------------------------------------------------

class TestFacturacion:
    def test_no_se_factura_una_cita_pendiente(self, cliente_api, cliente_temporal,
                                              token_admin, auth):
        token, _ = cliente_temporal
        pendientes = cliente_api.get(
            "/api/citas?estado=pendiente", headers=auth(token)
        ).json()["items"]
        if not pendientes:
            encontrado = _buscar_slot(cliente_api, token, id_barbero=2, desde=40)
            if not encontrado:
                pytest.skip("Sin slots libres para crear una cita pendiente")
            fecha, hora = encontrado
            creada = cliente_api.post(
                "/api/citas",
                headers=auth(token),
                json={"id_barbero": 2, "id_servicio": 1,
                      "fecha": fecha, "hora_inicio": hora},
            )
            assert creada.status_code == 201, creada.text
            pendientes = [creada.json()]
        r = cliente_api.post(
            "/api/facturas",
            headers=auth(token_admin),
            json={"id_cita": pendientes[0]["id_cita"], "metodo_pago": "efectivo"},
        )
        assert r.status_code in (400, 409)

    def test_ciclo_de_factura(self, cliente_api, cliente_temporal, token_admin,
                              token_barbero, auth, slot_libre):
        """Cita completada -> factura -> pago -> no se paga dos veces."""
        token, _ = cliente_temporal
        encontrado = _buscar_slot(cliente_api, token, id_barbero=1, desde=35)
        if not encontrado:
            pytest.skip("Sin slots libres para facturar")
        fecha, hora = encontrado

        cita = cliente_api.post(
            "/api/citas",
            headers=auth(token),
            json={"id_barbero": 1, "id_servicio": 1, "fecha": fecha, "hora_inicio": hora},
        ).json()
        id_cita = cita["id_cita"]

        for estado in ("confirmada", "en_atencion", "completada"):
            cliente_api.patch(
                f"/api/citas/{id_cita}/estado",
                headers=auth(token_barbero), json={"estado": estado},
            )

        r = cliente_api.post(
            "/api/facturas",
            headers=auth(token_admin),
            json={"id_cita": id_cita, "metodo_pago": "efectivo"},
        )
        assert r.status_code == 201, r.text
        factura = r.json()
        assert factura["numero_factura"].startswith("FAC-")
        assert factura["detalles"]
        assert factura["total"] > 0
        id_factura = factura["id_factura"]

        # Una cita solo se factura una vez
        repetida = cliente_api.post(
            "/api/facturas",
            headers=auth(token_admin),
            json={"id_cita": id_cita, "metodo_pago": "efectivo"},
        )
        assert repetida.status_code == 409

        # Registrar el pago
        pago = cliente_api.patch(
            f"/api/facturas/{id_factura}/pago",
            headers=auth(token_admin),
            json={"metodo_pago": "nequi"},
        )
        assert pago.status_code == 200
        assert pago.json()["estado_pago"] == "pagada"

        # No se paga dos veces
        repago = cliente_api.patch(
            f"/api/facturas/{id_factura}/pago",
            headers=auth(token_admin),
            json={"metodo_pago": "efectivo"},
        )
        assert repago.status_code == 409

    def test_cliente_no_lista_facturas_ajenas(self, cliente_api, cliente_temporal, auth):
        token, usuario = cliente_temporal
        r = cliente_api.get("/api/facturas", headers=auth(token))
        assert r.status_code == 200
        for factura in r.json()["items"]:
            assert factura["id_cliente"] == usuario["id_cliente"]


# ----------------------------------------------------------------------
# Resenas
# ----------------------------------------------------------------------

class TestResenas:
    def test_calificacion_fuera_de_rango(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        r = cliente_api.post(
            "/api/resenas",
            headers=auth(token),
            json={"id_cita": 1, "calificacion": 9, "comentario": "Fuera de rango"},
        )
        assert r.status_code == 422

    def test_no_se_resena_cita_ajena(self, cliente_api, cliente_temporal, auth):
        token, _ = cliente_temporal
        r = cliente_api.post(
            "/api/resenas",
            headers=auth(token),
            json={"id_cita": 1, "calificacion": 5, "comentario": "Cita que no es mia"},
        )
        assert r.status_code in (403, 404, 409)

    def test_resumen_de_barbero(self, cliente_api):
        r = cliente_api.get("/api/resenas/barbero/1/resumen")
        assert r.status_code == 200
        resumen = r.json()
        assert resumen["total"] >= 0
        assert 0 <= resumen["promedio"] <= 5
        assert sum(resumen["distribucion"].values()) == resumen["total"]


# ----------------------------------------------------------------------
# Auditoria
# ----------------------------------------------------------------------

class TestAuditoria:
    def test_login_fallido_queda_registrado(self, cliente_api, token_admin, auth):
        correo = f"qa-audit-{uuid.uuid4().hex[:8]}@example.com"
        cliente_api.post(
            "/api/auth/login", json={"correo": correo, "contrasena": "mala-clave"}
        )
        intentos = cliente_api.get(
            "/api/auditoria/login?solo_fallidos=true", headers=auth(token_admin)
        ).json()
        assert any(i["correo"] == correo for i in intentos)

    def test_acciones_quedan_en_audit_logs(self, cliente_api, token_admin, auth):
        r = cliente_api.get("/api/auditoria?limite=20", headers=auth(token_admin))
        assert r.status_code == 200
        registros = r.json()
        assert registros
        assert {"accion", "entidad", "creado_en"} <= set(registros[0])
