"""Pruebas de integracion de la API. Requieren base de datos con datos semilla.

Si no hay base de datos accesible, todo el modulo se omite (skip) en lugar de fallar.
"""

import pytest

pytestmark = pytest.mark.integracion


# ----------------------------------------------------------------------
# Salud y metadatos
# ----------------------------------------------------------------------

class TestSalud:
    def test_health(self, cliente_api):
        r = cliente_api.get("/api/health")
        assert r.status_code == 200
        cuerpo = r.json()
        assert cuerpo["estado"] in ("ok", "degradado")
        assert "base_datos" in cuerpo

    def test_raiz(self, cliente_api):
        assert cliente_api.get("/").status_code == 200

    def test_openapi_disponible(self, cliente_api):
        r = cliente_api.get("/openapi.json")
        assert r.status_code == 200
        assert len(r.json()["paths"]) > 50


# ----------------------------------------------------------------------
# Autenticacion
# ----------------------------------------------------------------------

class TestAutenticacion:
    def test_login_correcto(self, cliente_api):
        r = cliente_api.post(
            "/api/auth/login",
            json={"correo": "admin@globde.test", "contrasena": "Globde2025*"},
        )
        assert r.status_code == 200
        cuerpo = r.json()
        assert cuerpo["access_token"] and cuerpo["refresh_token"]
        assert cuerpo["token_type"].lower() == "bearer"
        assert cuerpo["usuario"]["correo"] == "admin@globde.test"
        assert "contrasena" not in str(cuerpo).lower() or "contrasena_hash" not in str(cuerpo)

    def test_login_password_incorrecta(self, cliente_api):
        """Se usa un cliente semilla, no el admin, para no gastarle intentos."""
        import uuid

        correo = f"qa-fallo-{uuid.uuid4().hex[:8]}@example.com"
        cliente_api.post(
            "/api/auth/registro",
            json={"nombre": "Fallo QA", "correo": correo,
                  "telefono": "3000000008", "contrasena": "Prueba2025*"},
        )
        r = cliente_api.post(
            "/api/auth/login", json={"correo": correo, "contrasena": "clave-mala"}
        )
        assert r.status_code == 401

    def test_login_usuario_inexistente(self, cliente_api):
        """Correo unico por corrida: si no, el rate limit acumulado daria 429."""
        import uuid

        r = cliente_api.post(
            "/api/auth/login",
            json={"correo": f"nadie-{uuid.uuid4().hex[:8]}@globde.test",
                  "contrasena": "Globde2025*"},
        )
        assert r.status_code == 401

    def test_login_correo_invalido_es_422(self, cliente_api):
        r = cliente_api.post(
            "/api/auth/login", json={"correo": "no-es-correo", "contrasena": "Globde2025*"}
        )
        assert r.status_code == 422
        assert "errores" in r.json()

    def test_me_con_token(self, cliente_api, token_admin, auth):
        r = cliente_api.get("/api/auth/me", headers=auth(token_admin))
        assert r.status_code == 200
        assert r.json()["id_rol"] == 1

    def test_me_sin_token(self, cliente_api):
        assert cliente_api.get("/api/auth/me").status_code == 401

    def test_me_con_token_invalido(self, cliente_api, auth):
        assert cliente_api.get("/api/auth/me", headers=auth("token.falso.aqui")).status_code == 401

    def test_refresh(self, cliente_api):
        login = cliente_api.post(
            "/api/auth/login",
            json={"correo": "admin@globde.test", "contrasena": "Globde2025*"},
        ).json()
        r = cliente_api.post(
            "/api/auth/refresh", json={"refresh_token": login["refresh_token"]}
        )
        assert r.status_code == 200
        assert r.json()["access_token"]

    def test_refresh_con_access_token_falla(self, cliente_api, token_admin):
        r = cliente_api.post("/api/auth/refresh", json={"refresh_token": token_admin})
        assert r.status_code == 401

    def test_bloqueo_por_intentos_fallidos(self, cliente_api, settings):
        """Tras N fallos seguidos el correo queda bloqueado temporalmente (429)."""
        import uuid

        correo = f"qa-bloqueo-{uuid.uuid4().hex[:8]}@example.com"
        cliente_api.post(
            "/api/auth/registro",
            json={"nombre": "Bloqueo QA", "correo": correo,
                  "telefono": "3000000009", "contrasena": "Prueba2025*"},
        )
        codigos = [
            cliente_api.post(
                "/api/auth/login", json={"correo": correo, "contrasena": "mala"}
            ).status_code
            for _ in range(settings.LOGIN_MAX_INTENTOS + 1)
        ]
        assert codigos[0] == 401
        assert codigos[-1] == 429

        # Ni siquiera con la clave correcta entra mientras dure el bloqueo
        r = cliente_api.post(
            "/api/auth/login", json={"correo": correo, "contrasena": "Prueba2025*"}
        )
        assert r.status_code == 429

    def test_forgot_password_no_revela_usuarios(self, cliente_api):
        """Responde igual exista o no el correo (evita enumeracion)."""
        existente = cliente_api.post(
            "/api/auth/password/forgot", json={"correo": "cliente1@example.com"}
        )
        inexistente = cliente_api.post(
            "/api/auth/password/forgot", json={"correo": "fantasma@example.com"}
        )
        assert existente.status_code == inexistente.status_code == 200

    def test_reset_con_token_invalido(self, cliente_api):
        r = cliente_api.post(
            "/api/auth/password/reset",
            json={"token": "token-invalido-largo-1234", "nueva_contrasena": "Nueva2026*"},
        )
        assert r.status_code in (400, 404)


