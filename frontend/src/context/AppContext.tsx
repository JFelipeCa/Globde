import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type {
  Usuario, Barbero, Servicio, Cita, CatalogoCorte, PremioFidelidad,
  EntradaListaEspera, Factura, Testimonio, Notificacion, TipoRol,
  EstadoCita, DatosReserva, Vista, ClienteBusqueda,
} from '../types';
import {
  ROL_ADMINISTRADOR, ROL_BARBERO, ROL_CLIENTE,
} from '../types';
import {
  CATALOGO_CORTES, PREMIOS,
  LISTA_ESPERA, FACTURAS, TESTIMONIOS, EXTRAS_SERVICIO,
} from '../data/mockData';
import {
  sumarMinutos, haySolape, generarCodigoOTP,
  evaluarPassword, nivelPorPuntos, hoyISO, emojiDeIcono,
} from '../utils/helpers';
import { apiRequest } from '../utils/apiClient';
import {
  guardarSesion,
  limpiarSesion,
  obtenerAccessToken,
} from '../utils/session';

interface ConfigReserva {
  servicioId?: number;
  barberoId?: number;
  nombreCorte?: string;
}

interface Resultado {
  ok: boolean;
  mensaje: string;
}

type TipoReporte = 'ingresos' | 'citas' | 'clientes';

const descargarCSV = (nombre: string, filas: Record<string, unknown>[]) => {
  if (!filas.length) throw new Error('El reporte no contiene datos para descargar.');
  const columnas = [...new Set(filas.flatMap((fila) => Object.keys(fila)))];
  const escapar = (valor: unknown) => {
    const texto = valor == null ? '' : String(valor);
    return `"${texto.replaceAll('"', '""')}"`;
  };
  const contenido = [
    columnas.map(escapar).join(','),
    ...filas.map((fila) => columnas.map((columna) => escapar(fila[columna])).join(',')),
  ].join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8' }));
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
};

interface ResultadoCliente extends Resultado {
  idCliente?: number;
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
  crearClientePresencial: (nombre: string, telefono: string) => Promise<ResultadoCliente>;
  buscarClientes: (texto: string) => Promise<ClienteBusqueda[]>;
  editarCita: (id: number, cambios: Partial<Pick<Cita, 'fecha' | 'hora_inicio' | 'id_barbero' | 'id_servicio' | 'observaciones' | 'estado'>>) => Promise<Resultado>;
  cambiarEstadoCita: (id: number, estado: EstadoCita) => void;
  confirmarCita: (id: number) => void;
  cancelarCita: (id: number, motivo: string) => Promise<Resultado>;
  calificarCita: (id: number, rating: number, comentario: string, etiquetas: string[]) => Promise<Resultado>;
  actualizarAvatar: (archivo: File) => Promise<Resultado>;
  descargarReporte: (tipo: TipoReporte) => Promise<Resultado>;

  canjearPremio: (p: PremioFidelidad) => Promise<Resultado>;
  unirseListaEspera: (d: Omit<EntradaListaEspera, 'id_espera' | 'creado_en' | 'estado'>) => void;
  agregarServicio: (s: Omit<Servicio, 'id_servicio'>) => Promise<Resultado>;
  eliminarServicio: (id: number) => Promise<Resultado>;
  actualizarNivelBarbero: (id: number, nivel: Barbero['nivel'], pct: number) => void;
  alternarDisponibilidad: (id: number) => void;
  notificar: (titulo: string, mensaje: string, tipo?: Notificacion['tipo']) => void;
  difusionMasiva: (titulo: string, mensaje: string) => Promise<Resultado>;
}

const Ctx = createContext<ContextoApp | undefined>(undefined);

const celebrar = (colores = ['#0A0A0A', '#D4AF37', '#F0D68A', '#ffffff']) => {
  try {
    confetti({ particleCount: 110, spread: 85, origin: { y: 0.45 }, colors: colores, scalar: 1.1 });
  } catch {
    /* noop */
  }
};

