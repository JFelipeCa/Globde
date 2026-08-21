import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type {
  Usuario, Barbero, Servicio, Cita, CatalogoCorte, PremioFidelidad,
  EntradaListaEspera, Factura, Testimonio, Notificacion, TipoRol,
  EstadoCita, DatosReserva, Vista,
} from '../types';
import {
  ROL_ADMINISTRADOR, ROL_BARBERO, ROL_CLIENTE,
} from '../types';
import {
  BARBEROS, SERVICIOS, CATALOGO_CORTES, PREMIOS,
  CITAS, LISTA_ESPERA, FACTURAS, TESTIMONIOS, EXTRAS_SERVICIO,
} from '../data/mockData';
import {
  sumarMinutos, haySolape, generarCodigoOTP,
  evaluarPassword, nivelPorPuntos, hoyISO, emojiDeIcono,
} from '../utils/helpers';
import { apiRequest } from '../utils/apiClient';

interface ConfigReserva {
  servicioId?: number;
  barberoId?: number;
  nombreCorte?: string;
}

interface Resultado {
  ok: boolean;
  mensaje: string;
}

interface ContextoApp {
  usuario: Usuario | null;
  citas: Cita[];
  servicios: Servicio[];
  barberos: Barbero[];
  catalogoCortes: CatalogoCorte[];
  premios: PremioFidelidad[];
  listaEspera: EntradaListaEspera[];
  facturas: Factura[];
  testimonios: Testimonio[];
  notificaciones: Notificacion[];

  vista: Vista;
  irA: (v: Vista) => void;
  modalAuth: false | 'login' | 'registro' | 'recuperar';
  abrirAuth: (t: 'login' | 'registro' | 'recuperar') => void;
  cerrarAuth: () => void;
  reservaAbierta: boolean;
  configReserva: ConfigReserva;
  abrirReserva: (c?: ConfigReserva) => void;
  cerrarReserva: () => void;
  quizAbierto: boolean;
  setQuizAbierto: (v: boolean) => void;
  esperaAbierta: boolean;
  setEsperaAbierta: (v: boolean) => void;
  citaTicket: Cita | null;
  esConfirmacionNueva: boolean;
  verTicket: (c: Cita) => void;
  cerrarTicket: () => void;

  login: (correo: string, pwd: string) => Promise<Resultado>;
  registrar: (n: string, c: string, t: string, p: string) => Promise<Resultado>;
  logout: () => void;

  codigoRecuperacion: string | null;
  correoRecuperacion: string | null;
  solicitarCodigo: (correo: string) => Resultado;
  verificarCodigo: (codigo: string) => Resultado;
  restablecerPassword: (nueva: string, confirmar: string) => Resultado;
  limpiarRecuperacion: () => void;

  franjasOcupadas: (fecha: string, barberoId: number) => { inicio: string; fin: string }[];
  franjaDisponible: (fecha: string, barberoId: number, inicio: string, dur: number, ignorarId?: number) => boolean;
  crearCita: (d: DatosReserva) => Promise<Resultado>;
  editarCita: (id: number, cambios: Partial<Pick<Cita, 'fecha' | 'hora_inicio' | 'id_barbero' | 'id_servicio' | 'observaciones' | 'estado'>>) => Resultado;
  cambiarEstadoCita: (id: number, estado: EstadoCita) => void;
  confirmarCita: (id: number) => void;
  cancelarCita: (id: number, motivo: string) => Resultado;
  calificarCita: (id: number, rating: number, comentario: string, etiquetas: string[]) => void;

  canjearPremio: (p: PremioFidelidad) => Resultado;
  unirseListaEspera: (d: Omit<EntradaListaEspera, 'id_espera' | 'creado_en' | 'estado'>) => void;
  agregarServicio: (s: Omit<Servicio, 'id_servicio'>) => void;
  eliminarServicio: (id: number) => void;
  actualizarNivelBarbero: (id: number, nivel: Barbero['nivel'], pct: number) => void;
  alternarDisponibilidad: (id: number) => void;
  notificar: (titulo: string, mensaje: string, tipo?: Notificacion['tipo']) => void;
  difusionMasiva: (titulo: string, mensaje: string) => void;
}