# ----------------------------------------------------------------------
# Autorizacion por rol
# ----------------------------------------------------------------------

class TestPermisos:
    def test_cliente_no_lista_usuarios(self, cliente_api, token_cliente, auth):
        assert cliente_api.get("/api/usuarios", headers=auth(token_cliente)).status_code == 403

    def test_cliente_no_ve_auditoria(self, cliente_api, token_cliente, auth):
        assert cliente_api.get("/api/auditoria", headers=auth(token_cliente)).status_code == 403

    def test_barbero_no_crea_servicios(self, cliente_api, token_barbero, auth):
        r = cliente_api.post(
            "/api/servicios",
            headers=auth(token_barbero),
            json={"nombre": "No permitido", "categoria": "Cortes",
                  "precio": 10000, "duracion_minutos": 30},
        )
        assert r.status_code == 403

    def test_admin_si_lista_usuarios(self, cliente_api, token_admin, auth):
        assert cliente_api.get("/api/usuarios", headers=auth(token_admin)).status_code == 200

    def test_endpoints_protegidos_sin_token(self, cliente_api):
        for ruta in ("/api/usuarios", "/api/citas", "/api/facturas",
                     "/api/puntos/saldo", "/api/notificaciones", "/api/auditoria"):
            assert cliente_api.get(ruta).status_code == 401, ruta


# ----------------------------------------------------------------------
# Catalogos publicos
# ----------------------------------------------------------------------

class TestCatalogos:
    """Los catalogos son listas planas y publicas (los consume el front sin login)."""

    def test_servicios_son_publicos(self, cliente_api):
        r = cliente_api.get("/api/servicios")
        assert r.status_code == 200
        servicios = r.json()
        assert isinstance(servicios, list) and servicios
        assert {"id_servicio", "nombre", "precio", "duracion_minutos"} <= set(servicios[0])

    def test_filtro_por_categoria(self, cliente_api):
        r = cliente_api.get("/api/servicios?categoria=Cortes")
        assert r.status_code == 200
        assert all(s["categoria"] == "Cortes" for s in r.json())

    def test_categoria_invalida_es_422(self, cliente_api):
        assert cliente_api.get("/api/servicios?categoria=Inexistente").status_code == 422

    def test_categorias_con_conteo(self, cliente_api):
        r = cliente_api.get("/api/servicios/categorias")
        assert r.status_code == 200
        assert all("total" in c for c in r.json())

    def test_barberos_son_publicos(self, cliente_api):
        r = cliente_api.get("/api/barberos")
        assert r.status_code == 200
        barberos = r.json()
        assert isinstance(barberos, list) and barberos
        assert "contrasena_hash" not in barberos[0]

    def test_servicio_inexistente_es_404(self, cliente_api):
        assert cliente_api.get("/api/servicios/999999").status_code == 404