function mapUsuarioBackend(payload: Record<string, unknown>): Usuario {
  const puntos =
    typeof payload.puntos_saldo === 'number'
      ? payload.puntos_saldo
      : typeof payload.puntos === 'number'
        ? payload.puntos
        : 0;

  const rol =
    typeof payload.id_rol === 'number'
      ? payload.id_rol
      : ROL_CLIENTE;

  return {
    id_usuario: Number(payload.id_usuario ?? Date.now()),
    nombre: String(payload.nombre ?? 'Usuario Globde'),
    correo: String(payload.correo ?? ''),
    telefono: String(payload.telefono ?? '+57 300 000 0000'),
    id_rol: rol as TipoRol,
    fecha_creacion: String(payload.fecha_creacion ?? hoyISO()),
    avatar_url: typeof payload.avatar_url === 'string' ? payload.avatar_url : undefined,
    puntos,
    nivel_fidelizacion: nivelPorPuntos(puntos),
    id_cliente:
      payload.id_cliente != null
        ? Number(payload.id_cliente)
        : undefined,
    id_barbero:
      payload.id_barbero != null
        ? Number(payload.id_barbero)
        : undefined,
  };
}

// Convierte la respuesta CitaOut de la API v2 al tipo `Cita` que usa la UI.
// La API devuelve ya los nombres (cliente_nombre, barbero_nombre, servicio_nombre),
// asi que el mapeo no depende de tablas auxiliares del frontend.
function mapCitaApi(c: Record<string, unknown>): Cita {
  const inicio = String(c.hora_inicio ?? '12:00');
  const fin = String(c.hora_fin ?? sumarMinutos(inicio, Number(c.servicio_duracion_minutos ?? 30)));
  return {
    id_cita: Number(c.id_cita ?? 0),
    codigo_reserva: String(c.codigo_reserva ?? `GLB-${String(c.id_cita ?? 0).padStart(4, '0')}`),
    id_cliente: Number(c.id_cliente ?? 0),
    cliente_nombre: String(c.cliente_nombre ?? 'Cliente Globde'),
    cliente_telefono: String(c.cliente_telefono ?? ''),
    cliente_correo: String(c.cliente_correo ?? ''),
    id_barbero: Number(c.id_barbero ?? 0),
    barbero_nombre: String(c.barbero_nombre ?? 'Barbero Globde'),
    id_servicio: Number(c.id_servicio ?? 1),
    servicio_nombre: String(c.servicio_nombre ?? 'Servicio'),
    precio_total: Number(c.precio_total ?? 0),
    descuento_aplicado: Number(c.descuento_aplicado ?? 0),
    puntos_canjeados: Number(c.puntos_canjeados ?? 0),
    fecha: String(c.fecha ?? hoyISO()),
    hora_inicio: inicio,
    hora_fin: fin,
    duracion_minutos: Number(c.servicio_duracion_minutos ?? 30),
    estado: (c.estado as EstadoCita) ?? 'pendiente',
    observaciones: String(c.observaciones ?? ''),
    extras: [],
    creado_en: String(c.creado_en ?? new Date().toLocaleString('es-CO')),
    metodo_pago: c.estado_pago ? 'Pagado en el local' : 'Por definir en el local',
  };
}

// Convierte ServicioOut de la API v2 al tipo `Servicio` de la UI.
function mapServicioApi(s: Record<string, unknown>, index: number): Servicio {
  return {
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
  };
}

