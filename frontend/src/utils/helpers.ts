/* ============================================================
   GLOBDE · Utilidades compartidas
   Validaciones, manejo de horarios y formatos
   ============================================================ */

/* ---------- Formato de moneda ---------- */
export const formatoCOP = (valor: number): string =>
  '$' + Math.round(valor).toLocaleString('es-CO') + ' COP';

/* ---------- Fechas ---------- */
export const hoyISO = (): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export const sumarDiasISO = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

type JornadaBarbero = { dia_semana: number; hora_inicio: string; hora_fin: string };

export const generarFranjasJornada = (
  barbero: { hora_apertura: string; hora_cierre: string; horarios?: JornadaBarbero[] },
  fecha: string,
  paso: number,
  duracion: number,
): string[] => {
  const [ano, mes, dia] = fecha.split('-').map(Number);
  const diaSemana = new Date(ano, mes - 1, dia).getDay() || 7;
  const jornadas = barbero.horarios;
  if (jornadas) {
    return jornadas
      .filter((jornada) => jornada.dia_semana === diaSemana)
      .flatMap((jornada) => generarFranjas(jornada.hora_inicio, jornada.hora_fin, paso, duracion));
  }
  return generarFranjas(barbero.hora_apertura, barbero.hora_cierre, paso, duracion);
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const desglosarFecha = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  return {
    diaSemana: DIAS[fecha.getDay()],
    diaSemanaCorto: DIAS[fecha.getDay()].slice(0, 3),
    dia: d,
    mesCorto: MESES[m - 1],
    esHoy: iso === hoyISO(),
  };
};

export const fechaLarga = (iso: string): string => {
  const f = desglosarFecha(iso);
  return `${f.diaSemana} ${f.dia} de ${f.mesCorto}.`;
};

/* ---------- Horas (formato 24h "HH:MM") ---------- */
export const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const aHHMM = (minutos: number): string => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const sumarMinutos = (hhmm: string, minutos: number): string =>
  aHHMM(aMinutos(hhmm) + minutos);

/** Convierte "14:30" -> "2:30 p. m." */
export const hora12 = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
};

/** Rango legible: "2:30 p.m. – 3:10 p.m." */
export const rangoHorario = (inicio: string, fin: string): string =>
  `${hora12(inicio)} – ${hora12(fin)}`;

export const duracionLegible = (minutos: number): string => {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/** Genera franjas horarias de inicio entre apertura y cierre */
export const generarFranjas = (
  apertura: string,
  cierre: string,
  paso = 15,
  duracion = 30
): string[] => {
  const franjas: string[] = [];
  const ini = aMinutos(apertura);
  const fin = aMinutos(cierre);
  for (let t = ini; t + duracion <= fin; t += paso) franjas.push(aHHMM(t));
  return franjas;
};

/**
 * Descarta las franjas que ya pasaron cuando `fecha` es hoy.
 * No tiene sentido ofrecer las 08:00 si ya es la 1 de la tarde.
 * Para fechas futuras devuelve la lista intacta.
 */
export const franjasVigentes = (franjas: string[], fecha: string): string[] => {
  if (fecha !== hoyISO()) return franjas;
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  return franjas.filter((f) => aMinutos(f) > minutosAhora);
};

/** ¿Se cruzan dos rangos horarios? */
// La base de datos guarda el icono de cada servicio como un nombre corto
// ('scissors', 'razor'...), mientras que la interfaz pinta un emoji. Sin esta
// traduccion el paso 1 del asistente mostraba la palabra en crudo.
const EMOJI_POR_ICONO: Record<string, string> = {
  scissors: '\u2702\uFE0F',
  razor: '\uD83E\uDE92',
  beard: '\uD83E\uDDD4',
  combo: '\uD83D\uDC51',
  sparkles: '\u2728',
  child: '\uD83E\uDDD2',
  barber: '\uD83D\uDC88',
  hair: '\uD83D\uDC87',
  color: '\uD83C\uDFA8',
  spa: '\uD83D\uDC86',
  wash: '\uD83E\uDDF4',
  star: '\u2B50',
};

export const emojiDeIcono = (valor: unknown): string => {
  const bruto = String(valor ?? '').trim();
  if (!bruto) return '\u2702\uFE0F';
  // Si ya viene un emoji desde los datos de ejemplo, se respeta tal cual.
  if (!/^[a-z0-9_-]+$/i.test(bruto)) return bruto;
  return EMOJI_POR_ICONO[bruto.toLowerCase()] ?? '\u2702\uFE0F';
};

export const haySolape = (
  aIni: string,
  aFin: string,
  bIni: string,
  bFin: string
): boolean => aMinutos(aIni) < aMinutos(bFin) && aMinutos(bIni) < aMinutos(aFin);

/* ---------- Validaciones de formularios ---------- */
export const validarNombre = (v: string) =>
  /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]{3,80}$/.test(v.trim());

