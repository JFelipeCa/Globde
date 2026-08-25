# 📋 Requisitos del Proyecto Globde

[⬅ Volver al README principal](../README.md)

Este documento indexa las **33 Historias de Usuario** y sus **33 Casos de Uso** correspondientes,
organizados por módulo funcional. Cada uno tiene su propio archivo con el detalle completo,
incluyendo criterios de aceptación y diagramas de flujo.

Los **16 requisitos funcionales** están en [`requisitos/RFs/`](requisitos/RFs/) y los **6 no
funcionales** en [`requisitos/RNFs/`](requisitos/RNFs/). La correspondencia completa
RF → HU → CU está en [`requisitos/matriz-trazabilidad.md`](requisitos/matriz-trazabilidad.md).

> [!IMPORTANT]
> **29 de las 33 historias están implementadas y verificadas contra el código.** Las cuatro
> restantes se marcan aquí con su estado real:
>
> | HU | Estado | Qué falta |
> | :--- | :--- | :--- |
> | [HU-027](requisitos/HUs/HU-027_configuraci%C3%B3n_de_horario_comercial.md) | 🟡 Parcial | Horario global del negocio; hoy solo hay horario por barbero |
> | [HU-028](requisitos/HUs/HU-028_registro_de_d%C3%ADas_festivos_o_cierres.md) | 🟡 Parcial | Cierres de día completo; `bloqueos_agenda` exige un barbero y un rango horario |
> | [HU-032](requisitos/HUs/HU-032_exportaci%C3%B3n_de_reportes_a_excel_csv.md) | 🔴 Pendiente | Endpoint de descarga CSV/Excel; no existe |
> | [HU-033](requisitos/HUs/HU-033_gesti%C3%B3n_de_lista_de_espera.md) | 🔴 Pendiente | Tabla, router y servicio; no existe nada |
>
> Estas cuatro son el backlog pendiente del tablero kanban.

---

## Autenticación y Acceso

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| [HU-001](requisitos/HUs/HU-001_registro_de_cuenta_cliente.md) | registrar nuevos usuarios al sistema ingresando informa... | [CU-01](requisitos/CUs/CU-01_registro_de_usuario.md) | Registro de Usuario |
| [HU-002](requisitos/HUs/HU-002_inicio_de_sesi%C3%B3n.md) | iniciar sesión en el sistema ingresando mi correo elect... | [CU-02](requisitos/CUs/CU-02_inicio_de_sesion.md) | Inicio de Sesión |
| [HU-003](requisitos/HUs/HU-003_recuperaci%C3%B3n_de_contrase%C3%B1a.md) | recuperar mi contraseña olvidada ingresando mi correo e... | [CU-03](requisitos/CUs/CU-03_recuperacion_de_contrasena.md) | Recuperación de Contraseña |

## Gestión de Clientes, Servicios y Barberos

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| [HU-004](requisitos/HUs/HU-004_registro_de_clientes_por_personal.md) | registrar clientes ingresando información como nombre, ... | [CU-04](requisitos/CUs/CU-04_registro_de_clientes.md) | Registro de Clientes |
| [HU-005](requisitos/HUs/HU-005_b%C3%BAsqueda_y_consulta_de_clientes.md) | buscar un cliente en el sistema mediante su nombre o nú... | [CU-05](requisitos/CUs/CU-05_busqueda_de_clientes.md) | Búsqueda de Clientes |
| [HU-006](requisitos/HUs/HU-006_desactivaci%C3%B3n_de_clientes.md) | eliminar el registro de un cliente del sistema cuando y... | [CU-06](requisitos/CUs/CU-06_eliminacion_de_cliente.md) | Eliminación de Cliente |
| [HU-007](requisitos/HUs/HU-007_registro_de_servicios_en_cat%C3%A1logo.md) | registrar los diferentes servicios que ofrece la barber... | [CU-07](requisitos/CUs/CU-07_registro_de_servicios.md) | Registro de Servicios |
| [HU-008](requisitos/HUs/HU-008_desactivaci%C3%B3n_temporal_de_servicios.md) | desactivar temporalmente un servicio del catálogo para ... | [CU-08](requisitos/CUs/CU-08_desactivacion_de_servicio.md) | Desactivación de Servicio |
| [HU-009](requisitos/HUs/HU-009_registro_de_nuevos_barberos.md) | registrar los barberos del negocio con información como... | [CU-09](requisitos/CUs/CU-09_registro_de_barberos.md) | Registro de Barberos |

