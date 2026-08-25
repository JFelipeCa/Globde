import type {
  Usuario, Barbero, Servicio, Cita, CatalogoCorte, PremioFidelidad,
  EntradaListaEspera, Factura, Testimonio,
} from '../types';
import {
  ROL_ADMINISTRADOR, ROL_BARBERO, ROL_CLIENTE,
} from '../types';
import { hoyISO, sumarDiasISO } from '../utils/helpers';

export const USUARIOS: Usuario[] = [
  {
    id_usuario: 1, nombre: 'Juan Felipe Cañón', correo: 'admin@globde.com',
    telefono: '+57 312 456 7890', id_rol: ROL_ADMINISTRADOR, fecha_creacion: '2025-01-10',
    avatar_url: 'https://images.pexels.com/photos/14564834/pexels-photo-14564834.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200&fm=webp',
    puntos: 950, nivel_fidelizacion: 'Diamante',
  },
  {
    id_usuario: 2, nombre: 'Carlos Méndez', correo: 'carlos@globde.com',
    telefono: '+57 300 987 6543', id_rol: ROL_BARBERO, fecha_creacion: '2025-01-15',
    avatar_url: 'https://images.pexels.com/photos/12304510/pexels-photo-12304510.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=200&fm=webp',
    puntos: 420, nivel_fidelizacion: 'Oro',
  },
  {
    id_usuario: 3, nombre: 'Andrés Salgado', correo: 'andres@globde.com',
    telefono: '+57 315 234 5678', id_rol: ROL_BARBERO, fecha_creacion: '2025-02-01',
    avatar_url: 'https://images.pexels.com/photos/19664860/pexels-photo-19664860.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=200&fm=webp',
    puntos: 280, nivel_fidelizacion: 'Oro',
  },
  {
    id_usuario: 4, nombre: 'Diego Castillo', correo: 'diego@gmail.com',
    telefono: '+57 310 888 9911', id_rol: ROL_CLIENTE, fecha_creacion: '2025-02-12',
    avatar_url: 'https://images.pexels.com/photos/804009/pexels-photo-804009.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200&fm=webp',
    puntos: 185, nivel_fidelizacion: 'Plata',
  },
];

export const BARBEROS: Barbero[] = [
  {
    id_barbero: 1, id_usuario: 2, nombre: 'Carlos Méndez',
    rol_titulo: 'Master Barber & Estilista Senior', nivel: 'Master',
    experiencia_anos: 8, rating: 4.95, total_resenas: 248,
    especialidades: ['Skin Fade', 'Diseño a navaja', 'Barba terapéutica'],
    foto_url: 'https://images.pexels.com/photos/12304510/pexels-photo-12304510.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp',
    disponible_hoy: true, hora_apertura: '08:00', hora_cierre: '19:00',
    porcentaje_incremento: 20, citas_completadas: 612,
    bio: 'Especialista en degradado milimétrico y visagismo facial. Ganador del Barber Battle Bogotá 2024.',
    color: '#1A1A1A',
  },
  {
    id_barbero: 2, id_usuario: 3, nombre: 'Andrés Salgado',
    rol_titulo: 'Especialista en Fade & Barba', nivel: 'Oro',
    experiencia_anos: 5, rating: 4.88, total_resenas: 164,
    especialidades: ['Taper Fade', 'Ritual toalla caliente', 'Texturizado'],
    foto_url: 'https://images.pexels.com/photos/19664860/pexels-photo-19664860.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp',
    disponible_hoy: true, hora_apertura: '09:00', hora_cierre: '20:00',
    porcentaje_incremento: 10, citas_completadas: 420,
    bio: 'Experto en tendencias urbanas, texturas modernas y cuidado integral de barba.',
    color: '#C79A2E',
  },
  {
    id_barbero: 3, id_usuario: 6, nombre: 'Ricardo Peña',
    rol_titulo: 'Barbero Clásico & Colorista', nivel: 'Plata',
    experiencia_anos: 4, rating: 4.79, total_resenas: 98,
    especialidades: ['Corte clásico', 'Pompadour', 'Color y mechas'],
    foto_url: 'https://images.pexels.com/photos/33461079/pexels-photo-33461079.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp',
    disponible_hoy: true, hora_apertura: '10:00', hora_cierre: '19:00',
    porcentaje_incremento: 0, citas_completadas: 290,
    bio: 'Dedicado al arte del corte tradicional con toques contemporáneos y colorimetría masculina.',
    color: '#8A7346',
  },
];