const Ctx = createContext<ContextoApp | undefined>(undefined);
const STORAGE_KEY = 'globde_usuario';

const celebrar = (colores = ['#0A0A0A', '#D4AF37', '#F0D68A', '#ffffff']) => {
  try {
    confetti({ particleCount: 110, spread: 85, origin: { y: 0.45 }, colors: colores, scalar: 1.1 });
  } catch {
    /* noop */
  }
};

function leerUsuarioGuardado(): Usuario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

function mapUsuarioBackend(payload: Record<string, unknown>): Usuario {
  const puntos = typeof payload.puntos === 'number' ? payload.puntos : 150;
  const rol = typeof payload.id_rol === 'number' ? payload.id_rol : ROL_CLIENTE;
  return {
    id_usuario: Number(payload.id_usuario ?? Date.now()),
    nombre: String(payload.nombre ?? 'Usuario Globde'),
    correo: String(payload.correo ?? ''),
    telefono: String(payload.telefono ?? '+57 300 000 0000'),
    id_rol: rol as TipoRol,
    fecha_creacion: String(payload.fecha_creacion ?? hoyISO()),
    puntos,
    nivel_fidelizacion: nivelPorPuntos(puntos),
    avatar_url: String(payload.avatar_url ?? 'https://images.pexels.com/photos/804009/pexels-photo-804009.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200&fm=webp'),
    // PKs reales de `clientes` / `barberos`: el backend las exige al reservar.
    id_cliente: payload.id_cliente != null ? Number(payload.id_cliente) : undefined,
    id_barbero: payload.id_barbero != null ? Number(payload.id_barbero) : undefined,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => leerUsuarioGuardado());
  const [citas, setCitas] = useState<Cita[]>(CITAS);
  const [servicios, setServicios] = useState<Servicio[]>(SERVICIOS);
  const [barberos, setBarberos] = useState<Barbero[]>(BARBEROS);
  const [listaEspera, setListaEspera] = useState<EntradaListaEspera[]>(LISTA_ESPERA);
  const [facturas] = useState<Factura[]>(FACTURAS);
  const [testimonios, setTestimonios] = useState<Testimonio[]>(TESTIMONIOS);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const [vista, setVista] = useState<Vista>('inicio');
  const [modalAuth, setModalAuth] = useState<false | 'login' | 'registro' | 'recuperar'>(false);
  const [reservaAbierta, setReservaAbierta] = useState(false);
  const [configReserva, setConfigReserva] = useState<ConfigReserva>({});
  const [quizAbierto, setQuizAbierto] = useState(false);
  const [esperaAbierta, setEsperaAbierta] = useState(false);
  const [citaTicket, setCitaTicket] = useState<Cita | null>(null);
  const [esConfirmacionNueva, setEsConfirmacionNueva] = useState(false);

  const [codigoRecuperacion, setCodigoRecuperacion] = useState<string | null>(null);
  const [correoRecuperacion, setCorreoRecuperacion] = useState<string | null>(null);

  useEffect(() => {
    if (usuario) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [usuario]);

  useEffect(() => {
    const cargarDatosBackend = async () => {
      try {
        const datos = await apiRequest<Record<string, unknown>>('/datos');
        const usuariosBackend = Array.isArray(datos.usuarios) ? datos.usuarios : [];
        const serviciosBackend = Array.isArray(datos.servicios) ? datos.servicios : [];
        const citasBackend = Array.isArray(datos.citas) ? datos.citas : [];
        const barberosBackend = Array.isArray(datos.usuarios) ? datos.usuarios.filter((u: Record<string, unknown>) => Number(u.id_rol) === ROL_BARBERO) : [];
        const rankingBackend = Array.isArray(datos.ranking_barberos) ? datos.ranking_barberos : [];
        const clientesBackend = Array.isArray(datos.clientes) ? datos.clientes : [];
        const horariosBackend = Array.isArray(datos.horarios_barberos) ? datos.horarios_barberos : [];
        const barberoServicioBackend = Array.isArray(datos.barbero_servicio) ? datos.barbero_servicio : [];

        if (serviciosBackend.length) {
          setServicios(serviciosBackend.map((s: Record<string, unknown>, index: number) => ({
            id_servicio: Number(s.id_servicio ?? index + 1),
            nombre: String(s.nombre ?? `Servicio ${index + 1}`),
            categoria: String(s.categoria ?? 'Cortes') as Servicio['categoria'],
            descripcion: String(s.descripcion ?? 'Servicio disponible en Globde.'),
            precio: Number(s.precio ?? 20000),
            duracion_minutos: Number(s.duracion_minutos ?? 30),
            popular: Boolean(s.popular),
            icono: emojiDeIcono(s.icono),
            imagen_url: String(s.imagen_url ?? 'https://images.pexels.com/photos/34702982/pexels-photo-34702982.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=420&w=640&fm=webp'),
            puntos_otorga: Number(s.puntos_otorga ?? 20),
            activo: s.activo !== false,
          })));
        }

        if (barberosBackend.length) {
          setBarberos(barberosBackend.map((u: Record<string, unknown>, index: number) => {
            const ranking = rankingBackend.find((r: Record<string, unknown>) => Number(r.id_usuario) === Number(u.id_usuario)) as Record<string, unknown> | undefined;
            const puntos = Number(u.puntos ?? 150);
            // OJO: id_barbero es la PK de la tabla `barberos` y NO coincide con
            // id_usuario (el usuario 2 es el barbero 1). El backend espera esta.
            const idBarbero = Number(u.id_barbero ?? index + 1);
            const jornadas = horariosBackend
              .filter((h: Record<string, unknown>) => Number(h.id_barbero) === idBarbero)
              .map((h: Record<string, unknown>) => ({
                dia_semana: Number(h.dia_semana),
                hora_inicio: String(h.hora_inicio ?? '08:00'),
                hora_fin: String(h.hora_fin ?? '20:00'),
              }));
            const aperturas = jornadas.map((j) => j.hora_inicio).sort();
            const cierres = jornadas.map((j) => j.hora_fin).sort();
            const serviciosIds = barberoServicioBackend
              .filter((r: Record<string, unknown>) => Number(r.id_barbero) === idBarbero)
              .map((r: Record<string, unknown>) => Number(r.id_servicio));
            return {
              id_barbero: idBarbero,
              id_usuario: Number(u.id_usuario ?? index + 1),
              nombre: String(u.nombre ?? `Barbero ${index + 1}`),
              rol_titulo: String(u.rol_titulo ?? 'Barbero certificado'),
              nivel: String(ranking?.nivel ?? (puntos >= 250 ? 'Oro' : 'Plata')) as Barbero['nivel'],
              experiencia_anos: Number(u.experiencia_anos ?? 4),
              rating: Number(u.rating ?? 4.8),
              total_resenas: Number(u.total_resenas ?? 120),
              especialidades: Array.isArray(u.especialidades) ? u.especialidades.map(String) : ['Corte profesional'],
              foto_url: String(u.foto_url ?? u.avatar_url ?? 'https://images.pexels.com/photos/12304510/pexels-photo-12304510.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp'),
              disponible_hoy: true,
              hora_apertura: aperturas[0] ?? '08:00',
              hora_cierre: cierres[cierres.length - 1] ?? '20:00',
              porcentaje_incremento: Number(ranking?.porcentaje_incremento ?? 10),
              citas_completadas: Number(ranking?.total_citas ?? 0),
              bio: String(u.bio ?? 'Barbero certificado de Globde.'),
              color: '#D4AF37',
              horarios: jornadas,
              servicios_ids: serviciosIds,
            };
          }));
        }

        if (citasBackend.length) {
          const serviciosMap = new Map(serviciosBackend.map((s: Record<string, unknown>) => [Number(s.id_servicio), s]));
          const usuariosMap = new Map(usuariosBackend.map((u: Record<string, unknown>) => [Number(u.id_usuario), u]));
          const clientesMap = new Map(clientesBackend.map((c: Record<string, unknown>) => [Number(c.id_usuario), c]));
          setCitas(citasBackend.map((c: Record<string, unknown>, index: number) => {
            const servicio = serviciosMap.get(Number(c.id_servicio)) as Record<string, unknown> | undefined;
            const barbero = usuariosMap.get(Number(c.id_usuario)) as Record<string, unknown> | undefined;
            // Las franjas ocupadas se cruzan por id_barbero, no por id_usuario.
            const cliente = clientesMap.get(Number(c.id_cliente)) as Record<string, unknown> | undefined ?? usuariosMap.get(Number(c.id_cliente));
            const inicio = String(c.hora ?? '12:00');
            const duracion = Number(servicio?.duracion_minutos ?? 30);
            const fin = sumarMinutos(inicio, duracion);
            return {
              id_cita: Number(c.id_cita ?? index + 1),
              codigo_reserva: `GLB-${String(c.id_cita ?? index + 1).padStart(4, '0')}`,
              id_cliente: Number(c.id_cliente ?? 0),
              cliente_nombre: String(cliente?.nombre ?? 'Cliente Globde'),
              cliente_telefono: String(cliente?.telefono ?? '+57 300 000 0000'),
              cliente_correo: String(cliente?.correo ?? 'cliente@globde.com'),
              id_barbero: Number(c.id_barbero ?? 0),
              barbero_nombre: String(barbero?.nombre ?? 'Barbero Globde'),
              id_servicio: Number(c.id_servicio ?? 1),
              servicio_nombre: String(servicio?.nombre ?? 'Servicio'),
              precio_total: Number(servicio?.precio ?? 20000),
              descuento_aplicado: 0,
              puntos_canjeados: 0,
              fecha: String(c.fecha ?? hoyISO()),
              hora_inicio: inicio,
              hora_fin: fin,
              duracion_minutos: duracion,
              estado: String(c.estado ?? 'confirmada') as Cita['estado'],
              observaciones: String(c.observaciones ?? ''),
              extras: [],
              creado_en: String(c.creado_en ?? new Date().toLocaleString('es-CO')),
              metodo_pago: 'Por definir',
            } as Cita;
          }));
        }

        if (usuariosBackend.length && !usuario) {
          const primerUsuario = mapUsuarioBackend(usuariosBackend[0] as Record<string, unknown>);
          setUsuario(primerUsuario);
        }
      } catch {
        notificar('Conexión de backend no disponible', 'Se mantendrá el modo demo con datos locales.', 'sistema');
      }
    };

    cargarDatosBackend();
  }, []);

  const notificar = useCallback(
    (titulo: string, mensaje: string, tipo: Notificacion['tipo'] = 'sistema') => {
      const nueva: Notificacion = {
        id: 'n' + Date.now() + Math.random(),
        titulo,
        mensaje,
        tipo,
        fecha: 'ahora',
      };
      setNotificaciones((prev) => [nueva, ...prev].slice(0, 4));
      setTimeout(() => {
        setNotificaciones((prev) => prev.filter((n) => n.id !== nueva.id));
      }, 5200);
    },
    []
  );

  const irA = (v: Vista) => {
    setVista(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const abrirAuth = (t: 'login' | 'registro' | 'recuperar') => setModalAuth(t);
  const cerrarAuth = () => setModalAuth(false);

  const abrirReserva = (c: ConfigReserva = {}) => {
    setConfigReserva(c);
    setReservaAbierta(true);
  };
  const cerrarReserva = () => {
    setReservaAbierta(false);
    setConfigReserva({});
  };

  const verTicket = (c: Cita) => {
    setEsConfirmacionNueva(false);
    setCitaTicket(c);
  };
  const cerrarTicket = () => {
    setCitaTicket(null);
    setEsConfirmacionNueva(false);
  };

  const irAPanel = (rol: TipoRol) => {
    if (rol === ROL_ADMINISTRADOR) irA('panel-admin');
    else if (rol === ROL_BARBERO) irA('panel-barbero');
    else irA('panel-cliente');
  };

  const login = async (correo: string, pwd: string): Promise<Resultado> => {
    if (!correo.trim() || !pwd) return { ok: false, mensaje: 'Ingresa tu correo y contraseña.' };
    try {
      const perfil = await apiRequest<Record<string, unknown>>('/login', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim(), contrasena: pwd }),
      });
      const usuarioLogueado = mapUsuarioBackend(perfil);
      setUsuario(usuarioLogueado);
      setModalAuth(false);
      irAPanel(usuarioLogueado.id_rol);
      notificar(`¡Hola de nuevo, ${usuarioLogueado.nombre.split(' ')[0]}!`, 'Tu sesión se inició correctamente.', 'sistema');
      return { ok: true, mensaje: 'Sesión iniciada' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
      return { ok: false, mensaje };
    }
  };

  const registrar = async (nombre: string, correo: string, telefono: string, pwd: string): Promise<Resultado> => {
    const fuerza = evaluarPassword(pwd);
    if (!fuerza.esSegura) {
      return { ok: false, mensaje: 'La contraseña no cumple los requisitos de seguridad.' };
    }
    try {
      const response = await apiRequest<Record<string, unknown>>('/clientes', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), telefono: telefono.trim(), contrasena: pwd }),
      });
      const nuevo: Usuario = {
        id_usuario: Number(response.id_usuario ?? Date.now()),
        nombre: String(response.nombre ?? nombre.trim()),
        correo: String(response.correo ?? correo.trim().toLowerCase()),
        telefono: String(response.telefono ?? telefono.trim()),
        id_rol: ROL_CLIENTE,
        fecha_creacion: hoyISO(),
        puntos: 150,
        nivel_fidelizacion: 'Plata',
        avatar_url: 'https://images.pexels.com/photos/14564834/pexels-photo-14564834.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200&fm=webp',
      };
      setUsuario(nuevo);
      setModalAuth(false);
      irA('panel-cliente');
      celebrar();
      notificar('¡Bienvenido al Club Globde! 🎉', 'Recibiste 150 puntos de regalo por registrarte.', 'puntos');
      return { ok: true, mensaje: 'Cuenta creada' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo crear la cuenta';
      return { ok: false, mensaje };
    }
  };

  const logout = () => {
    setUsuario(null);
    irA('inicio');
    notificar('Sesión cerrada', 'Esperamos verte pronto de nuevo.', 'sistema');
  };

  const solicitarCodigo = (correo: string): Resultado => {
    const codigo = generarCodigoOTP();
    setCodigoRecuperacion(codigo);
    setCorreoRecuperacion(correo.trim().toLowerCase());
    notificar('Código enviado 📧', `Enviamos un código de 6 dígitos a ${correo}.`, 'sistema');
    return { ok: true, mensaje: codigo };
  };

  const verificarCodigo = (codigo: string): Resultado => {
    if (codigo.trim() === codigoRecuperacion) return { ok: true, mensaje: 'Código verificado' };
    return { ok: false, mensaje: 'El código ingresado no es válido o ya expiró.' };
  };

  const restablecerPassword = (nueva: string, confirmar: string): Resultado => {
    const fuerza = evaluarPassword(nueva);
    if (!fuerza.esSegura) return { ok: false, mensaje: 'La nueva contraseña no cumple los requisitos de seguridad.' };
    if (nueva !== confirmar) return { ok: false, mensaje: 'Las contraseñas no coinciden.' };
    setCodigoRecuperacion(null);
    notificar('Contraseña actualizada ✅', 'Ya puedes iniciar sesión con tu nueva contraseña.', 'sistema');
    return { ok: true, mensaje: 'Contraseña restablecida correctamente' };
  };

  const limpiarRecuperacion = () => {
    setCodigoRecuperacion(null);
    setCorreoRecuperacion(null);
  };

  const franjasOcupadas = useCallback(
    (fecha: string, barberoId: number) =>
      citas
        .filter((c) => c.fecha === fecha && c.id_barbero === barberoId && c.estado !== 'cancelada' && c.estado !== 'no_asistio')
        .map((c) => ({ inicio: c.hora_inicio, fin: c.hora_fin })),
    [citas]
  );

  const franjaDisponible = useCallback(
    (fecha: string, barberoId: number, inicio: string, dur: number, ignorarId?: number) => {
      const fin = sumarMinutos(inicio, dur);
      return !citas.some(
        (c) =>
          c.id_cita !== ignorarId &&
          c.fecha === fecha &&
          c.id_barbero === barberoId &&
          c.estado !== 'cancelada' &&
          c.estado !== 'no_asistio' &&
          haySolape(inicio, fin, c.hora_inicio, c.hora_fin)
      );
    },
    [citas]
  );

  const crearCita = async (d: DatosReserva): Promise<Resultado> => {
    const servicio = servicios.find((s) => s.id_servicio === d.servicio_id) ?? servicios[0];
    const barbero = barberos.find((b) => b.id_barbero === d.barbero_id) ?? barberos[0];
    const minutosExtras = d.extras.reduce((acc, e) => acc + (EXTRAS_SERVICIO.find((x) => x.id === e)?.minutos ?? 0), 0);
    const duracion = servicio.duracion_minutos + minutosExtras;
    const horaFin = sumarMinutos(d.hora_inicio, duracion);

    if (!franjaDisponible(d.fecha, barbero.id_barbero, d.hora_inicio, duracion)) {
      return { ok: false, mensaje: 'Ese rango horario ya está ocupado. Elige otra franja disponible.' };
    }

    // El backend exige la PK de `clientes`. Antes se enviaba id_usuario con 999
    // de respaldo y respondia 404 "El cliente no existe".
    if (!usuario?.id_cliente) {
      return {
        ok: false,
        mensaje: usuario
          ? 'Tu perfil no tiene una ficha de cliente asociada. Inicia sesión con una cuenta de cliente para reservar.'
          : 'Inicia sesión como cliente para confirmar la reserva.',
      };
    }

    try {
      const response = await apiRequest<Record<string, unknown>>('/citas', {
        method: 'POST',
        body: JSON.stringify({
          id_cliente: usuario.id_cliente,
          id_barbero: barbero.id_barbero,
          id_servicio: servicio.id_servicio,
          fecha: d.fecha,
          hora_inicio: d.hora_inicio,
          estado: 'confirmada',
          observaciones: d.observaciones,
        }),
      });
      const nueva: Cita = {
        id_cita: Number(response.id_cita ?? Date.now()),
        codigo_reserva: `GLB-${String(response.id_cita ?? Date.now()).padStart(4, '0')}`,
        id_cliente: Number(response.id_cliente ?? usuario.id_cliente),
        cliente_nombre: d.nombre || usuario?.nombre || 'Cliente',
        cliente_telefono: d.telefono || usuario?.telefono || '',
        cliente_correo: d.correo || usuario?.correo || '',
        id_barbero: barbero.id_barbero,
        barbero_nombre: barbero.nombre,
        id_servicio: servicio.id_servicio,
        servicio_nombre: servicio.nombre,
        precio_total: servicio.precio,
        descuento_aplicado: 0,
        puntos_canjeados: 0,
        fecha: d.fecha,
        hora_inicio: d.hora_inicio,
        hora_fin: horaFin,
        duracion_minutos: duracion,
        estado: 'confirmada',
        observaciones: d.observaciones,
        extras: d.extras,
        creado_en: new Date().toLocaleString('es-CO'),
        metodo_pago: 'Por definir en el local',
      };
      setCitas((prev) => [nueva, ...prev]);
      setCitaTicket(nueva);
      setEsConfirmacionNueva(true);
      cerrarReserva();
      notificar('¡Cita confirmada! 💈', `${nueva.codigo_reserva} · ${nueva.fecha} de ${nueva.hora_inicio} a ${nueva.hora_fin}`, 'cita');
      return { ok: true, mensaje: 'Cita creada correctamente' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo crear la cita';
      return { ok: false, mensaje };
    }
  };

  const editarCita = (
    id: number,
    cambios: Partial<Pick<Cita, 'fecha' | 'hora_inicio' | 'id_barbero' | 'id_servicio' | 'observaciones' | 'estado'>>
  ): Resultado => {
    const actual = citas.find((c) => c.id_cita === id);
    if (!actual) return { ok: false, mensaje: 'No se encontró la cita.' };
    if (actual.estado === 'completada') return { ok: false, mensaje: 'Una cita completada no se puede editar; solo consultar su detalle.' };

    const servicio = servicios.find((s) => s.id_servicio === (cambios.id_servicio ?? actual.id_servicio)) ?? servicios[0];
    const barbero = barberos.find((b) => b.id_barbero === (cambios.id_barbero ?? actual.id_barbero)) ?? barberos[0];
    const fecha = cambios.fecha ?? actual.fecha;
    const inicio = cambios.hora_inicio ?? actual.hora_inicio;
    const duracion = servicio.duracion_minutos;
    const fin = sumarMinutos(inicio, duracion);

    if (!franjaDisponible(fecha, barbero.id_barbero, inicio, duracion, id)) {
      return { ok: false, mensaje: 'El barbero ya tiene otra cita en ese rango horario.' };
    }

    setCitas((prev) =>
      prev.map((c) =>
        c.id_cita === id
          ? {
              ...c,
              fecha,
              hora_inicio: inicio,
              hora_fin: fin,
              duracion_minutos: duracion,
              id_barbero: barbero.id_barbero,
              barbero_nombre: barbero.nombre,
              id_servicio: servicio.id_servicio,
              servicio_nombre: servicio.nombre,
              precio_total: servicio.precio,
              observaciones: cambios.observaciones ?? c.observaciones,
              estado: cambios.estado ?? c.estado,
            }
          : c
      )
    );
    notificar('Cita actualizada ✏️', `${actual.codigo_reserva} quedó para el ${fecha} de ${inicio} a ${fin}.`, 'cita');
    return { ok: true, mensaje: 'Cita actualizada correctamente' };
  };

  const cambiarEstadoCita = (id: number, estado: EstadoCita) => {
    setCitas((prev) => prev.map((c) => (c.id_cita === id ? { ...c, estado } : c)));
    const cita = citas.find((c) => c.id_cita === id);
    if (!cita) return;
    const textos: Record<string, string> = {
      confirmada: 'Cita confirmada correctamente.',
      en_atencion: `${cita.cliente_nombre} está en el sillón.`,
      completada: 'Servicio finalizado con éxito.',
      cancelada: 'La cita fue cancelada.',
      no_asistio: 'Se registró la inasistencia del cliente.',
    };
    notificar('Estado actualizado', textos[estado] ?? 'Estado modificado.', 'cita');
  };

  const confirmarCita = (id: number) => {
    setCitas((prev) => prev.map((c) => (c.id_cita === id ? { ...c, estado: 'confirmada' } : c)));
    notificar('Cita confirmada ✅', 'Se notificó al cliente por correo y WhatsApp.', 'cita');
  };

  const cancelarCita = (id: number, motivo: string): Resultado => {
    const cita = citas.find((c) => c.id_cita === id);
    if (!cita) return { ok: false, mensaje: 'Cita no encontrada.' };
    if (cita.estado === 'completada') return { ok: false, mensaje: 'No se puede cancelar una cita ya completada.' };

    setCitas((prev) =>
      prev.map((c) =>
        c.id_cita === id
          ? { ...c, estado: 'cancelada', observaciones: `${c.observaciones ? c.observaciones + ' · ' : ''}Cancelada: ${motivo}` }
          : c
      )
    );
    notificar('Cita cancelada', `${cita.codigo_reserva} liberó su turno. Sin penalidad.`, 'cita');
    return { ok: true, mensaje: 'Tu cita fue cancelada correctamente.' };
  };

  const calificarCita = (id: number, rating: number, comentario: string, etiquetas: string[]) => {
    const cita = citas.find((c) => c.id_cita === id);
    setCitas((prev) => prev.map((c) => (c.id_cita === id ? { ...c, resena: { rating, comentario, etiquetas, fecha: hoyISO() } } : c)));
    if (cita) {
      setTestimonios((prev) => [
        {
          id: Date.now(),
          nombre: cita.cliente_nombre,
          rol: 'Cliente verificado',
          texto: comentario,
          rating,
          barbero_favorito: cita.barbero_nombre,
          avatar_url: usuario?.avatar_url ?? 'https://images.pexels.com/photos/804009/pexels-photo-804009.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=140&w=140&fm=webp',
          corte: cita.servicio_nombre,
          fecha: 'Reciente',
        },
        ...prev,
      ]);
    }
    if (usuario) {
      const puntos = usuario.puntos + 15;
      setUsuario({ ...usuario, puntos, nivel_fidelizacion: nivelPorPuntos(puntos) });
    }
    celebrar(['#D4AF37', '#0A0A0A']);
    notificar('¡Gracias por tu reseña! ⭐', 'Sumaste 15 puntos Globde a tu cuenta.', 'puntos');
  };

  const canjearPremio = (p: PremioFidelidad): Resultado => {
    if (!usuario) {
      setModalAuth('login');
      return { ok: false, mensaje: 'Inicia sesión para canjear tus puntos.' };
    }
    if (usuario.puntos < p.costo_puntos) {
      return { ok: false, mensaje: `Te faltan ${p.costo_puntos - usuario.puntos} puntos para este beneficio.` };
    }
    const puntos = usuario.puntos - p.costo_puntos;
    setUsuario({ ...usuario, puntos, nivel_fidelizacion: nivelPorPuntos(puntos) });
    celebrar(['#F0C75E', '#C79A2E', '#ffffff']);
    notificar(`Premio canjeado ${p.icono}`, `Presenta el código GLB-${Math.floor(100 + Math.random() * 900)} en caja.`, 'puntos');
    return { ok: true, mensaje: `¡Canjeaste "${p.titulo}"! Te quedan ${puntos} puntos.` };
  };

  const unirseListaEspera = (d: Omit<EntradaListaEspera, 'id_espera' | 'creado_en' | 'estado'>) => {
    setListaEspera((prev) => [{ ...d, id_espera: Date.now(), estado: 'en_espera', creado_en: new Date().toLocaleString('es-CO') }, ...prev]);
    setEsperaAbierta(false);
    notificar('Estás en la lista de espera ⏳', 'Te avisaremos apenas se libere un turno en tu franja.', 'sistema');
  };

  const agregarServicio = (s: Omit<Servicio, 'id_servicio'>) => {
    setServicios((prev) => [...prev, { ...s, id_servicio: Date.now() }]);
    notificar('Servicio creado ✂️', `"${s.nombre}" ya aparece en el catálogo.`, 'sistema');
  };

  const eliminarServicio = (id: number) => {
    setServicios((prev) => prev.filter((s) => s.id_servicio !== id));
    notificar('Servicio eliminado', 'El servicio salió del catálogo público.', 'sistema');
  };

  const actualizarNivelBarbero = (id: number, nivel: Barbero['nivel'], pct: number) => {
    setBarberos((prev) => prev.map((b) => (b.id_barbero === id ? { ...b, nivel, porcentaje_incremento: pct } : b)));
    notificar('Ranking actualizado 🏆', 'Se aplicó el nuevo nivel y comisión del barbero.', 'sistema');
  };

  const alternarDisponibilidad = (id: number) => {
    setBarberos((prev) => prev.map((b) => (b.id_barbero === id ? { ...b, disponible_hoy: !b.disponible_hoy } : b)));
  };

  const difusionMasiva = (titulo: string, mensaje: string) => notificar(`📢 ${titulo}`, mensaje, 'promo');

  return (
    <Ctx.Provider
      value={{
        usuario,
        citas,
        servicios,
        barberos,
        catalogoCortes: CATALOGO_CORTES,
        premios: PREMIOS,
        listaEspera,
        facturas,
        testimonios,
        notificaciones,
        vista,
        irA,
        modalAuth,
        abrirAuth,
        cerrarAuth,
        reservaAbierta,
        configReserva,
        abrirReserva,
        cerrarReserva,
        quizAbierto,
        setQuizAbierto,
        esperaAbierta,
        setEsperaAbierta,
        citaTicket,
        esConfirmacionNueva,
        verTicket,
        cerrarTicket,
        login,
        registrar,
        logout,
        codigoRecuperacion,
        correoRecuperacion,
        solicitarCodigo,
        verificarCodigo,
        restablecerPassword,
        limpiarRecuperacion,
        franjasOcupadas,
        franjaDisponible,
        crearCita,
        editarCita,
        cambiarEstadoCita,
        confirmarCita,
        cancelarCita,
        calificarCita,
        canjearPremio,
        unirseListaEspera,
        agregarServicio,
        eliminarServicio,
        actualizarNivelBarbero,
        alternarDisponibilidad,
        notificar,
        difusionMasiva,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp debe usarse dentro de AppProvider');
  return c;
};