## Disponibilidad y Agendamiento de Citas

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| [HU-010](requisitos/HUs/HU-010_asignaci%C3%B3n_de_horarios_de_trabajo.md) | asignar un horario de trabajo a cada barbero indicando ... | [CU-10](requisitos/CUs/CU-10_configuracion_de_disponibilidad_de_barbe.md) | Configuración de Disponibilidad de Barberos |
| [HU-011](requisitos/HUs/HU-011_visualizaci%C3%B3n_de_perfil_de_barbero.md) | ver el perfil de cada barbero con su nombre, especialid... | [CU-11](requisitos/CUs/CU-11_consulta_de_perfil_de_barbero.md) | Consulta de Perfil de Barbero |
| [HU-012](requisitos/HUs/HU-012_agendamiento_manual_por_administrador.md) | agendar citas para los clientes registrando información... | [CU-12](requisitos/CUs/CU-12_agendamiento_de_citas_barbero.md) | Agendamiento de Citas (Barbero) |
| [HU-013](requisitos/HUs/HU-013_reserva_de_cita_en_l%C3%ADnea_por_cliente.md) | seleccionar una fecha y un horario disponible para agen... | [CU-13](requisitos/CUs/CU-13_reserva_de_cita_en_linea_cliente.md) | Reserva de Cita en Línea (Cliente) |
| [HU-014](requisitos/HUs/HU-014_visualizaci%C3%B3n_de_agenda_del_barbero.md) | visualizar las citas programadas en la agenda del siste... | [CU-14](requisitos/CUs/CU-14_visualizacion_de_agenda_del_barbero.md) | Visualización de Agenda del Barbero |
| [HU-015](requisitos/HUs/HU-015_cambio_de_estado_de_cita.md) | cambiar el estado de una cita a pendiente, en atención ... | [CU-15](requisitos/CUs/CU-15_cambio_de_estado_de_cita.md) | Cambio de Estado de Cita |
| [HU-016](requisitos/HUs/HU-016_b%C3%BAsqueda_y_filtrado_de_citas.md) | buscar y filtrar citas en el sistema por fecha, barbero... | [CU-16](requisitos/CUs/CU-16_busqueda_y_filtrado_de_citas.md) | Búsqueda y Filtrado de Citas |
| [HU-017](requisitos/HUs/HU-017_cancelaci%C3%B3n_de_cita_por_cliente.md) | cancelar una cita previamente agendada desde mi perfil ... | [CU-17](requisitos/CUs/CU-17_cancelacion_de_cita_por_el_cliente.md) | Cancelación de Cita por el Cliente |

## Calificaciones, Historial y Notificaciones

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| [HU-018](requisitos/HUs/HU-018_calificaci%C3%B3n_del_servicio_recibido.md) | calificar el servicio recibido después de que mi cita h... | [CU-18](requisitos/CUs/CU-18_calificacion_del_servicio.md) | Calificación del Servicio |
| [HU-019](requisitos/HUs/HU-019_historial_de_citas_del_cliente.md) | ver el historial completo de mis citas anteriores con e... | [CU-19](requisitos/CUs/CU-19_consulta_de_historial_de_citas_del_clien.md) | Consulta de Historial de Citas del Cliente |
| [HU-020](requisitos/HUs/HU-020_recordatorio_autom%C3%A1tico_de_cita.md) | recibir un recordatorio automático por correo electróni... | [CU-20](requisitos/CUs/CU-20_envio_de_recordatorios_automaticos.md) | Envío de Recordatorios Automáticos |
| [HU-021](requisitos/HUs/HU-021_alerta_de_cancelaci%C3%B3n_al_administrador.md) | recibir una alerta en el panel del sistema cuando un cl... | [CU-21](requisitos/CUs/CU-21_alerta_de_cancelacion_al_administrador.md) | Alerta de Cancelación al Administrador |
| [HU-022](requisitos/HUs/HU-022_env%C3%ADo_de_notificaciones_masivas.md) | enviar notificaciones masivas a los clientes sobre prom... | [CU-22](requisitos/CUs/CU-22_envio_de_notificaciones_masivas.md) | Envío de Notificaciones Masivas |