export const SERVICIOS: Servicio[] = [
  {
    id_servicio: 1, nombre: 'Corte Degradado (Skin Fade)', categoria: 'Cortes',
    descripcion: 'Degradado milimétrico a piel con definición a navaja, lavado revitalizante y peinado texturizado.',
    precio: 25000, duracion_minutos: 40, popular: true, icono: '💈',
    imagen_url: 'https://images.pexels.com/photos/12464840/pexels-photo-12464840.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 25, activo: true,
  },
  {
    id_servicio: 2, nombre: 'Corte Clásico Tijera & Máquina', categoria: 'Cortes',
    descripcion: 'Corte tradicional elegante pulido con tijera japonesa, contornos limpios y fijación natural.',
    precio: 20000, duracion_minutos: 30, icono: '✂️',
    imagen_url: 'https://images.pexels.com/photos/9971240/pexels-photo-9971240.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 20, activo: true,
  },
  {
    id_servicio: 3, nombre: 'Ritual de Barba & Afeitado Spa', categoria: 'Barba',
    descripcion: 'Perfilado a navaja esterilizada, doble toalla caliente aromática, aceites y bálsamo revitalizante.',
    precio: 18000, duracion_minutos: 25, popular: true, icono: '🪒',
    imagen_url: 'https://images.pexels.com/photos/12464837/pexels-photo-12464837.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 20, activo: true,
  },
  {
    id_servicio: 4, nombre: 'Combo Master Globde', categoria: 'Combos',
    descripcion: 'Corte degradado + perfilado de barba + toalla caliente con aromaterapia + mascarilla de carbón.',
    precio: 42000, duracion_minutos: 60, popular: true, icono: '👑',
    imagen_url: 'https://images.pexels.com/photos/34702982/pexels-photo-34702982.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 45, activo: true,
  },
  {
    id_servicio: 5, nombre: 'Corte Infantil Globde Kids', categoria: 'Infantil',
    descripcion: 'Corte paciente para niños menores de 12 años, con líneas de diseño opcionales y golosina.',
    precio: 18000, duracion_minutos: 25, icono: '🧒',
    imagen_url: 'https://images.pexels.com/photos/4625626/pexels-photo-4625626.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 18, activo: true,
  },
  {
    id_servicio: 6, nombre: 'Colorimetría & Platinado', categoria: 'Tratamientos',
    descripcion: 'Tintes premium sin amoniaco, decoloración platinada o camuflaje discreto de canas.',
    precio: 55000, duracion_minutos: 80, icono: '🎨',
    imagen_url: 'https://images.pexels.com/photos/14781974/pexels-photo-14781974.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 50, activo: true,
  },
  {
    id_servicio: 7, nombre: 'Spa Capilar & Mascarilla', categoria: 'Tratamientos',
    descripcion: 'Exfoliación del cuero cabelludo con sales minerales, tónico anticaída y masaje relajante.',
    precio: 22000, duracion_minutos: 25, icono: '💆',
    imagen_url: 'https://images.pexels.com/photos/12706272/pexels-photo-12706272.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp',
    puntos_otorga: 22, activo: true,
  },
];

