# 🔗 Matriz de trazabilidad RF → HU → CU

[⬅ Volver al índice de requisitos](../requisitos.md) · [⬅ README de documentación](../README.md)

<!--
  ¿Qué? Correspondencia completa entre requisitos funcionales, historias de
  usuario y casos de uso del sistema GLOBDE.
  ¿Para qué? Permitir verificar que todo requisito tiene historia y caso de uso,
  y que ninguno queda huérfano.
  ¿Impacto? Es el documento de referencia para auditar el alcance del proyecto.
-->

Generado a partir de los propios archivos de requisitos. Los estados reflejan lo
verificado contra el código en agosto de 2026.

| Leyenda | Significado |
| :--- | :--- |
| 🟢 | Implementado y verificado contra el código |
| 🟡 | Parcialmente implementado — ver el aviso dentro del archivo |
| 🔴 | No implementado |

---

## Matriz completa

| RF | Historia de usuario | Caso de uso | Módulo | Prioridad | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **[RF-001](RFs/RF-001_registro_y_autenticacion_usuarios.md) · Registro y Autenticación de Usuarios** | | | *Autenticación y Seguridad* | | 🟢 **Implementado** |
| | [HU-001](HUs/HU-001_registro_de_cuenta_cliente.md) Registro de cuenta cliente | [CU-01](CUs/CU-01_registro_de_usuario.md) Registro de Usuario | Autenticación | Alta | 🟢 Implementada |
| | [HU-002](HUs/HU-002_inicio_de_sesi%C3%B3n.md) Inicio de sesión | [CU-02](CUs/CU-02_inicio_de_sesion.md) Inicio de Sesión | Autenticación | Alta | 🟢 Implementada |
| **[RF-002](RFs/RF-002_recuperacion_y_restablecimiento_contrasena.md) · Recuperación y Restablecimiento de Contraseña** | | | *Autenticación y Seguridad* | | 🟢 **Implementado** |
| | [HU-003](HUs/HU-003_recuperaci%C3%B3n_de_contrase%C3%B1a.md) Recuperación de contraseña | [CU-03](CUs/CU-03_recuperacion_de_contrasena.md) Recuperación de Contraseña | Autenticación | Alta | 🟢 Implementada |
| **[RF-003](RFs/RF-003_gestion_perfil_y_control_acceso.md) · Gestión de Perfil y Control de Acceso por Rol** | | | *Administración y Seguridad* | | 🟢 **Implementado** |
| | *— sin historia de usuario asociada —* | | | | |
| **[RF-004](RFs/RF-004_gestion_de_clientes.md) · Gestión y Administración de Clientes** | | | *Clientes* | | 🟢 **Implementado** |
| | [HU-004](HUs/HU-004_registro_de_clientes_por_personal.md) Registro de clientes por personal | [CU-04](CUs/CU-04_registro_de_clientes.md) Registro de Clientes | Clientes | Media-Alta | 🟢 Implementada |
| | [HU-005](HUs/HU-005_b%C3%BAsqueda_y_consulta_de_clientes.md) Búsqueda y consulta de clientes | [CU-05](CUs/CU-05_busqueda_de_clientes.md) Búsqueda de Clientes | Clientes | Media | 🟢 Implementada |
| | [HU-006](HUs/HU-006_desactivaci%C3%B3n_de_clientes.md) Desactivación de clientes | [CU-06](CUs/CU-06_eliminacion_de_cliente.md) Eliminación de Cliente | Clientes | Baja | 🟢 Implementada |
| **[RF-005](RFs/RF-005_gestion_de_barberos_y_disponibilidad.md) · Gestión de Barberos y Disponibilidad Horaria** | | | *Personal y Disponibilidad* | | 🟢 **Implementado** |
| | [HU-009](HUs/HU-009_registro_de_nuevos_barberos.md) Registro de nuevos barberos | [CU-09](CUs/CU-09_registro_de_barberos.md) Registro de Barberos | Personal | Alta | 🟢 Implementada |
| | [HU-010](HUs/HU-010_asignaci%C3%B3n_de_horarios_de_trabajo.md) Asignación de horarios de trabajo | [CU-10](CUs/CU-10_configuracion_de_disponibilidad_de_barbe.md) Configuración de Disponibilidad de Barberos | Personal | Alta | 🟢 Implementada |
| | [HU-011](HUs/HU-011_visualizaci%C3%B3n_de_perfil_de_barbero.md) Visualización de perfil de barbero | [CU-11](CUs/CU-11_consulta_de_perfil_de_barbero.md) Consulta de Perfil de Barbero | Personal | Media | 🟢 Implementada |
| **[RF-006](RFs/RF-006_gestion_de_servicios_y_catalogo.md) · Catálogo de Servicios y Cortes** | | | *Servicios* | | 🟢 **Implementado** |
| | [HU-007](HUs/HU-007_registro_de_servicios_en_cat%C3%A1logo.md) Registro de servicios en catálogo | [CU-07](CUs/CU-07_registro_de_servicios.md) Registro de Servicios | Servicios | Alta | 🟢 Implementada |
| | [HU-008](HUs/HU-008_desactivaci%C3%B3n_temporal_de_servicios.md) Desactivación temporal de servicios | [CU-08](CUs/CU-08_desactivacion_de_servicio.md) Desactivación de Servicio | Servicios | Media | 🟢 Implementada |
| **[RF-007](RFs/RF-007_agendamiento_y_reserva_de_citas.md) · Agendamiento y Reserva de Citas en Línea** | | | *Citas y Reservas* | | 🟢 **Implementado** |
| | [HU-012](HUs/HU-012_agendamiento_manual_por_administrador.md) Agendamiento manual por administrador | [CU-12](CUs/CU-12_agendamiento_de_citas_barbero.md) Agendamiento de Citas (Barbero) | Citas | Alta | 🟢 Implementada |
| | [HU-013](HUs/HU-013_reserva_de_cita_en_l%C3%ADnea_por_cliente.md) Reserva de cita en línea por cliente | [CU-13](CUs/CU-13_reserva_de_cita_en_linea_cliente.md) Reserva de Cita en Línea (Cliente) | Citas | Crítica | 🟢 Implementada |
| **[RF-008](RFs/RF-008_control_de_estados_y_agenda_del_barbero.md) · Control de Estados de Citas y Agenda del Barbero** | | | *Citas y Reservas* | | 🟢 **Implementado** |
| | [HU-014](HUs/HU-014_visualizaci%C3%B3n_de_agenda_del_barbero.md) Visualización de agenda del barbero | [CU-14](CUs/CU-14_visualizacion_de_agenda_del_barbero.md) Visualización de Agenda del Barbero | Citas | Alta | 🟢 Implementada |
| | [HU-015](HUs/HU-015_cambio_de_estado_de_cita.md) Cambio de estado de cita | [CU-15](CUs/CU-15_cambio_de_estado_de_cita.md) Cambio de Estado de Cita | Citas | Alta | 🟢 Implementada |
| **[RF-009](RFs/RF-009_busqueda_filtrado_y_gestion_de_citas.md) · Búsqueda, Filtrado y Consulta de Citas** | | | *Citas y Reservas* | | 🟢 **Implementado** |
| | [HU-016](HUs/HU-016_b%C3%BAsqueda_y_filtrado_de_citas.md) Búsqueda y filtrado de citas | [CU-16](CUs/CU-16_busqueda_y_filtrado_de_citas.md) Búsqueda y Filtrado de Citas | Citas | Media | 🟢 Implementada |
| **[RF-010](RFs/RF-010_cancelacion_reprogramacion_y_penalidades.md) · Cancelación, Reprogramación y Penalidades** | | | *Citas y Reservas* | | 🟢 **Implementado** |
| | [HU-017](HUs/HU-017_cancelaci%C3%B3n_de_cita_por_cliente.md) Cancelación de cita por cliente | [CU-17](CUs/CU-17_cancelacion_de_cita_por_el_cliente.md) Cancelación de Cita por el Cliente | Citas | Alta | 🟢 Implementada |
| **[RF-011](RFs/RF-011_sistema_de_calificaciones_y_resenas.md) · Sistema de Calificación y Reseñas de Barberos** | | | *Calificaciones y Calidad* | | 🟢 **Implementado** |
| | [HU-018](HUs/HU-018_calificaci%C3%B3n_del_servicio_recibido.md) Calificación del servicio recibido | [CU-18](CUs/CU-18_calificacion_del_servicio.md) Calificación del Servicio | Calificaciones | Media | 🟢 Implementada |
| **[RF-012](RFs/RF-012_historial_y_seguimiento_de_citas.md) · Historial y Seguimiento de Citas del Cliente** | | | *Clientes y Citas* | | 🟢 **Implementado** |
| | [HU-019](HUs/HU-019_historial_de_citas_del_cliente.md) Historial de citas del cliente | [CU-19](CUs/CU-19_consulta_de_historial_de_citas_del_clien.md) Consulta de Historial de Citas del Cliente | Clientes | Media | 🟢 Implementada |
| **[RF-013](RFs/RF-013_notificaciones_recordatorios_y_alertas.md) · Notificaciones, Recordatorios y Alertas Masivas** | | | *Notificaciones y Comunicaciones* | | 🟢 **Implementado** |
| | [HU-020](HUs/HU-020_recordatorio_autom%C3%A1tico_de_cita.md) Recordatorio automático de cita | [CU-20](CUs/CU-20_envio_de_recordatorios_automaticos.md) Envío de Recordatorios Automáticos | Notificaciones | Media | 🟢 Implementada |
| | [HU-021](HUs/HU-021_alerta_de_cancelaci%C3%B3n_al_administrador.md) Alerta de cancelación al administrador | [CU-21](CUs/CU-21_alerta_de_cancelacion_al_administrador.md) Alerta de Cancelación al Administrador | Notificaciones | Media | 🟢 Implementada |
| | [HU-022](HUs/HU-022_env%C3%ADo_de_notificaciones_masivas.md) Envío de notificaciones masivas | [CU-22](CUs/CU-22_envio_de_notificaciones_masivas.md) Envío de Notificaciones Masivas | Notificaciones | Baja | 🟢 Implementada |
| **[RF-014](RFs/RF-014_programa_de_fidelizacion_y_puntos.md) · Programa de Fidelización y Canje de Puntos** | | | *Fidelización y Marketing* | | 🟢 **Implementado** |
| | [HU-023](HUs/HU-023_acumulaci%C3%B3n_autom%C3%A1tica_de_puntos.md) Acumulación automática de puntos | [CU-23](CUs/CU-23_acumulacion_de_puntos_por_cita.md) Acumulación de Puntos por Cita | Fidelización | Alta | 🟢 Implementada |
| | [HU-024](HUs/HU-024_consulta_de_saldo_de_puntos.md) Consulta de saldo de puntos | [CU-24](CUs/CU-24_consulta_de_saldo_y_movimientos_de_punto.md) Consulta de Saldo y Movimientos de Puntos | Fidelización | Media | 🟢 Implementada |
| | [HU-025](HUs/HU-025_configuraci%C3%B3n_de_puntos_por_servicio.md) Configuración de puntos por servicio | [CU-25](CUs/CU-25_configuracion_de_puntos_por_servicio.md) Configuración de Puntos por Servicio | Fidelización | Media | 🟢 Implementada |
| | [HU-026](HUs/HU-026_canje_de_puntos_por_descuentos.md) Canje de puntos por descuentos | [CU-26](CUs/CU-26_canje_de_puntos.md) Canje de Puntos | Fidelización | Alta | 🟢 Implementada |
| **[RF-015](RFs/RF-015_configuracion_de_horarios_del_negocio.md) · Configuración de Horarios del Negocio y Festivos** | | | *Configuración del Sistema* | | 🟡 **Parcial** |
| | [HU-027](HUs/HU-027_configuraci%C3%B3n_de_horario_comercial.md) Configuración de horario comercial | [CU-27](CUs/CU-27_configuracion_de_horario_de_atencion.md) Configuración de Horario de Atención | Configuración | Media | 🟡 Parcial |
| | [HU-028](HUs/HU-028_registro_de_d%C3%ADas_festivos_o_cierres.md) Registro de días festivos o cierres | [CU-28](CUs/CU-28_registro_de_dias_no_laborales.md) Registro de Días No Laborales | Configuración | Media | 🟡 Parcial |
| **[RF-016](RFs/RF-016_reportes_estadisticas_y_exportacion.md) · Reportes Financieros, Estadísticas y Exportación** | | | *Reportes y Analítica* | | 🟡 **Parcial** |
| | [HU-029](HUs/HU-029_reporte_anal%C3%ADtico_de_ingresos.md) Reporte analítico de ingresos | [CU-29](CUs/CU-29_reporte_de_ingresos.md) Reporte de Ingresos | Reportes | Alta | 🟢 Implementada |
| | [HU-030](HUs/HU-030_ranking_de_servicios_m%C3%A1s_solicitados.md) Ranking de servicios más solicitados | [CU-30](CUs/CU-30_ranking_de_servicios_mas_solicitados.md) Ranking de Servicios más Solicitados | Reportes | Media | 🟢 Implementada |
| | [HU-031](HUs/HU-031_reporte_de_desempe%C3%B1o_por_barbero.md) Reporte de desempeño por barbero | [CU-31](CUs/CU-31_reporte_de_desempeno_por_barbero.md) Reporte de Desempeño por Barbero | Reportes | Alta | 🟢 Implementada |
| | [HU-032](HUs/HU-032_exportaci%C3%B3n_de_reportes_a_excel_csv.md) Exportación de reportes a Excel/CSV | [CU-32](CUs/CU-32_exportacion_de_reportes.md) Exportación de Reportes | Reportes | Media | 🔴 Pendiente |
| | [HU-033](HUs/HU-033_gesti%C3%B3n_de_lista_de_espera.md) Gestión de lista de espera | [CU-33](CUs/CU-33_gestion_de_lista_de_espera.md) Gestión de Lista de Espera | Citas | Baja | 🔴 Pendiente |

---

## Resumen

| Concepto | Cantidad |
| :--- | ---: |
| Requisitos funcionales | 16 |
| Historias de usuario | 33 |
| Casos de uso | 33 |
| HU implementadas 🟢 | 29 |
| HU parciales 🟡 | 2 |
| HU pendientes 🔴 | 2 |
| HU sin RF asociado | 0 |
| HU sin CU asociado | 0 |
| RF sin HU asociada | 1 |

### Cobertura

- **29/33** historias implementadas y verificadas contra el código (87 %).
- Toda historia de usuario tiene requisito funcional padre y caso de uso correspondiente.
- Los 6 requisitos no funcionales están en [`RNFs/`](RNFs/) y aplican de forma transversal.

> [!NOTE]
> **RF-003** no tiene historias de usuario propias: describe capacidades
> transversales (gestión de perfil y control de acceso por rol) que se ejercitan desde
> el resto de historias. Está implementado y cubierto por pruebas, pero conviene
> valorar con el instructor si debe redactarse una historia específica.

---

[⬅ Volver al índice de requisitos](../requisitos.md)
