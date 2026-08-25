export const ROL_ADMINISTRADOR = 1;
export const ROL_BARBERO = 2;
export const ROL_CLIENTE = 3;

export type TipoRol = 1 | 2 | 3;

export type NivelFidelizacion = 'Bronce' | 'Plata' | 'Oro' | 'Diamante';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  correo: string;
  telefono: string;
  id_rol: TipoRol;
  fecha_creacion: string;
  avatar_url?: string;
  puntos: number;
  nivel_fidelizacion: NivelFidelizacion;
  /** PK de la tabla `clientes`. No coincide con id_usuario. */
  id_cliente?: number;
  /** PK de la tabla `barberos`. No coincide con id_usuario. */
  id_barbero?: number;
}

export interface Barbero {
  id_barbero: number;
  id_usuario: number;
  nombre: string;
  rol_titulo: string;
  nivel: 'Plata' | 'Oro' | 'Master';
  experiencia_anos: number;
  rating: number;
  total_resenas: number;
  especialidades: string[];
  foto_url: string;
  disponible_hoy: boolean;
  hora_apertura: string; // HH:MM 24h
  hora_cierre: string;   // HH:MM 24h
  porcentaje_incremento: number;
  citas_completadas: number;
  bio: string;
  color: string; // color de acento para la agenda
  /** Jornada real por dia (1=Lunes … 7=Domingo). */
  horarios?: { dia_semana: number; hora_inicio: string; hora_fin: string }[];
  /** Servicios que este barbero presta. */
  servicios_ids?: number[];
}

export type CategoriaServicio = 'Cortes' | 'Barba' | 'Combos' | 'Tratamientos' | 'Infantil';

export interface Servicio {
  id_servicio: number;
  nombre: string;
  categoria: CategoriaServicio;
  descripcion: string;
  precio: number;
  duracion_minutos: number;
  popular?: boolean;
  icono: string;
  imagen_url?: string;
  puntos_otorga: number;
  activo: boolean;
}

export type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'en_atencion'
  | 'completada'
  | 'cancelada'
  | 'no_asistio';

export interface Resena {
  rating: number;
  comentario: string;
  etiquetas: string[];
  fecha: string;
}

export interface Cita {
  id_cita: number;
  codigo_reserva: string;
  id_cliente: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_correo: string;
  id_barbero: number;
  barbero_nombre: string;
  id_servicio: number;
  servicio_nombre: string;
  precio_total: number;
  descuento_aplicado: number;
  puntos_canjeados: number;
  fecha: string;        // YYYY-MM-DD
  hora_inicio: string;  // HH:MM (24h)
  hora_fin: string;     // HH:MM (24h)
  duracion_minutos: number;
  estado: EstadoCita;
  observaciones: string;
  extras: string[];
  creado_en: string;
  resena?: Resena;
  metodo_pago?: string;
}

export interface PremioFidelidad {
  id_premio: number;
  titulo: string;
  descripcion: string;
  costo_puntos: number;
  icono: string;
  categoria: 'descuento' | 'servicio' | 'producto' | 'cortesia';
}

export interface EntradaListaEspera {
  id_espera: number;
  id_cliente: number;
  nombre_cliente: string;
  telefono: string;
  id_servicio: number;
  servicio_nombre: string;
  id_barbero?: number;
  barbero_nombre?: string;
  fecha_deseada: string;
  franja_horaria: 'manana' | 'tarde' | 'cualquiera';
  estado: 'en_espera' | 'notificado' | 'convertido';
  creado_en: string;
  observaciones?: string;
}

export interface Factura {
  id_factura: number;
  numero_factura: string;
  id_cita: number;
  cliente_nombre: string;
  barbero_nombre: string;
  servicio_nombre: string;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: string;
  fecha: string;
  estado_pago: 'pagado' | 'pendiente';
}

export interface CatalogoCorte {
  id_corte: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  imagen_url: string;
  tags: string[];
  popularidad: number;
  barbero_recomendado: string;
  duracion_minutos: number;
  precio_sugerido: number;
}

export interface Testimonio {
  id: number;
  nombre: string;
  rol: string;
  texto: string;
  rating: number;
  barbero_favorito: string;
  avatar_url: string;
  corte: string;
  fecha: string;
}

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'cita' | 'puntos' | 'recordatorio' | 'promo' | 'sistema' | 'error';
  fecha: string;
}

export interface DatosReserva {
  servicio_id: number;
  barbero_id: number;
  fecha: string;
  hora_inicio: string;
  extras: string[];
  usar_puntos: boolean;
  puntos_a_usar: number;
  nombre: string;
  correo: string;
  telefono: string;
  observaciones: string;
}

export type Vista =
  | 'inicio'
  | 'catalogo'
  | 'fidelizacion'
  | 'panel-cliente'
  | 'panel-barbero'
  | 'panel-admin';

export type EstadoCarga = 'inactivo' | 'cargando' | 'correcto' | 'error';

export interface Rol {
  id_rol: number;
  nombre: string;
  descripcion: string;
}

export interface Cliente {
  id_cliente: number;
  id_usuario: number;
  nombre: string;
  telefono: string;
  correo: string;
  fecha_registro: string;
  puntaje: number;
}

export interface DetalleFactura {
  id_detalle: number;
  id_factura: number;
  id_servicio: number;
  precio: number;
}

export interface Penalidad {
  id_penalidad: number;
  id_cita: number;
  id_usuario: number;
  motivo: string;
  valor: number;
  fecha: string;
}

export interface RankingBarbero {
  id_ranking: number;
  id_usuario: number;
  nivel: string;
  porcentaje_incremento: number;
  total_citas: number;
}

export interface LoginPayload {
  correo: string;
  contrasena: string;
}

export interface PasswordForgotPayload {
  correo: string;
}

export interface PasswordResetPayload {
  token: string;
  nueva_contrasena: string;
}

export interface MensajeApi {
  mensaje: string;
}

export interface ClientePayload {
  nombre: string;
  telefono: string;
  correo: string;
  contrasena: string;
}

export interface CitaPayload {
  id_cliente: number;
  id_usuario: number;
  id_servicio: number;
  fecha: string;
  hora: string;
  estado: Cita['estado'];
  observaciones: string;
}

export interface ServicioPayload {
  nombre: string;
  descripcion: string;
  precio: number;
  duracion_minutos: number;
}

export interface PerfilPayload {
  nombre: string;
  correo: string;
  telefono: string;
  contrasena?: string;
}