export const CATALOGO_CORTES: CatalogoCorte[] = [
  {
    id_corte: 1, nombre: 'Mid Skin Fade + Crop Texturizado', categoria: 'Fade & Degradados',
    descripcion: 'Degradado medio limpio a navaja con parte superior desfilada para volumen y textura.',
    imagen_url: 'https://images.pexels.com/photos/12464840/pexels-photo-12464840.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=640&w=640&fm=webp',
    tags: ['Tendencia 2026', 'Fácil de peinar', 'Urbano'], popularidad: 98,
    barbero_recomendado: 'Carlos Méndez', duracion_minutos: 40, precio_sugerido: 25000,
  },
  {
    id_corte: 2, nombre: 'Low Taper con Barba Integrada', categoria: 'Barbas & Perfilado',
    descripcion: 'Transición suave en patillas y nuca que se fusiona con una barba densa y perfilada.',
    imagen_url: 'https://images.pexels.com/photos/12706272/pexels-photo-12706272.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=640&w=640&fm=webp',
    tags: ['Elegante', 'Barba full', 'Ejecutivo'], popularidad: 96,
    barbero_recomendado: 'Andrés Salgado', duracion_minutos: 50, precio_sugerido: 35000,
  },
  {
    id_corte: 3, nombre: 'Pompadour Moderno con Drop Fade', categoria: 'Clásicos & Elegantes',
    descripcion: 'Inspiración clásica de los 50 reinventada con caída curva y fijación mate duradera.',
    imagen_url: 'https://images.pexels.com/photos/14564834/pexels-photo-14564834.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=640&w=640&fm=webp',
    tags: ['Caballero', 'Volumen', 'Formal'], popularidad: 91,
    barbero_recomendado: 'Ricardo Peña', duracion_minutos: 45, precio_sugerido: 28000,
  },
  {
    id_corte: 4, nombre: 'Buzz Cut con Line-up a Navaja', categoria: 'Estilos Urbanos',
    descripcion: 'Corte rasurado al ras con contornos rectilíneos y diseño geométrico minimalista.',
    imagen_url: 'https://images.pexels.com/photos/14781974/pexels-photo-14781974.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=640&w=640&fm=webp',
    tags: ['Minimalista', 'Cero mantenimiento'], popularidad: 89,
    barbero_recomendado: 'Carlos Méndez', duracion_minutos: 30, precio_sugerido: 22000,
  },
  {
    id_corte: 5, nombre: 'Modern Mullet con Fade Lateral', categoria: 'Color & Tendencia',
    descripcion: 'Estilo vanguardista con laterales despejados y parte trasera fluida, el más viral del año.',
    imagen_url: 'https://images.pexels.com/photos/15418106/pexels-photo-15418106.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=640&w=640&fm=webp',
    tags: ['Vanguardista', 'Viral'], popularidad: 94,
    barbero_recomendado: 'Andrés Salgado', duracion_minutos: 45, precio_sugerido: 27000,
  },
  {
    id_corte: 6, nombre: 'Platinado Polar con High Fade', categoria: 'Color & Tendencia',
    descripcion: 'Decoloración tono hielo con matizador anti-amarillo y degradado alto ultra pulido.',
    imagen_url: 'https://images.pexels.com/photos/7045174/pexels-photo-7045174.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=640&w=640&fm=webp',
    tags: ['Color platinum', 'Alto impacto'], popularidad: 88,
    barbero_recomendado: 'Ricardo Peña', duracion_minutos: 90, precio_sugerido: 60000,
  },
];

export const PREMIOS: PremioFidelidad[] = [
  { id_premio: 1, titulo: 'Café expreso o bebida de cortesía', descripcion: 'Disfruta una bebida premium durante tu servicio.', costo_puntos: 40, icono: '☕', categoria: 'cortesia' },
  { id_premio: 2, titulo: 'Toalla caliente & spa facial exprés', descripcion: 'Añade toalla aromatizada con eucalipto y exfoliación.', costo_puntos: 75, icono: '🧖', categoria: 'servicio' },
  { id_premio: 3, titulo: '20% de descuento en tu próxima cita', descripcion: 'Descuento inmediato sobre el total del servicio.', costo_puntos: 120, icono: '🎟️', categoria: 'descuento' },
  { id_premio: 4, titulo: 'Cera mate profesional Globde Pro', descripcion: 'Llévate a casa nuestra cera de arcilla de acabado mate.', costo_puntos: 180, icono: '🧴', categoria: 'producto' },
  { id_premio: 5, titulo: 'Perfilado de barba 100% gratis', descripcion: 'Servicio completo de perfilado a navaja sin costo.', costo_puntos: 220, icono: '🪒', categoria: 'servicio' },
  { id_premio: 6, titulo: 'Combo Master Globde gratis', descripcion: 'Corte + barba + spa facial totalmente gratis.', costo_puntos: 380, icono: '👑', categoria: 'servicio' },
];

const HOY = hoyISO();
const MANANA = sumarDiasISO(1);
const HACE_3 = sumarDiasISO(-3);

