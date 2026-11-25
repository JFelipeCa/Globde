"""Pruebas unitarias puras: no requieren base de datos ni servidor."""

import re
from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from app.core import security
from app.core.exceptions import DatosInvalidos, Prohibido
from app.schemas.agenda import HorarioNegocioIn
from app.services import (
    agenda_service,
    citas_service,
    email_service,
    lista_espera_service,
    puntos_service,
    reportes_service,
    recordatorios_service,
)
from app.utils.paginacion import offset_de, paginar


class TestListaEspera:
    @pytest.mark.parametrize(
        ("franja", "hora", "coincide"),
        [
            ("manana", "12:59", True),
            ("manana", "13:00", False),
            ("tarde", "13:00", True),
            ("tarde", "12:59", False),
            ("cualquiera", "08:00", True),
        ],
    )
    def test_franja_coincide_con_la_hora(self, franja, hora, coincide):
        assert lista_espera_service._franja_coincide(franja, hora) is coincide

    def test_barbero_no_puede_cancelar_solicitud_ajena(self, monkeypatch):
        class Cursor:
            statements = []

            def execute(self, query, _params):
                self.statements.append(query)

            def fetchone(self):
                return {"id_cliente": 4, "estado": "en_espera"}

        cursor = Cursor()

        @contextmanager
        def fake_transaction():
            yield cursor

        monkeypatch.setattr(lista_espera_service, "transaction", fake_transaction)
        barbero = SimpleNamespace(es_admin=False, es_cliente=False, id_cliente=None)

        with pytest.raises(Prohibido):
            lista_espera_service.cancelar(1, barbero)
        assert len(cursor.statements) == 1

    def test_ofrece_al_primer_cliente_que_coincide_con_la_franja(self, monkeypatch):
        candidatos = [
            {
                "id_espera": 1,
                "franja_horaria": "manana",
                "nombre": "Cliente mañana",
                "correo": "manana@example.com",
                "id_usuario": 11,
            },
            {
                "id_espera": 2,
                "franja_horaria": "tarde",
                "nombre": "Cliente tarde",
                "correo": "tarde@example.com",
                "id_usuario": 12,
            },
        ]
        reclamos = []
        monkeypatch.setattr(lista_espera_service, "fetch_one", lambda *_: None)
        monkeypatch.setattr(lista_espera_service, "fetch_all", lambda *_: candidatos)
        monkeypatch.setattr(
            lista_espera_service,
            "execute_rowcount",
            lambda _query, params: reclamos.append(params[3]) or 1,
        )
        monkeypatch.setattr(
            lista_espera_service.notificaciones_service,
            "crear_notificacion",
            lambda *_args: None,
        )
        monkeypatch.setattr(
            lista_espera_service.email_service,
            "enviar_notificacion_generica",
            lambda *_args: True,
        )

        assert lista_espera_service.ofrecer_siguiente(
            "2026-03-10", "14:00", "14:30", 5, 3
        )
        assert reclamos == [2]


# ----------------------------------------------------------------------
# Hash de contrasenas
# ----------------------------------------------------------------------

class TestPasswords:
    def test_hash_no_guarda_texto_plano(self):
        hash_ = security.hash_password("Globde2025*")
        assert "Globde2025*" not in hash_
        assert security.es_hash_bcrypt(hash_)

    def test_verificar_password_correcta(self):
        hash_ = security.hash_password("Globde2025*")
        assert security.verificar_password("Globde2025*", hash_) is True

    def test_verificar_password_incorrecta(self):
        hash_ = security.hash_password("Globde2025*")
        assert security.verificar_password("otra-clave", hash_) is False

    def test_hashes_distintos_por_salt(self):
        assert security.hash_password("Globde2025*") != security.hash_password("Globde2025*")

    def test_verificar_no_lanza_con_hash_invalido(self):
        assert security.verificar_password("x", "no-es-un-hash") is False

    @pytest.mark.parametrize(
        "password,valida",
        [
            ("Globde2025*", True),
            ("abcd1234", True),
            ("corta1", False),      # menos de 8
            ("solamenteletras", False),  # sin numero
            ("12345678", False),    # sin letra
        ],
    )
    def test_fortaleza(self, password, valida):
        assert (security.validar_fortaleza_password(password) == []) is valida