// Convierte BarberoOut + su detalle (horarios/servicios de /barberos/{id}) +
// ranking a el tipo `Barbero` de la UI.
function mapBarberoApi(u: Record<string, unknown>, detalle: Record<string, unknown>, ranking: Record<string, unknown> | undefined, index: number): Barbero {
  const puntos = Number(u.puntos ?? 150);
  const jornadas: { dia_semana: number; hora_inicio: string; hora_fin: string }[] = (
    Array.isArray(detalle.horarios) ? detalle.horarios : []
  ).map((h: Record<string, unknown>) => ({
    dia_semana: Number(h.dia_semana),
    hora_inicio: String(h.hora_inicio ?? '08:00'),
    hora_fin: String(h.hora_fin ?? '20:00'),
  }));
  const serviciosIds: number[] = (
    Array.isArray(detalle.servicios) ? detalle.servicios : []
  ).map((sv: unknown) =>
    typeof sv === 'object'
      ? Number((sv as Record<string, unknown>).id_servicio ?? (sv as Record<string, unknown>).id ?? 0)
      : Number(sv)
  ).filter((x) => x > 0);
  const especialidades = Array.isArray(detalle.servicios)
    ? detalle.servicios.map((sv: unknown) => String((sv as Record<string, unknown>).nombre ?? '')).filter(Boolean)
    : ['Corte profesional'];
  const aperturas = jornadas.map((j) => j.hora_inicio).sort();
  const cierres = jornadas.map((j) => j.hora_fin).sort();
  return {
    id_barbero: Number(u.id_barbero ?? index + 1),
    id_usuario: Number(u.id_usuario ?? index + 1),
    nombre: String(u.nombre ?? `Barbero ${index + 1}`),
    rol_titulo: String(u.titulo ?? 'Barbero certificado'),
    nivel: String(ranking?.nivel ?? (puntos >= 250 ? 'Oro' : 'Plata')) as Barbero['nivel'],
    experiencia_anos: Number(u.experiencia_anios ?? 4),
    rating: Number(u.rating ?? 4.8),
    total_resenas: Number(u.total_resenas ?? 120),
    especialidades,
    foto_url: String(u.foto_url ?? 'https://images.pexels.com/photos/12304510/pexels-photo-12304510.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=600&fm=webp'),
    disponible_hoy: Boolean(u.disponible ?? true),
    hora_apertura: aperturas[0] ?? '08:00',
    hora_cierre: cierres[cierres.length - 1] ?? '20:00',
    porcentaje_incremento: Number(ranking?.porcentaje_incremento ?? 10),
    citas_completadas: Number(u.citas_completadas ?? ranking?.total_citas ?? 0),
    bio: String(u.bio ?? 'Barbero certificado de Globde.'),
    color: String(u.color ?? '#D4AF37'),
    horarios: jornadas,
    servicios_ids: serviciosIds,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
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
  const restaurarSesion = async () => {
    // Si no hay token, el visitante no tiene sesión iniciada.
    if (!obtenerAccessToken()) return;

    try {
      // El backend valida el JWT y devuelve el perfil real.
      const perfil = await apiRequest<Record<string, unknown>>('/auth/me');

      setUsuario(mapUsuarioBackend(perfil));
    } catch {
      // Si el token venció, es inválido o el backend lo rechaza,
      // limpiamos la sesión del navegador.
      limpiarSesion();
      setUsuario(null);
    }
  };

  void restaurarSesion();
}, []);

  // Carga inicial desde la API v2 (sin el endpoint legacy /datos):
  //   - servicios y barberos son públicos (sin token).
  //   - la agenda/citas requiere sesión y se carga según el rol del token.
  // Si el backend no responde, la UI falla explícito en vez de mostrar datos ficticios.
  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const [servicios, barberos, ranking] = await Promise.all([
          apiRequest<Record<string, unknown>[]>('/servicios'),
          apiRequest<Record<string, unknown>[]>('/barberos'),
          apiRequest<Record<string, unknown>[]>('/barberos/ranking').catch(() => [] as Record<string, unknown>[]),
        ]);

        if (Array.isArray(servicios) && servicios.length) {
          const listaServicios = servicios as Record<string, unknown>[];
          setServicios(listaServicios.map((s, index) => mapServicioApi(s, index)));
        }

        if (Array.isArray(barberos) && barberos.length) {
          const listaBarberos = barberos as Record<string, unknown>[];
          // Cada perfil trae horarios y servicios que presta (GET /barberos/{id}).
          const detalles = await Promise.all(
            listaBarberos.map((b) =>
              apiRequest<Record<string, unknown>>(`/barberos/${Number(b.id_barbero)}`).catch(() => ({}))
            )
          );
          const rankingLista = Array.isArray(ranking) ? ranking : [];
          setBarberos(listaBarberos.map((u, index) => {
            const rankingBarbero = rankingLista.find((r) => Number((r as Record<string, unknown>).id_usuario) === Number(u.id_usuario)) as Record<string, unknown> | undefined;
            return mapBarberoApi(u, detalles[index] ?? {}, rankingBarbero, index);
          }));
        }
      } catch (error) {
        // Sin backend no hay catálogo veraz: lo marcamos explícito y dejamos
        // el catálogo vacío para que la UI avise, en vez de inventar datos.
        console.warn('No se pudo cargar el catálogo desde la API.', error);
      }
    };

    void cargarCatalogo();
  }, []);

  // Carga las citas según la sesión activa (rol del token). Reintenta al entrar.
  useEffect(() => {
    const cargarCitas = async () => {
      if (!obtenerAccessToken()) return;
      try {
        // GET /citas aplica el filtro por rol en el backend: el cliente ve las
        // suyas, el barbero sus citas y el administrador todas.
        const data = await apiRequest<Record<string, unknown>>('/citas?por_pagina=100');
        const items = (Array.isArray(data.items) ? data.items : []) as Record<string, unknown>[];
        if (items.length) setCitas(items.map(mapCitaApi));
      } catch (error) {
        console.warn('No se pudieron cargar las citas.', error);
      }
    };
    void cargarCitas();
  }, [usuario?.id_usuario]);

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
    // El asistente publico de reserva (BookingWizard) esta pensado solo para
    // clientes: no tiene forma de elegir a nombre de que cliente se agenda.
    // Si un admin/barbero llega aqui (por cualquiera de los botones "Reservar
    // cita" repartidos en Navbar/Landing/Extras), lo mandamos a su propio
    // panel, donde ya existe un flujo de agendamiento manual con selector de
    // cliente en vez de abrir un formulario que no va a poder completar.
    if (usuario && usuario.id_rol !== ROL_CLIENTE) {
      irAPanel(usuario.id_rol);
      return;
    }
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

  const login = async (
  correo: string,
  pwd: string,
): Promise<Resultado> => {
  if (!correo.trim() || !pwd) {
    return {
      ok: false,
      mensaje: 'Ingresa tu correo y contraseña.',
    };
  }

  try {
    // Usa la API v2, que retorna tokens y el perfil.
    const respuesta = await apiRequest<Record<string, unknown>>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          correo: correo.trim(),
          contrasena: pwd,
        }),
      },
    );

    const accessToken = String(respuesta.access_token ?? '');
    const refreshToken = String(respuesta.refresh_token ?? '');

    if (!accessToken || !refreshToken || !respuesta.usuario) {
      throw new Error('El servidor no devolvió una sesión válida.');
    }

    guardarSesion(accessToken, refreshToken);

    const usuarioLogueado = mapUsuarioBackend(
      respuesta.usuario as Record<string, unknown>,
    );

    setUsuario(usuarioLogueado);
    setModalAuth(false);
    irAPanel(usuarioLogueado.id_rol);

    notificar(
      `¡Hola de nuevo, ${usuarioLogueado.nombre.split(' ')[0]}!`,
      'Tu sesión se inició correctamente.',
      'sistema',
    );

    return { ok: true, mensaje: 'Sesión iniciada' };
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo iniciar sesión';

    return { ok: false, mensaje };
  }
};

  const registrar = async (nombre: string, correo: string, telefono: string, pwd: string): Promise<Resultado> => {
    const fuerza = evaluarPassword(pwd);
    if (!fuerza.esSegura) {
      return { ok: false, mensaje: 'La contraseña no cumple los requisitos de seguridad.' };
    }
    try {
      const response = await apiRequest<Record<string, unknown>>('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), telefono: telefono.trim(), contrasena: pwd }),
      });
      const accessToken = String(response.access_token ?? '');
      const refreshToken = String(response.refresh_token ?? '');
      
      if (!accessToken || !refreshToken || !response.usuario) {
        throw new Error('El servidor no devolvió una sesión válida.');
      }
      
      guardarSesion(accessToken, refreshToken);
      const nuevo = mapUsuarioBackend(
        response.usuario as Record<string, unknown>,
      );
      
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
  limpiarSesion();
  setUsuario(null);
  irA('inicio');
  notificar(
    'Sesión cerrada',
    'Esperamos verte pronto de nuevo.',
    'sistema',
  );
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

  const buscarClientes = useCallback(async (texto: string): Promise<ClienteBusqueda[]> => {
    const t = texto.trim();
    if (t.length < 2) return [];
    const respuesta = await apiRequest<{ items: ClienteBusqueda[] }>(
      `/clientes?buscar=${encodeURIComponent(t)}&por_pagina=8`,
    );
    return respuesta.items ?? [];
  }, []);

  const crearClientePresencial = async (nombre: string, telefono: string): Promise<ResultadoCliente> => {
    try {
      const respuesta = await apiRequest<Record<string, unknown>>('/clientes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          correo: `presencial+${Date.now()}@globde.com`,
        }),
      });
      const idCliente = Number(respuesta.id_cliente ?? 0);
      if (!idCliente) throw new Error('El servidor no devolvió el cliente creado.');
      return { ok: true, mensaje: 'Cliente creado', idCliente };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo registrar el cliente';
      return { ok: false, mensaje };
    }
  };

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
    // Un cliente siempre reserva para si mismo (usuario.id_cliente). Un admin o
    // barbero registrando una cita manual/presencial debe indicar explicitamente
    // el id_cliente del titular (d.id_cliente), obtenido de un buscador de clientes.
    const idClienteFinal = usuario?.id_rol === ROL_CLIENTE ? usuario.id_cliente : (d.id_cliente ?? usuario?.id_cliente);
    if (!idClienteFinal) {
      return {
        ok: false,
        mensaje: usuario && usuario.id_rol !== ROL_CLIENTE
          ? 'Selecciona el cliente para el que se agenda la cita.'
          : usuario
            ? 'Tu perfil no tiene una ficha de cliente asociada. Inicia sesión con una cuenta de cliente para reservar.'
            : 'Inicia sesión como cliente para confirmar la reserva.',
      };
    }

    try {
      const response = await apiRequest<Record<string, unknown>>('/citas', {
        method: 'POST',
        body: JSON.stringify({
          id_cliente: idClienteFinal,
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
        id_cliente: Number(response.id_cliente ?? idClienteFinal),
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

  const editarCita = async (
    id: number,
    cambios: Partial<Pick<Cita, 'fecha' | 'hora_inicio' | 'id_barbero' | 'id_servicio' | 'observaciones' | 'estado'>>
  ): Promise<Resultado> => {
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

    try {
      // Contrato v2: PUT /api/citas/{id} (CitaUpdate). Estado se gestiona por separado.
      const respuesta = await apiRequest<Record<string, unknown>>(`/citas/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          id_barbero: barbero.id_barbero,
          id_servicio: servicio.id_servicio,
          fecha,
          hora_inicio: inicio,
          observaciones: cambios.observaciones ?? actual.observaciones,
        }),
      });
      setCitas((prev) => prev.map((c) => (c.id_cita === id ? mapCitaApi(respuesta) : c)));
      notificar('Cita actualizada ✏️', `${actual.codigo_reserva} quedó para el ${fecha} de ${inicio} a ${fin}.`, 'cita');
      return { ok: true, mensaje: 'Cita actualizada correctamente' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo actualizar la cita';
      return { ok: false, mensaje };
    }
  };

  // PATCH /api/citas/{id}/estado { estado, motivo }. La UI se sincroniza con la
  // respuesta del servidor; si el backend lo rechaza, se notifica y no se miente.
  const cambiarEstadoCita = (id: number, estado: EstadoCita) => {
    const cita = citas.find((c) => c.id_cita === id);
    const texto = ({
      confirmada: 'Cita confirmada correctamente.',
      en_atencion: `${cita?.cliente_nombre ?? 'El cliente'} está en el sillón.`,
      completada: 'Servicio finalizado con éxito.',
      cancelada: 'La cita fue cancelada.',
      no_asistio: 'Se registró la inasistencia del cliente.',
    } as Record<string, string>)[estado] ?? 'Estado modificado.';

    apiRequest<Record<string, unknown>>(`/citas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado, motivo: null }),
    })
      .then((respuesta) => {
        setCitas((prev) => prev.map((c) => (c.id_cita === id ? mapCitaApi(respuesta) : c)));
        notificar('Estado actualizado', texto, 'cita');
      })
      .catch((error) => {
        notificar('No se pudo actualizar', error instanceof Error ? error.message : 'El servidor rechazó el cambio de estado.', 'error');
      });
  };

  const confirmarCita = (id: number) => {
    apiRequest<Record<string, unknown>>(`/citas/${id}/confirmar`, { method: 'POST' })
      .then((respuesta) => {
        setCitas((prev) => prev.map((c) => (c.id_cita === id ? mapCitaApi(respuesta) : c)));
        notificar('Cita confirmada ✅', 'Se notificó al cliente por correo y WhatsApp.', 'cita');
      })
      .catch((error) => {
        notificar('No se pudo confirmar', error instanceof Error ? error.message : 'El servidor rechazó la confirmación.', 'error');
      });
  };

  const cancelarCita = async (id: number, motivo: string): Promise<Resultado> => {
    const cita = citas.find((c) => c.id_cita === id);
    if (!cita) return { ok: false, mensaje: 'Cita no encontrada.' };
    if (cita.estado === 'completada') return { ok: false, mensaje: 'No se puede cancelar una cita ya completada.' };

    try {
      // Contrato v2: POST /api/citas/{id}/cancelar { motivo }.
      const respuesta = await apiRequest<Record<string, unknown>>(`/citas/${id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      setCitas((prev) => prev.map((c) => (c.id_cita === id ? mapCitaApi(respuesta) : c)));
      notificar('Cita cancelada', `${cita.codigo_reserva} liberó su turno. Sin penalidad.`, 'cita');
      return { ok: true, mensaje: 'Tu cita fue cancelada correctamente.' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo cancelar la cita';
      return { ok: false, mensaje };
    }
  };

  // POST /api/resenas { id_cita, calificacion, comentario }. La calificación
  // queda persistida en el backend; la UI actualiza la reseña local optimista.
  const calificarCita = async (id: number, rating: number, comentario: string, etiquetas: string[]): Promise<Resultado> => {
    const cita = citas.find((c) => c.id_cita === id);
    if (!cita) return { ok: false, mensaje: 'No se encontró la cita.' };
    try {
      await apiRequest<Record<string, unknown>>('/resenas', {
        method: 'POST',
        body: JSON.stringify({ id_cita: id, calificacion: rating, comentario }),
      });
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
            avatar_url: '',
            corte: cita.servicio_nombre,
            fecha: 'Reciente',
          },
          ...prev,
        ]);
      }
      celebrar(['#D4AF37', '#0A0A0A']);
      notificar('¡Gracias por tu reseña! ⭐', 'Tu valoración se guardó correctamente.', 'puntos');
      return { ok: true, mensaje: 'Reseña guardada' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar la reseña';
      notificar('No se pudo guardar la reseña', mensaje, 'error');
      return { ok: false, mensaje };
    }
  };

  const actualizarAvatar = async (archivo: File): Promise<Resultado> => {
    try {
      const formulario = new FormData();
      formulario.append('archivo', archivo);
      const respuesta = await apiRequest<Record<string, unknown>>('/usuarios/me/avatar', {
        method: 'POST',
        body: formulario,
      });
      setUsuario((actual) => actual ? { ...actual, avatar_url: String(respuesta.avatar_url ?? '') } : actual);
      notificar('Foto actualizada', 'Tu foto de perfil se guardó correctamente.', 'sistema');
      return { ok: true, mensaje: 'Foto actualizada' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo actualizar la foto';
      return { ok: false, mensaje };
    }
  };

  const canjearPremio = async (p: PremioFidelidad): Promise<Resultado> => {
    if (!usuario) {
      setModalAuth('login');
      return { ok: false, mensaje: 'Inicia sesión para canjear tus puntos.' };
    }
    if (usuario.puntos < p.costo_puntos) {
      return { ok: false, mensaje: `Te faltan ${p.costo_puntos - usuario.puntos} puntos para este beneficio.` };
    }
    try {
      const respuesta = await apiRequest<Record<string, unknown>>('/puntos/canjear', {
        method: 'POST',
        body: JSON.stringify({ puntos: p.costo_puntos, descripcion: p.titulo }),
      });
      const saldo = Number(respuesta.puntos_saldo ?? usuario.puntos - p.costo_puntos);
      setUsuario({
        ...usuario,
        puntos: saldo,
        nivel_fidelizacion: String(respuesta.nivel_fidelizacion ?? nivelPorPuntos(saldo)) as Usuario['nivel_fidelizacion'],
      });
      celebrar(['#F0C75E', '#C79A2E', '#ffffff']);
      notificar(`Premio canjeado ${p.icono}`, `Presenta el código GLB-${Math.floor(100 + Math.random() * 900)} en caja.`, 'puntos');
      return { ok: true, mensaje: `¡Canjeaste "${p.titulo}"! Te quedan ${saldo} puntos.` };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo canjear el premio';
      return { ok: false, mensaje };
    }
  };

  const unirseListaEspera = (d: Omit<EntradaListaEspera, 'id_espera' | 'creado_en' | 'estado'>) => {
    setListaEspera((prev) => [{ ...d, id_espera: Date.now(), estado: 'en_espera', creado_en: new Date().toLocaleString('es-CO') }, ...prev]);
    setEsperaAbierta(false);
    notificar('Estás en la lista de espera ⏳', 'Te avisaremos apenas se libere un turno en tu franja.', 'sistema');
  };

  const agregarServicio = async (s: Omit<Servicio, 'id_servicio'>): Promise<Resultado> => {
    try {
      const respuesta = await apiRequest<Record<string, unknown>>('/servicios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: s.nombre,
          categoria: s.categoria,
          descripcion: s.descripcion,
          precio: s.precio,
          duracion_minutos: s.duracion_minutos,
          icono: s.icono,
          imagen_url: s.imagen_url,
          puntos_otorga: s.puntos_otorga,
          popular: Boolean(s.popular),
        }),
      });
      setServicios((prev) => [...prev, mapServicioApi(respuesta, prev.length)]);
      notificar('Servicio creado ✂️', `"${s.nombre}" ya aparece en el catálogo.`, 'sistema');
      return { ok: true, mensaje: 'Servicio creado' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo crear el servicio';
      return { ok: false, mensaje };
    }
  };

  const eliminarServicio = async (id: number): Promise<Resultado> => {
    try {
      await apiRequest<Record<string, unknown>>(`/servicios/${id}`, { method: 'DELETE' });
      setServicios((prev) => prev.filter((s) => s.id_servicio !== id));
      notificar('Servicio eliminado', 'El servicio salió del catálogo público.', 'sistema');
      return { ok: true, mensaje: 'Servicio eliminado' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo eliminar el servicio';
      return { ok: false, mensaje };
    }
  };

  const actualizarNivelBarbero = (id: number, nivel: Barbero['nivel'], pct: number) => {
    setBarberos((prev) => prev.map((b) => (b.id_barbero === id ? { ...b, nivel, porcentaje_incremento: pct } : b)));
    notificar('Ranking actualizado 🏆', 'Se aplicó el nuevo nivel y comisión del barbero.', 'sistema');
  };

  const alternarDisponibilidad = (id: number) => {
    setBarberos((prev) => prev.map((b) => (b.id_barbero === id ? { ...b, disponible_hoy: !b.disponible_hoy } : b)));
  };

  // HU-022 / CU-22 — Envio de notificaciones masivas. Crea el aviso en el
  // backend (POST /notificaciones/masiva) para que persista y se notifique a
  // todos los clientes, en lugar de solo mostrar un toast local.
  const difusionMasiva = useCallback(
    async (titulo: string, mensaje: string): Promise<Resultado> => {
      try {
        await apiRequest<Record<string, unknown>>('/notificaciones/masiva', {
          method: 'POST',
          body: JSON.stringify({
            id_rol: ROL_CLIENTE,
            tipo: 'sistema',
            titulo,
            mensaje,
            enviar_correo: false,
          }),
        });
        notificar(`📢 ${titulo}`, mensaje, 'promo');
        return { ok: true, mensaje: 'Aviso enviado a todos los clientes.' };
      } catch (error) {
        const detalle =
          error instanceof Error
            ? error.message
            : 'No se pudo enviar la difusión.';
        notificar('No se pudo enviar la difusión', detalle, 'sistema');
        return { ok: false, mensaje: `No se pudo enviar la difusión: ${detalle}` };
      }
    },
    [notificar],
  );

  const descargarReporte = async (tipo: TipoReporte): Promise<Resultado> => {
    try {
      if (tipo === 'ingresos') {
        const reporte = await apiRequest<{ periodos?: Record<string, unknown>[] }>('/reportes/ingresos');
        descargarCSV('reporte-ingresos.csv', reporte.periodos ?? []);
      } else if (tipo === 'citas') {
        const reporte = await apiRequest<{ por_barbero?: Record<string, unknown>[] }>('/reportes/citas');
        descargarCSV('reporte-citas-por-barbero.csv', reporte.por_barbero ?? []);
      } else {
        const reporte = await apiRequest<{ items?: Record<string, unknown>[] }>('/clientes?por_pagina=100');
        descargarCSV('clientes-y-puntos.csv', reporte.items ?? []);
      }
      return { ok: true, mensaje: 'Reporte descargado correctamente.' };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo descargar el reporte.';
      return { ok: false, mensaje };
    }
  };

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
        crearClientePresencial,
        buscarClientes,
        editarCita,
        cambiarEstadoCita,
        confirmarCita,
        cancelarCita,
        calificarCita,
        actualizarAvatar,
        descargarReporte,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp debe usarse dentro de AppProvider');
  return c;
};