export const CITAS: Cita[] = [
  {
    id_cita: 101, codigo_reserva: 'GLB-8942', id_cliente: 4,
    cliente_nombre: 'Diego Castillo', cliente_telefono: '+57 310 888 9911', cliente_correo: 'diego@gmail.com',
    id_barbero: 1, barbero_nombre: 'Carlos Méndez', id_servicio: 1, servicio_nombre: 'Corte Degradado (Skin Fade)',
    precio_total: 25000, descuento_aplicado: 0, puntos_canjeados: 0,
    fecha: HOY, hora_inicio: '11:00', hora_fin: '11:40', duracion_minutos: 40,
    estado: 'confirmada', observaciones: 'Fade medio bien comprimido, por favor.',
    extras: ['Lavado premium'], creado_en: '2026-03-01 14:20', metodo_pago: 'Nequi',
  },
  {
    id_cita: 102, codigo_reserva: 'GLB-8943', id_cliente: 5,
    cliente_nombre: 'Sofía Herrera', cliente_telefono: '+57 320 555 4433', cliente_correo: 'sofia@gmail.com',
    id_barbero: 2, barbero_nombre: 'Andrés Salgado', id_servicio: 4, servicio_nombre: 'Combo Master Globde',
    precio_total: 37800, descuento_aplicado: 4200, puntos_canjeados: 50,
    fecha: HOY, hora_inicio: '15:00', hora_fin: '16:00', duracion_minutos: 60,
    estado: 'en_atencion', observaciones: 'Incluye arreglo de barba.',
    extras: ['Mascarilla de carbón'], creado_en: '2026-03-02 09:10', metodo_pago: 'Tarjeta',
  },
  {
    id_cita: 103, codigo_reserva: 'GLB-8944', id_cliente: 4,
    cliente_nombre: 'Diego Castillo', cliente_telefono: '+57 310 888 9911', cliente_correo: 'diego@gmail.com',
    id_barbero: 2, barbero_nombre: 'Andrés Salgado', id_servicio: 3, servicio_nombre: 'Ritual de Barba & Afeitado Spa',
    precio_total: 18000, descuento_aplicado: 0, puntos_canjeados: 0,
    fecha: HACE_3, hora_inicio: '16:30', hora_fin: '16:55', duracion_minutos: 25,
    estado: 'completada', observaciones: 'Excelente servicio, como siempre.',
    extras: [], creado_en: '2026-02-25 18:00', metodo_pago: 'Efectivo',
    resena: {
      rating: 5, comentario: 'Andrés es un profesional de otro nivel: toalla caliente impecable y filo perfecto.',
      etiquetas: ['Puntualidad', 'Navaja perfecta'], fecha: HACE_3,
    },
  },
  {
    id_cita: 104, codigo_reserva: 'GLB-8945', id_cliente: 7,
    cliente_nombre: 'Mateo Gómez', cliente_telefono: '+57 301 222 3344', cliente_correo: 'mateo@gmail.com',
    id_barbero: 1, barbero_nombre: 'Carlos Méndez', id_servicio: 4, servicio_nombre: 'Combo Master Globde',
    precio_total: 42000, descuento_aplicado: 0, puntos_canjeados: 0,
    fecha: MANANA, hora_inicio: '10:00', hora_fin: '11:00', duracion_minutos: 60,
    estado: 'pendiente', observaciones: 'Primera visita, revisar forma de rostro.',
    extras: ['Toalla caliente'], creado_en: '2026-03-03 11:30', metodo_pago: 'Daviplata',
  },
  {
    id_cita: 105, codigo_reserva: 'GLB-8946', id_cliente: 8,
    cliente_nombre: 'Laura Cepeda', cliente_telefono: '+57 305 111 2233', cliente_correo: 'laura@gmail.com',
    id_barbero: 1, barbero_nombre: 'Carlos Méndez', id_servicio: 2, servicio_nombre: 'Corte Clásico Tijera & Máquina',
    precio_total: 20000, descuento_aplicado: 0, puntos_canjeados: 0,
    fecha: HOY, hora_inicio: '13:30', hora_fin: '14:00', duracion_minutos: 30,
    estado: 'pendiente', observaciones: '', extras: [], creado_en: '2026-03-03 08:05',
  },
  {
    id_cita: 106, codigo_reserva: 'GLB-8947', id_cliente: 9,
    cliente_nombre: 'Esteban Ríos', cliente_telefono: '+57 318 444 5566', cliente_correo: 'esteban@gmail.com',
    id_barbero: 1, barbero_nombre: 'Carlos Méndez', id_servicio: 3, servicio_nombre: 'Ritual de Barba & Afeitado Spa',
    precio_total: 18000, descuento_aplicado: 0, puntos_canjeados: 0,
    fecha: HOY, hora_inicio: '17:00', hora_fin: '17:25', duracion_minutos: 25,
    estado: 'confirmada', observaciones: 'Barba corta definida.', extras: [], creado_en: '2026-03-02 20:40',
  },
];