# ----------------------------------------------------------------------
# Tokens JWT
# ----------------------------------------------------------------------

class TestTokens:
    def test_access_token_ida_y_vuelta(self):
        token = security.crear_access_token(7, 3, "cliente@example.com")
        datos = security.decodificar_token(token, "access")
        assert datos["id_usuario"] == 7
        assert datos["id_rol"] == 3
        assert datos["correo"] == "cliente@example.com"
        assert datos["iss"] == "globde-api"

    def test_refresh_no_sirve_como_access(self):
        refresh = security.crear_refresh_token(7)
        with pytest.raises(security.TokenInvalido):
            security.decodificar_token(refresh, "access")

    def test_token_manipulado_es_rechazado(self):
        token = security.crear_access_token(7, 3, "cliente@example.com")
        alterado = token[:-4] + ("aaaa" if not token.endswith("aaaa") else "bbbb")
        with pytest.raises(security.TokenInvalido):
            security.decodificar_token(alterado, "access")

    def test_token_basura_es_rechazado(self):
        with pytest.raises(security.TokenInvalido):
            security.decodificar_token("esto.no.es.un.jwt", "access")


class TestProgresoNivel:
    def test_progreso_se_calcula_en_el_intervalo_del_nivel_actual(self, monkeypatch):
        monkeypatch.setattr(puntos_service.settings, "NIVEL_PLATA_DESDE", 100)
        monkeypatch.setattr(puntos_service.settings, "NIVEL_ORO_DESDE", 250)
        monkeypatch.setattr(puntos_service.settings, "NIVEL_DIAMANTE_DESDE", 500)

        assert puntos_service._progreso_nivel(175) == 50
        assert puntos_service._progreso_nivel(500) == 100


# ----------------------------------------------------------------------
# Tokens de recuperacion
# ----------------------------------------------------------------------

class TestRecuperacion:
    def test_token_recuperacion_es_aleatorio(self):
        plano_a, _ = security.generar_token_recuperacion()
        plano_b, _ = security.generar_token_recuperacion()
        assert plano_a != plano_b
        assert len(plano_a) >= 20

    def test_solo_se_persiste_el_hash(self):
        """El token plano viaja al correo; en la DB solo va el SHA-256."""
        plano, hash_ = security.generar_token_recuperacion()
        assert hash_ == security.hash_token(plano)
        assert plano not in hash_
        assert len(hash_) == 64  # CHAR(64) en password_reset_tokens

    def test_hash_token_es_determinista(self):
        plano, _ = security.generar_token_recuperacion()
        assert security.hash_token(plano) == security.hash_token(plano)

    def test_comparar_seguro(self):
        assert security.comparar_seguro("abc", "abc") is True
        assert security.comparar_seguro("abc", "abd") is False


# ----------------------------------------------------------------------
# Generadores de codigos
# ----------------------------------------------------------------------

class TestCodigos:
    def test_codigo_reserva_tiene_formato(self):
        codigo = security.generar_codigo_reserva()
        assert re.fullmatch(r"GB-[0-9A-F]{6}", codigo)

    def test_codigos_reserva_no_se_repiten(self):
        codigos = {security.generar_codigo_reserva() for _ in range(200)}
        assert len(codigos) == 200

    def test_numero_factura(self):
        assert security.generar_numero_factura(123, 2026) == "FAC-2026-000123"


# ----------------------------------------------------------------------
# Fidelizacion
# ----------------------------------------------------------------------

class TestPuntos:
    @pytest.mark.parametrize(
        "saldo,nivel",
        [(0, "Bronce"), (299, "Bronce"), (300, "Plata"), (699, "Plata"),
         (700, "Oro"), (1499, "Oro"), (1500, "Diamante"), (99999, "Diamante")],
    )
    def test_nivel_por_puntos(self, saldo, nivel):
        assert puntos_service.nivel_por_puntos(saldo) == nivel

    def test_conversion_puntos_pesos(self, settings):
        pesos = puntos_service.valor_en_pesos(100)
        assert pesos == 100 * settings.PUNTO_VALOR_COP
        assert puntos_service.puntos_desde_pesos(pesos) == 100

    def test_puntos_desde_pesos_trunca(self, settings):
        parcial = settings.PUNTO_VALOR_COP * 2.5
        assert puntos_service.puntos_desde_pesos(parcial) == 2