# ----------------------------------------------------------------------
# Paginacion
# ----------------------------------------------------------------------

class TestPaginacionApi:
    """Los listados administrativos usan el sobre paginado estandar."""

    def test_sobre_estandar(self, cliente_api, token_admin, auth):
        cuerpo = cliente_api.get(
            "/api/clientes?pagina=1&por_pagina=2", headers=auth(token_admin)
        ).json()
        assert set(cuerpo) >= {"items", "total", "pagina", "por_pagina", "total_paginas"}
        assert len(cuerpo["items"]) <= 2
        assert cuerpo["por_pagina"] == 2

    def test_segunda_pagina_no_repite(self, cliente_api, token_admin, auth):
        uno = cliente_api.get("/api/clientes?pagina=1&por_pagina=1", headers=auth(token_admin)).json()
        dos = cliente_api.get("/api/clientes?pagina=2&por_pagina=1", headers=auth(token_admin)).json()
        if uno["total"] > 1:
            assert uno["items"][0] != dos["items"][0]

    def test_pagina_cero_es_422(self, cliente_api, token_admin, auth):
        r = cliente_api.get("/api/clientes?pagina=0", headers=auth(token_admin))
        assert r.status_code == 422

    def test_por_pagina_excesivo_es_422(self, cliente_api, token_admin, auth):
        r = cliente_api.get("/api/clientes?por_pagina=100000", headers=auth(token_admin))
        assert r.status_code == 422


# ----------------------------------------------------------------------
# Agenda y disponibilidad
# ----------------------------------------------------------------------

class TestDisponibilidad:
    def test_horarios_del_barbero(self, cliente_api):
        r = cliente_api.get("/api/barberos/1/horarios")
        assert r.status_code == 200
        for horario in r.json():
            assert 1 <= horario["dia_semana"] <= 7
            assert len(horario["hora_inicio"]) == 5  # HH:MM

    def test_slots_de_disponibilidad(self, cliente_api, token_cliente, auth):
        import datetime

        fecha = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
        r = cliente_api.get(
            f"/api/citas/disponibilidad?id_barbero=1&fecha={fecha}&id_servicio=1",
            headers=auth(token_cliente),
        )
        assert r.status_code == 200
        slots = r.json()["slots"]
        assert slots and all({"hora_inicio", "hora_fin", "disponible"} <= set(s) for s in slots)

    def test_fecha_mal_formada_es_422(self, cliente_api, token_cliente, auth):
        r = cliente_api.get(
            "/api/citas/disponibilidad?id_barbero=1&fecha=32-13-2026&id_servicio=1",
            headers=auth(token_cliente),
        )
        assert r.status_code == 422


# ----------------------------------------------------------------------
# Reportes
# ----------------------------------------------------------------------

class TestReportes:
    def test_dashboard_admin(self, cliente_api, token_admin, auth):
        assert cliente_api.get("/api/reportes/dashboard", headers=auth(token_admin)).status_code == 200

    def test_cliente_no_accede_a_ingresos(self, cliente_api, token_cliente, auth):
        r = cliente_api.get("/api/reportes/ingresos", headers=auth(token_cliente))
        assert r.status_code == 403

    @pytest.mark.parametrize(
        "ruta",
        ["/api/reportes/ingresos", "/api/reportes/ingresos/barberos",
         "/api/reportes/servicios-populares", "/api/reportes/citas",
         "/api/reportes/ocupacion", "/api/reportes/fidelizacion"],
    )
    def test_reportes_admin(self, cliente_api, token_admin, auth, ruta):
        assert cliente_api.get(ruta, headers=auth(token_admin)).status_code == 200


# ----------------------------------------------------------------------
# Manejo de errores
# ----------------------------------------------------------------------

class TestErrores:
    def test_ruta_inexistente(self, cliente_api):
        assert cliente_api.get("/api/no-existe").status_code == 404

    def test_metodo_no_permitido(self, cliente_api):
        assert cliente_api.delete("/api/health").status_code == 405

    def test_error_de_validacion_trae_detalle(self, cliente_api):
        cuerpo = cliente_api.post("/api/auth/login", json={}).json()
        assert "detail" in cuerpo and "errores" in cuerpo
        assert all({"campo", "mensaje"} <= set(e) for e in cuerpo["errores"])