export const LISTA_ESPERA: EntradaListaEspera[] = [
  {
    id_espera: 1, id_cliente: 4, nombre_cliente: 'Mateo Gómez', telefono: '+57 301 222 3344',
    id_servicio: 1, servicio_nombre: 'Corte Degradado (Skin Fade)', id_barbero: 1,
    barbero_nombre: 'Carlos Méndez', fecha_deseada: HOY, franja_horaria: 'tarde',
    estado: 'en_espera', creado_en: '2026-03-03 08:30',
    observaciones: 'Disponible si se cancela algún turno entre 2 y 6 p.m.',
  },
];

export const FACTURAS: Factura[] = [
  {
    id_factura: 1, numero_factura: 'FAC-2026-0089', id_cita: 103, cliente_nombre: 'Diego Castillo',
    barbero_nombre: 'Andrés Salgado', servicio_nombre: 'Ritual de Barba & Afeitado Spa',
    subtotal: 18000, descuento: 0, total: 18000, metodo_pago: 'Efectivo', fecha: HACE_3, estado_pago: 'pagado',
  },
  {
    id_factura: 2, numero_factura: 'FAC-2026-0090', id_cita: 102, cliente_nombre: 'Sofía Herrera',
    barbero_nombre: 'Andrés Salgado', servicio_nombre: 'Combo Master Globde',
    subtotal: 42000, descuento: 4200, total: 37800, metodo_pago: 'Tarjeta', fecha: HOY, estado_pago: 'pagado',
  },
];

export const TESTIMONIOS: Testimonio[] = [
  {
    id: 1, nombre: 'Diego Castillo', rol: 'Cliente frecuente · Nivel Plata',
    texto: 'El agendamiento de Globde es el más fluido que he probado. Llegas y tu sillón ya está listo, sin esperar ni cinco minutos.',
    rating: 5, barbero_favorito: 'Carlos Méndez',
    avatar_url: 'https://images.pexels.com/photos/804009/pexels-photo-804009.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=140&w=140&fm=webp',
    corte: 'Mid Skin Fade', fecha: 'Hace 3 días',
  },
  {
    id: 2, nombre: 'Sofía Herrera', rol: 'Cliente VIP · Nivel Oro',
    texto: 'El sistema de puntos es genial: ya canjeé dos spa faciales y un arreglo de barba. La ambientación del local es 10/10.',
    rating: 5, barbero_favorito: 'Andrés Salgado',
    avatar_url: 'https://images.pexels.com/photos/15485088/pexels-photo-15485088.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=140&w=140&fm=webp',
    corte: 'Combo Master', fecha: 'Hace 1 semana',
  },
  {
    id: 3, nombre: 'Esteban Ríos', rol: 'Cliente frecuente',
    texto: 'Carlos es un crack con la navaja. Se nota el detalle en cada paso de la experiencia Globde.',
    rating: 5, barbero_favorito: 'Carlos Méndez',
    avatar_url: 'https://images.pexels.com/photos/6409119/pexels-photo-6409119.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=140&w=140&fm=webp',
    corte: 'Taper Fade + barba', fecha: 'Hace 2 semanas',
  },
  {
    id: 4, nombre: 'Camilo Arango', rol: 'Cliente nuevo',
    texto: 'El catálogo visual me ayudó a decidir el corte según mi rostro. El resultado superó lo que esperaba.',
    rating: 5, barbero_favorito: 'Ricardo Peña',
    avatar_url: 'https://images.pexels.com/photos/14564834/pexels-photo-14564834.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=140&w=140&fm=webp',
    corte: 'Pompadour clásico', fecha: 'Hace 3 semanas',
  },
];

export const EXTRAS_SERVICIO = [
  { id: 'Lavado premium', icono: '🫧', precio: 6000, minutos: 10 },
  { id: 'Toalla caliente', icono: '🧖', precio: 6000, minutos: 10 },
  { id: 'Mascarilla de carbón', icono: '✨', precio: 6000, minutos: 10 },
  { id: 'Perfilado de cejas', icono: '🪒', precio: 6000, minutos: 5 },
];