# ----------------------------------------------------------------------
# Paginacion
# ----------------------------------------------------------------------

class TestPaginacion:
    def test_sobre_paginado(self):
        r = paginar([1, 2, 3], total=25, pagina=2, por_pagina=10)
        assert r == {
            "items": [1, 2, 3], "total": 25, "pagina": 2,
            "por_pagina": 10, "total_paginas": 3,
        }

    def test_sin_resultados_es_una_pagina(self):
        assert paginar([], 0, 1, 20)["total_paginas"] == 1

    @pytest.mark.parametrize("pagina,por_pagina,esperado", [(1, 20, 0), (2, 20, 20), (3, 15, 30), (0, 20, 0)])
    def test_offset(self, pagina, por_pagina, esperado):
        assert offset_de(pagina, por_pagina) == esperado


# ----------------------------------------------------------------------
# Agenda del negocio
# ----------------------------------------------------------------------

class TestHorariosNegocio:
    def test_rechaza_franjas_que_se_solapan(self):
        horarios = [
            {"dia_semana": 1, "hora_inicio": "09:00", "hora_fin": "12:00"},
            {"dia_semana": 1, "hora_inicio": "11:30", "hora_fin": "14:00"},
        ]
        with pytest.raises(DatosInvalidos, match="se solapan"):
            agenda_service._validar_solapes(horarios)

    def test_permite_franjas_contiguas(self):
        horarios = [
            {"dia_semana": 1, "hora_inicio": "09:00", "hora_fin": "12:00"},
            {"dia_semana": 1, "hora_inicio": "12:00", "hora_fin": "14:00"},
        ]
        agenda_service._validar_solapes(horarios)

    def test_rechaza_hora_de_cierre_anterior_a_apertura(self):
        with pytest.raises(ValueError, match="posterior"):
            HorarioNegocioIn(
                dia_semana=1,
                hora_inicio="18:00",
                hora_fin="09:00",
            )


class TestExtrasCita:
    def test_suma_duracion_y_precio_de_extras_validos(self):
        extras = citas_service._validar_extras(["Lavado premium", "Perfilado de cejas"])

        assert citas_service._minutos_de_extras(extras) == 15
        assert citas_service._precio_de_extras(extras) == 12000

    @pytest.mark.parametrize(
        "extras",
        [["Descuento inventado"], ["Lavado premium", "Lavado premium"], [None]],
    )
    def test_rechaza_extras_no_validos_o_repetidos(self, extras):
        with pytest.raises(DatosInvalidos):
            citas_service._validar_extras(extras)


class TestFiltrosCitas:
    def test_incluye_rango_de_fechas_y_usa_parametros(self):
        where, parametros = citas_service._construir_filtros(
            id_barbero=4,
            estado="confirmada",
            desde="2026-11-01",
            hasta="2026-11-30",
        )

        assert "id_barbero = %s" in where
        assert "estado = %s" in where
        assert "fecha >= %s" in where
        assert "fecha <= %s" in where
        assert parametros == [4, "confirmada", "2026-11-01", "2026-11-30"]