export const validarCorreo = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim());

export const validarTelefono = (v: string) =>
  /^[0-9]{7,15}$/.test(v.replace(/[\s+()-]/g, ''));

/* ---------- Validación de contraseña SEGURA ---------- */
export interface RequisitosPassword {
  longitud: boolean;
  mayuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  especial: boolean;
  sinEspacios: boolean;
}

export interface FuerzaPassword {
  puntaje: number; // 0 a 5
  porcentaje: number;
  etiqueta: string;
  color: string;      // clase de fondo
  colorTexto: string; // clase de texto
  requisitos: RequisitosPassword;
  esSegura: boolean;
}

export const evaluarPassword = (pwd: string): FuerzaPassword => {
  const requisitos: RequisitosPassword = {
    longitud: pwd.length >= 8,
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(pwd),
    minuscula: /[a-záéíóúñ]/.test(pwd),
    numero: /[0-9]/.test(pwd),
    especial: /[^A-Za-z0-9]/.test(pwd),
    sinEspacios: pwd.length > 0 && !/\s/.test(pwd),
  };

  let puntaje = 0;
  if (requisitos.longitud) puntaje++;
  if (requisitos.mayuscula) puntaje++;
  if (requisitos.minuscula) puntaje++;
  if (requisitos.numero) puntaje++;
  if (requisitos.especial) puntaje++;
  if (pwd.length >= 12 && puntaje === 5) puntaje = 5;

  const esSegura =
    requisitos.longitud &&
    requisitos.mayuscula &&
    requisitos.minuscula &&
    requisitos.numero &&
    requisitos.especial &&
    requisitos.sinEspacios;

  const escala = [
    { etiqueta: 'Sin contraseña', color: 'bg-slate-200', colorTexto: 'text-slate-400' },
    { etiqueta: 'Muy débil', color: 'bg-rose-500', colorTexto: 'text-rose-600' },
    { etiqueta: 'Débil', color: 'bg-orange-500', colorTexto: 'text-orange-600' },
    { etiqueta: 'Media', color: 'bg-amber-500', colorTexto: 'text-amber-600' },
    { etiqueta: 'Fuerte', color: 'bg-yellow-500', colorTexto: 'text-yellow-700' },
    { etiqueta: 'Muy fuerte', color: 'bg-emerald-600', colorTexto: 'text-emerald-700' },
  ];
  const nivel = escala[pwd.length === 0 ? 0 : puntaje];

  return {
    puntaje,
    porcentaje: pwd.length === 0 ? 0 : (puntaje / 5) * 100,
    etiqueta: nivel.etiqueta,
    color: nivel.color,
    colorTexto: nivel.colorTexto,
    requisitos,
    esSegura,
  };
};

/* ---------- Códigos ---------- */
export const generarCodigoReserva = (): string =>
  'GLB-' + Math.floor(1000 + Math.random() * 9000);

export const generarCodigoOTP = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

/* ---------- Paginación ---------- */
export interface ResultadoPaginado<T> {
  items: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
}

export const paginar = <T,>(
  lista: T[],
  pagina: number,
  porPagina: number
): ResultadoPaginado<T> => {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * porPagina;
  const items = lista.slice(inicio, inicio + porPagina);
  return {
    items,
    pagina: actual,
    totalPaginas,
    total,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: Math.min(inicio + porPagina, total),
  };
};

/* ---------- Estados de cita ---------- */
export const estiloEstado = (estado: string) => {
  switch (estado) {
    case 'confirmada':
      return { texto: 'Confirmada', clase: 'bg-neutral-100 text-neutral-800 border-neutral-300', punto: 'bg-neutral-800' };
    case 'pendiente':
      return { texto: 'Por confirmar', clase: 'bg-amber-50 text-amber-700 border-amber-200', punto: 'bg-amber-500' };
    case 'en_atencion':
      return { texto: 'En el sillón', clase: 'bg-neutral-900 text-white border-neutral-900', punto: 'bg-amber-400' };
    case 'completada':
      return { texto: 'Completada', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200', punto: 'bg-emerald-500' };
    case 'cancelada':
      return { texto: 'Cancelada', clase: 'bg-rose-50 text-rose-700 border-rose-200', punto: 'bg-rose-500' };
    case 'no_asistio':
      return { texto: 'No asistió', clase: 'bg-slate-100 text-slate-600 border-slate-200', punto: 'bg-slate-400' };
    default:
      return { texto: estado, clase: 'bg-slate-100 text-slate-600 border-slate-200', punto: 'bg-slate-400' };
  }
};

export const nivelPorPuntos = (puntos: number): 'Bronce' | 'Plata' | 'Oro' | 'Diamante' => {
  if (puntos >= 500) return 'Diamante';
  if (puntos >= 250) return 'Oro';
  if (puntos >= 100) return 'Plata';
  return 'Bronce';
};
