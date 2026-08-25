import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.database import fetch_all, transaction  # noqa: E402

PATRONES = ("qa-%", "ana.prueba@%", "carlos.qa@%", "%@qa.test")
SERVICIOS_PRUEBA = ("Corte Prueba QA",)


def usuarios_de_prueba() -> list[dict]:
    condicion = " OR ".join(["u.correo LIKE %s"] * len(PATRONES))
    return fetch_all(
        f"""SELECT u.id_usuario, u.correo, u.nombre,
                   c.id_cliente, b.id_barbero
            FROM usuarios u
            LEFT JOIN clientes c ON c.id_usuario = u.id_usuario
            LEFT JOIN barberos b ON b.id_usuario = u.id_usuario
            WHERE {condicion}
            ORDER BY u.id_usuario""",
        PATRONES,
    )


def main() -> int:
    ejecutar = "--si" in sys.argv
    usuarios = usuarios_de_prueba()

    if not usuarios:
        print("No hay datos de prueba que limpiar.")
        return 0

    print(f"Usuarios de prueba encontrados: {len(usuarios)}")
    for u in usuarios:
        print(f"  - {u['id_usuario']:>4}  {u['correo']}")

    if not ejecutar:
        print("\nModo simulacion. Repite con --si para borrar de verdad.")
        return 0

    ids_usuario = [u["id_usuario"] for u in usuarios]
    ids_cliente = [u["id_cliente"] for u in usuarios if u["id_cliente"]]
    ids_barbero = [u["id_barbero"] for u in usuarios if u["id_barbero"]]

    def marcadores(valores):
        return ", ".join(["%s"] * len(valores))

    with transaction() as cursor:
        if ids_cliente:
            m = marcadores(ids_cliente)
            cursor.execute(
                f"SELECT id_cita FROM citas WHERE id_cliente IN ({m})", ids_cliente
            )
            citas = [f["id_cita"] for f in cursor.fetchall()]
            if citas:
                mc = marcadores(citas)
                cursor.execute(
                    f"""DELETE FROM detalle_factura
                        WHERE id_factura IN (SELECT id_factura FROM facturas
                                             WHERE id_cita IN ({mc}))""", citas)
                cursor.execute(f"DELETE FROM facturas WHERE id_cita IN ({mc})", citas)
                cursor.execute(f"DELETE FROM resenas WHERE id_cita IN ({mc})", citas)
            cursor.execute(f"DELETE FROM penalidades WHERE id_cliente IN ({m})", ids_cliente)
            cursor.execute(f"DELETE FROM puntos_movimientos WHERE id_cliente IN ({m})", ids_cliente)
            cursor.execute(f"DELETE FROM citas WHERE id_cliente IN ({m})", ids_cliente)

        if ids_barbero:
            m = marcadores(ids_barbero)
            cursor.execute(f"DELETE FROM resenas WHERE id_barbero IN ({m})", ids_barbero)
            cursor.execute(f"DELETE FROM citas WHERE id_barbero IN ({m})", ids_barbero)
            cursor.execute(f"DELETE FROM bloqueos_agenda WHERE id_barbero IN ({m})", ids_barbero)
            cursor.execute(f"DELETE FROM horarios_barbero WHERE id_barbero IN ({m})", ids_barbero)
            cursor.execute(f"DELETE FROM barbero_servicio WHERE id_barbero IN ({m})", ids_barbero)

        m = marcadores(ids_usuario)
        cursor.execute(f"DELETE FROM notificaciones WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM password_reset_tokens WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM email_logs WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM login_attempts WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM audit_logs WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM clientes WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM barberos WHERE id_usuario IN ({m})", ids_usuario)
        cursor.execute(f"DELETE FROM usuarios WHERE id_usuario IN ({m})", ids_usuario)

       
        cursor.execute(
            "DELETE FROM login_attempts WHERE "
            + " OR ".join(["correo_intentado LIKE %s"] * len(PATRONES)),
            PATRONES,
        )
        
        ms = marcadores(SERVICIOS_PRUEBA)
        cursor.execute(f"DELETE FROM barbero_servicio WHERE id_servicio IN "
                       f"(SELECT id_servicio FROM servicios WHERE nombre IN ({ms}))",
                       SERVICIOS_PRUEBA)
        cursor.execute(f"DELETE FROM servicios WHERE nombre IN ({ms})", SERVICIOS_PRUEBA)

    print(f"\nListo. Se eliminaron {len(usuarios)} usuarios de prueba y sus datos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
