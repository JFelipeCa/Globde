"""Pruebas unitarias puras: no requieren base de datos ni servidor."""

import re

import pytest

from app.core import security
from app.services import puntos_service
from app.utils.paginacion import offset_de, paginar


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
        assert re.fullmatch(r"GB-[0-9A-F]{8}", codigo)

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
# Configuracion
# ----------------------------------------------------------------------

class TestConfiguracion:
    def test_niveles_ordenados(self, settings):
        assert settings.NIVEL_PLATA_DESDE < settings.NIVEL_ORO_DESDE < settings.NIVEL_DIAMANTE_DESDE

    def test_roles_definidos(self, settings):
        assert (settings.ROL_ADMINISTRADOR, settings.ROL_BARBERO, settings.ROL_CLIENTE) == (1, 2, 3)

    def test_secreto_jwt_presente(self, settings):
        assert settings.JWT_SECRET and len(settings.JWT_SECRET) >= 16

    def test_bcrypt_rounds_seguro(self, settings):
        assert settings.BCRYPT_ROUNDS >= 10