class TestRecordatoriosCitas:
    @pytest.fixture
    def registro_recordatorio(self):
        return {
            "id_recordatorio": 7,
            "id_cita": 21,
            "intentos": 0,
            "codigo_reserva": "GB-1234ABCD",
            "fecha": "2026-12-01",
            "hora_inicio": "10:00",
            "id_usuario": 18,
            "nombre": "Cliente",
            "correo": "cliente@example.test",
            "barbero_nombre": "Barbero",
        }

    def test_envia_y_marca_recordatorio_con_un_solo_claim(
        self, monkeypatch, registro_recordatorio
    ):
        consultas: list[str] = []
        monkeypatch.setattr(recordatorios_service, "fetch_all", lambda *_: [registro_recordatorio])

        def ejecutar(sql, _params=()):
            consultas.append(sql)
            return 1

        enviados = []
        monkeypatch.setattr(recordatorios_service, "execute_rowcount", ejecutar)
        monkeypatch.setattr(
            recordatorios_service.email_service,
            "enviar_recordatorio_cita",
            lambda *args: enviados.append(args) or True,
        )

        assert recordatorios_service.procesar_recordatorios() == 1
        assert len(enviados) == 1
        assert any("estado = 'enviado'" in consulta for consulta in consultas)

    @pytest.mark.parametrize(
        ("intentos", "estado_esperado"),
        [(0, "pendiente"), (1, "fallido")],
    )
    def test_reintenta_fallo_a_los_30_minutos_y_detiene_tras_segundo_intento(
        self, monkeypatch, registro_recordatorio, intentos, estado_esperado
    ):
        registro_recordatorio["intentos"] = intentos
        consultas: list[tuple[str, tuple]] = []
        monkeypatch.setattr(recordatorios_service, "fetch_all", lambda *_: [registro_recordatorio])
        monkeypatch.setattr(
            recordatorios_service,
            "execute_rowcount",
            lambda sql, params=(): consultas.append((sql, params)) or 1,
        )
        monkeypatch.setattr(
            recordatorios_service.email_service,
            "enviar_recordatorio_cita",
            lambda *_: False,
        )

        assert recordatorios_service.procesar_recordatorios() == 0
        actualizacion = next(
            (sql, params) for sql, params in consultas
            if "SET estado = %s, intentos = %s" in sql
        )
        assert estado_esperado in actualizacion[1]
        assert intentos + 1 in actualizacion[1]


# ----------------------------------------------------------------------
# Configuracion
# ----------------------------------------------------------------------

class TestDashboardAdmin:
    def test_incluye_recaudo_y_saldo_pendiente_de_facturas(self, monkeypatch):
        def consultar_uno(sql, *_args):
            if "FROM facturas" in sql:
                return {
                    "facturas_pagadas": 3,
                    "facturas_pendientes": 2,
                    "ingresos_pendientes": 45000,
                }
            return {
                "total_citas": 12,
                "citas_completadas": 8,
                "citas_canceladas": 1,
                "citas_no_asistio": 1,
                "ingresos_pagados": 120000,
            }

        monkeypatch.setattr(reportes_service, "fetch_one", consultar_uno)
        monkeypatch.setattr(reportes_service, "fetch_value", lambda *_args, **_kwargs: 0)

        resultado = reportes_service.dashboard_admin()

        assert resultado["total_citas"] == 12
        assert resultado["ingresos_pagados"] == 120000
        assert resultado["facturas_pagadas"] == 3
        assert resultado["facturas_pendientes"] == 2
        assert resultado["ingresos_pendientes"] == 45000


class TestConfiguracion:
    def test_niveles_ordenados(self, settings):
        assert settings.NIVEL_PLATA_DESDE < settings.NIVEL_ORO_DESDE < settings.NIVEL_DIAMANTE_DESDE

    def test_roles_definidos(self, settings):
        assert (settings.ROL_ADMINISTRADOR, settings.ROL_BARBERO, settings.ROL_CLIENTE) == (1, 2, 3)

    def test_secreto_jwt_presente(self, settings):
        assert settings.JWT_SECRET and len(settings.JWT_SECRET) >= 16

    def test_bcrypt_rounds_seguro(self, settings):
        assert settings.BCRYPT_ROUNDS >= 10


# ----------------------------------------------------------------------
# Plantilla de correo
# ----------------------------------------------------------------------

class TestPlantillaEmail:
    def test_plantilla_usa_logo_incrustado_y_modo_oscuro(self):
        html = email_service._plantilla_base(
            "Seguridad de la cuenta", "<p>Restablecer contraseña</p>"
        )
        mensaje = email_service._crear_mensaje("cliente@example.com", "Prueba", html, "Texto")
        partes = list(mensaje.walk())
        logo = next(parte for parte in partes if parte.get_content_type() == "image/png")

        assert 'src="cid:globde-logo"' in html
        assert mensaje.get_content_type() == "multipart/related"
        assert logo["Content-ID"] == "<globde-logo>"
        assert logo["Content-Disposition"] == "inline"
        assert '<meta name="color-scheme" content="light dark">' in html
        assert "@media (prefers-color-scheme:dark)" in html
        assert "Restablecer contraseña" in html