## Programa de Fidelización (Puntos)

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| [HU-023](requisitos/HUs/HU-023_acumulaci%C3%B3n_autom%C3%A1tica_de_puntos.md) | acumular puntos automáticamente cada vez que completo u... | [CU-23](requisitos/CUs/CU-23_acumulacion_de_puntos_por_cita.md) | Acumulación de Puntos por Cita |
| [HU-024](requisitos/HUs/HU-024_consulta_de_saldo_de_puntos.md) | consultar mi saldo de puntos acumulados y el historial ... | [CU-24](requisitos/CUs/CU-24_consulta_de_saldo_y_movimientos_de_punto.md) | Consulta de Saldo y Movimientos de Puntos |
| [HU-025](requisitos/HUs/HU-025_configuraci%C3%B3n_de_puntos_por_servicio.md) | configurar la cantidad de puntos que otorga cada servic... | [CU-25](requisitos/CUs/CU-25_configuracion_de_puntos_por_servicio.md) | Configuración de Puntos por Servicio |
| [HU-026](requisitos/HUs/HU-026_canje_de_puntos_por_descuentos.md) | registrar el canje de puntos de un cliente como descuen... | [CU-26](requisitos/CUs/CU-26_canje_de_puntos.md) | Canje de Puntos |

## Configuración del Negocio

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| 🟡 [HU-027](requisitos/HUs/HU-027_configuraci%C3%B3n_de_horario_comercial.md) | configurar el horario de atención del negocio indicando... | [CU-27](requisitos/CUs/CU-27_configuracion_de_horario_de_atencion.md) | Configuración de Horario de Atención |
| 🟡 [HU-028](requisitos/HUs/HU-028_registro_de_d%C3%ADas_festivos_o_cierres.md) | registrar días festivos o cierres especiales del negoci... | [CU-28](requisitos/CUs/CU-28_registro_de_dias_no_laborales.md) | Registro de Días No Laborales |

## Reportes Administrativos

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| [HU-029](requisitos/HUs/HU-029_reporte_anal%C3%ADtico_de_ingresos.md) | ver un reporte de ingresos del negocio filtrado por per... | [CU-29](requisitos/CUs/CU-29_reporte_de_ingresos.md) | Reporte de Ingresos |
| [HU-030](requisitos/HUs/HU-030_ranking_de_servicios_m%C3%A1s_solicitados.md) | ver un ranking de los servicios más solicitados por los... | [CU-30](requisitos/CUs/CU-30_ranking_de_servicios_mas_solicitados.md) | Ranking de Servicios más Solicitados |
| [HU-031](requisitos/HUs/HU-031_reporte_de_desempe%C3%B1o_por_barbero.md) | ver un reporte del desempeño individual de cada barbero... | [CU-31](requisitos/CUs/CU-31_reporte_de_desempeno_por_barbero.md) | Reporte de Desempeño por Barbero |
| 🔴 [HU-032](requisitos/HUs/HU-032_exportaci%C3%B3n_de_reportes_a_excel_csv.md) | exportar los reportes generados en el sistema en format... | [CU-32](requisitos/CUs/CU-32_exportacion_de_reportes.md) | Exportación de Reportes |

## Lista de Espera

| HU | Historia de Usuario | CU | Caso de Uso |
|---|---|---|---|
| 🔴 [HU-033](requisitos/HUs/HU-033_gesti%C3%B3n_de_lista_de_espera.md) | inscribirme en una lista de espera cuando todos los hor... | [CU-33](requisitos/CUs/CU-33_gestion_de_lista_de_espera.md) | Gestión de Lista de Espera |

---

[⬅ Volver al README principal](../README.md)
