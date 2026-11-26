import React, { useEffect, useState } from 'react';
import {
  CalendarDays, Plus, QrCode, Star, Timer, Ban, Check,
  RotateCcw, CircleAlert, History, Hourglass, X, Eye, Sparkles, Camera, UserRound, Scissors,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Cita, Servicio, PremioFidelidad, NivelFidelizacion } from '../../types';
import { apiRequest } from '../../utils/apiClient';
import { imagenCatalogoServicio } from '../../data/mockData';
import {
  formatoCOP, fechaLarga, rangoHorario, duracionLegible, estiloEstado,
  hoyISO, sumarDiasISO, hora12, desglosarFecha,
} from '../../utils/helpers';
import { CodigoQRReserva } from '../ui/CodigoQRReserva';
import { BarberoFoto } from '../ui/BarberoFoto';

const SERVICIOS_RAPIDOS = [
  'Mid Skin Fade + Crop Texturizado',
  'Low Taper con Barba Integrada',
  'Pompadour Moderno con Drop Fade',
  'Buzz Cut con Line-up a Navaja',
] as const;

const MOTIVOS = [
  'Me surgió un imprevisto',
  'Quiero cambiar de horario',
  'Problemas de transporte',
  'Ya no necesito el servicio',
  'Otro motivo',
];

const fechaHoraCita = (fecha: string, hora: string): Date =>
  new Date(`${fecha}T${hora.slice(0, 5)}:00`);

interface SaldoFidelizacion {
  puntos_saldo: number;
  nivel_fidelizacion: NivelFidelizacion;
  proximo_nivel: NivelFidelizacion | null;
  puntos_para_proximo_nivel: number | null;
  progreso_nivel: number;
}

interface MovimientoFidelizacion {
  id_movimiento: number;
  tipo: string;
  puntos: number;
  saldo_resultante: number | null;
  descripcion: string | null;
  creado_en: string | null;
}

interface RespuestaMovimientos {
  items: MovimientoFidelizacion[];
  total: number;
}

interface SlotReprogramacion {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export const PanelCliente: React.FC = () => {
  const {
    usuario, citas, servicios, barberos, abrirReserva, verTicket, cancelarCita,
    editarCita, calificarCita, actualizarAvatar, setEsperaAbierta, irA, listaEspera,
    aceptarOfertaEspera, cancelarSolicitudEspera,
    setQuizAbierto, actualizarBarberoFavorito, premios,
  } = useApp();

  const [tab, setTab] = useState<'resumen' | 'proximas' | 'historial' | 'puntos' | 'espera'>('resumen');
  const [movimientosPuntos, setMovimientosPuntos] = useState<MovimientoFidelizacion[]>([]);
  const [totalMovimientosPuntos, setTotalMovimientosPuntos] = useState(0);
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);
  const [revisionMovimientos, setRevisionMovimientos] = useState(0);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [errorMovimientos, setErrorMovimientos] = useState('');
  const porPaginaMovimientos = 10;
  const [saldoFidelizacion, setSaldoFidelizacion] = useState<SaldoFidelizacion | null>(null);
  const [errorSaldo, setErrorSaldo] = useState('');
  const [aCancelar, setACancelar] = useState<Cita | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [aReprogramar, setAReprogramar] = useState<Cita | null>(null);
  const [nFecha, setNFecha] = useState(hoyISO());
  const [nHora, setNHora] = useState('');
  const [slotsReprogramacion, setSlotsReprogramacion] = useState<SlotReprogramacion[]>([]);
  const [cargandoSlotsReprogramacion, setCargandoSlotsReprogramacion] = useState(false);
  const [errorSlotsReprogramacion, setErrorSlotsReprogramacion] = useState('');
  const [guardandoReprogramacion, setGuardandoReprogramacion] = useState(false);
  const [aCalificar, setACalificar] = useState<Cita | null>(null);
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [actualizandoFavorito, setActualizandoFavorito] = useState(false);
  const [errorFavorito, setErrorFavorito] = useState('');
  const idUsuario = usuario?.id_usuario;
  const rolUsuario = usuario?.id_rol;

  useEffect(() => {
    let vigente = true;
    if (rolUsuario !== 3) {
      setSaldoFidelizacion(null);
      setErrorSaldo('');
      return () => { vigente = false; };
    }

    apiRequest<SaldoFidelizacion>('/puntos/saldo')
      .then((saldo) => {
        if (vigente) {
          setSaldoFidelizacion(saldo);
          setErrorSaldo('');
        }
      })
      .catch((causa: unknown) => {
        if (vigente) {
          setErrorSaldo('No se pudo actualizar tu saldo de puntos.');
          console.error('Error al consultar el saldo de fidelización:', causa);
        }
      });

    return () => { vigente = false; };
  }, [idUsuario, rolUsuario]);

  useEffect(() => {
    if (rolUsuario !== 3 || tab !== 'puntos') return;
    const controlador = new AbortController();
    setCargandoMovimientos(true);
    setErrorMovimientos('');
    apiRequest<RespuestaMovimientos>(
      `/puntos/movimientos?pagina=${paginaMovimientos}&por_pagina=${porPaginaMovimientos}`,
      { signal: controlador.signal },
    )
      .then((respuesta) => {
        setMovimientosPuntos(respuesta.items);
        setTotalMovimientosPuntos(respuesta.total);
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setErrorMovimientos(causa instanceof Error ? causa.message : 'No se pudo cargar el historial de puntos.');
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoMovimientos(false);
      });
    return () => controlador.abort();
  }, [rolUsuario, tab, paginaMovimientos, revisionMovimientos]);

  const mias = citas.filter((c) => c.id_cliente === usuario?.id_cliente || c.cliente_correo === usuario?.correo);
  const ahora = new Date();
  const proximas = mias.filter((c) => {
    if (!['pendiente', 'confirmada', 'en_atencion'].includes(c.estado)) return false;
    const inicio = fechaHoraCita(c.fecha, c.hora_inicio);
    if (Number.isNaN(inicio.getTime())) return false;
    if (inicio >= ahora) return true;
    return c.estado === 'en_atencion' && fechaHoraCita(c.fecha, c.hora_fin) >= ahora;
  });
  const proximasOrdenadas = [...proximas].sort((a, b) =>
    `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`),
  );
  const citaProxima = proximasOrdenadas[0];
  const historial = mias.filter((c) => ['completada', 'cancelada', 'no_asistio'].includes(c.estado));
  const historialOrdenado = [...historial].sort((a, b) =>
    `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`),
  );
  const historialReciente = historialOrdenado.slice(0, 2);
  const misEsperas = listaEspera.filter((e) => e.id_cliente === usuario?.id_cliente);
  const barberoFavorito = barberos.find((b) => b.id_barbero === usuario?.id_barbero_favorito);
  const barberoTarjeta = barberoFavorito
    ?? barberos.find((b) => b.id_barbero === citaProxima?.id_barbero)
    ?? barberos.find((b) => b.id_barbero === historialOrdenado[0]?.id_barbero);
  const serviciosRapidos = SERVICIOS_RAPIDOS
    .map((nombre) => servicios.find((s) => s.nombre === nombre))
    .filter((s): s is Servicio => Boolean(s));
  const saldoActual = saldoFidelizacion?.puntos_saldo ?? usuario?.puntos ?? 0;
  const nivelActual = saldoFidelizacion?.nivel_fidelizacion ?? usuario?.nivel_fidelizacion ?? 'Bronce';
  const premiosVisibles = [...premios].sort((a, b) => a.costo_puntos - b.costo_puntos).slice(0, 2);
  const puntosCitaProxima = servicios.find((s) => s.id_servicio === citaProxima?.id_servicio)?.puntos_otorga;

  const mostrarAviso = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 4500); };

  const guardarBarberoFavorito = async (valor: string) => {
    setActualizandoFavorito(true);
    setErrorFavorito('');
    const idBarbero = valor ? Number(valor) : null;
    const resultado = await actualizarBarberoFavorito(idBarbero);
    setActualizandoFavorito(false);
    if (!resultado.ok) {
      setErrorFavorito(resultado.mensaje);
      return;
    }
    mostrarAviso(idBarbero === null ? 'Se eliminó tu barbero favorito.' : 'Tu barbero favorito quedó guardado.');
  };

  const seleccionarAvatar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      setError('La foto debe estar en formato JPG, PNG o WebP.');
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setError('La foto no puede superar los 2 MB.');
      return;
    }
    setSubiendoAvatar(true);
    setError('');
    const resultado = await actualizarAvatar(archivo);
    setSubiendoAvatar(false);
    if (!resultado.ok) setError(resultado.mensaje);
  };

  const confirmarCancelacion = async () => {
    if (!aCancelar) return;
    const r = await cancelarCita(aCancelar.id_cita, motivo);
    if (r.ok) setACancelar(null);
    mostrarAviso(r.ok ? `Cita ${aCancelar.codigo_reserva} cancelada. ${r.mensaje}` : r.mensaje);
  };

  const barberoRep = barberos.find((b) => b.id_barbero === aReprogramar?.id_barbero) ?? barberos[0];
  const horasParaCita = aCancelar
    ? (new Date(`${aCancelar.fecha}T${aCancelar.hora_inicio}:00`).getTime() - Date.now()) / 3_600_000
    : null;
  useEffect(() => {
    if (!aReprogramar || !barberoRep) {
      setSlotsReprogramacion([]);
      return;
    }

    const controlador = new AbortController();
    const servicio = servicios.find((item) => item.id_servicio === aReprogramar.id_servicio);
    const minutosAdicionales = Math.max(0, aReprogramar.duracion_minutos - (servicio?.duracion_minutos ?? aReprogramar.duracion_minutos));
    setCargandoSlotsReprogramacion(true);
    setErrorSlotsReprogramacion('');
    apiRequest<{ slots: SlotReprogramacion[] }>(
      `/barberos/${barberoRep.id_barbero}/disponibilidad?fecha=${encodeURIComponent(nFecha)}&id_servicio=${aReprogramar.id_servicio}&duracion_adicional_minutos=${minutosAdicionales}`,
      { signal: controlador.signal },
    )
      .then((respuesta) => {
        if (!controlador.signal.aborted) setSlotsReprogramacion(respuesta.slots);
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setSlotsReprogramacion([]);
          setErrorSlotsReprogramacion(causa instanceof Error ? causa.message : 'No se pudieron consultar los horarios.');
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoSlotsReprogramacion(false);
      });
    return () => controlador.abort();
  }, [aReprogramar, barberoRep, nFecha, servicios]);

  const franjasRep = aReprogramar
    ? slotsReprogramacion.map((slot) => {
        const propia = aReprogramar.fecha === nFecha && aReprogramar.hora_inicio === slot.hora_inicio;
        return { ini: slot.hora_inicio, fin: slot.hora_fin, libre: propia || slot.disponible };
      })
    : [];

  const guardarReprogramacion = async () => {
    if (!aReprogramar || !nHora) { setError('Selecciona una nueva franja horaria.'); return; }
    setGuardandoReprogramacion(true);
    try {
      const r = await editarCita(aReprogramar.id_cita, { fecha: nFecha, hora_inicio: nHora });
      if (!r.ok) { setError(r.mensaje); return; }
      setAReprogramar(null); setError(''); setNHora('');
      mostrarAviso('Tu cita fue reprogramada correctamente.');
    } finally {
      setGuardandoReprogramacion(false);
    }
  };

  const enviarResena = async () => {
    if (!aCalificar) return;
    const r = await calificarCita(aCalificar.id_cita, rating, comentario, ['Servicio Globde']);
    if (!r.ok) return;
    setACalificar(null); setComentario('');
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

  return (
    <div className="panel-cliente-dashboard min-h-[70vh] bg-[#f7f8f4] py-5 text-[#172124]">
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6e9e3] bg-gradient-to-r from-[#f7f2e7] to-[#e2f5f4] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              {usuario?.avatar_url
                ? <img src={usuario.avatar_url} alt="Foto de perfil" className="h-11 w-11 rounded-full object-cover" />
                : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#55d7e5] text-[#12383c]">
                    <UserRound className="h-6 w-6" aria-hidden="true" />
                  </span>}
              <label className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#172124] text-white" title="Cambiar foto de perfil">
                <Camera className="h-3 w-3" />
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={seleccionarAvatar} disabled={subiendoAvatar} />
              </label>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#66716d]">Bienvenido de nuevo</p>
              <h1 className="truncate font-heading text-lg font-black leading-tight text-[#172124]">Hola, {usuario?.nombre.split(' ')[0]}</h1>
              <p className="text-[10px] text-[#5d6965]">Tu estilo, tus citas y tus beneficios.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'Puntos', value: saldoActual, action: () => irA('fidelizacion') },
              { label: 'Próximas', value: proximas.length, action: () => setTab('proximas') },
              { label: 'Historial', value: historial.length, action: () => setTab('historial') },
            ].map((dato) => (
              <button key={dato.label} onClick={dato.action} className="min-w-[58px] rounded-lg border border-white/70 bg-white/70 px-2 py-1.5 text-center transition hover:bg-white">
                <span className="block text-sm font-black leading-none text-[#172124]">{dato.value}</span>
                <span className="mt-1 block text-[8px] font-semibold text-[#66716d]">{dato.label}</span>
              </button>
            ))}
          </div>
        </header>

        {aviso && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800">
            <Check className="h-4 w-4" /> {aviso}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.9fr)]">
          <div className="space-y-3">
            <section id="mis-citas" className="overflow-hidden rounded-xl border border-[#e4e8e2] bg-white shadow-sm">
              <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6a7772]">Tu agenda</p>
                  <h2 className="font-heading text-sm font-black text-[#172124]">Próxima cita</h2>
                </div>
                <button onClick={() => setTab('proximas')} className="text-[9px] font-bold text-[#18899a] hover:underline">Ver todas</button>
              </div>
              {citaProxima ? (
                <div className="grid min-h-[94px] grid-cols-[82px_minmax(0,1fr)] sm:grid-cols-[100px_minmax(0,1fr)_68px]">
                  <div className="flex flex-col items-center justify-center bg-[#55d7e5] px-2 py-3 text-center text-[#12383c]">
                    <span className="text-[8px] font-black uppercase tracking-wider">{desglosarFecha(citaProxima.fecha).diaSemanaCorto}</span>
                    <span className="font-heading text-2xl font-black leading-none">{desglosarFecha(citaProxima.fecha).dia}</span>
                    <span className="mt-1 text-[9px] font-bold uppercase">{desglosarFecha(citaProxima.fecha).mesCorto}</span>
                    <span className="mt-1 text-[9px] font-bold">{hora12(citaProxima.hora_inicio)}</span>
                  </div>
                  <div className="flex min-w-0 flex-col justify-center px-3 py-2">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#75817c]">{citaProxima.codigo_reserva} · {citaProxima.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}</span>
                    <p className="mt-0.5 truncate text-xs font-black text-[#172124]">{citaProxima.servicio_nombre}</p>
                    <p className="truncate text-[10px] text-[#65716d]">Con {citaProxima.barbero_nombre} · {rangoHorario(citaProxima.hora_inicio, citaProxima.hora_fin)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button onClick={() => verTicket(citaProxima)} className="rounded-md bg-[#172124] px-2 py-1 text-[9px] font-bold text-white">Pase QR</button>
                      <button onClick={() => { setAReprogramar(citaProxima); setNFecha(citaProxima.fecha); setNHora(''); setError(''); setErrorSlotsReprogramacion(''); }} className="rounded-md border border-[#dce4e1] px-2 py-1 text-[9px] font-bold text-[#273532]">Reprogramar</button>
                    </div>
                  </div>
                  <div className="hidden items-center justify-center pr-2 sm:flex">
                    <button onClick={() => verTicket(citaProxima)} className="rounded-md border border-[#e7eae6] bg-white p-1.5" aria-label="Ver pase QR">
                      <CodigoQRReserva codigo={citaProxima.codigo_reserva} tamano={52} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-[#f8faf8] px-4 py-4">
                  <p className="text-xs text-[#65716d]">Todavía no tienes una cita programada.</p>
                  <button onClick={() => irA('catalogo')} className="shrink-0 rounded-md bg-[#172124] px-3 py-2 text-[10px] font-bold text-white">Ver catálogo</button>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#e4e8e2] bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6a7772]">Servicios destacados</p>
                  <h2 className="font-heading text-sm font-black text-[#172124]">Ideas para tu próxima visita</h2>
                </div>
                <button onClick={() => irA('catalogo')} className="text-[9px] font-bold text-[#18899a] hover:underline">Ver catálogo</button>
              </div>
              {serviciosRapidos.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {serviciosRapidos.map((servicio) => {
                    const imagen = imagenCatalogoServicio(servicio.nombre) ?? servicio.imagen_url;
                    return (
                      <article key={servicio.id_servicio} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#edf0ec] p-2">
                        {imagen ? (
                          <img src={imagen} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e9f4f3] text-[#18899a]">
                            <Scissors className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-[10px] font-black text-[#172124]">{servicio.nombre}</h3>
                          <p className="text-[9px] text-[#65716d]">{duracionLegible(servicio.duracion_minutos)} · {formatoCOP(servicio.precio)}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-[#f8faf8] p-3 text-[10px] text-[#65716d]">Los servicios destacados no están disponibles en el catálogo activo.</p>
              )}
            </section>

            <section className="rounded-xl border border-[#e4e8e2] bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#6a7772]">Tus visitas</p>
                  <h2 className="font-heading text-sm font-black text-[#172124]">Historial reciente</h2>
                </div>
                <button onClick={() => setTab('historial')} className="text-[9px] font-bold text-[#18899a] hover:underline">Ver historial</button>
              </div>
              {historialReciente.length ? (
                <div className="divide-y divide-[#edf0ec]">
                  {historialReciente.map((cita) => (
                    <div key={cita.id_cita} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f2f4f0] text-sm">✂</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-bold text-[#172124]">{cita.servicio_nombre}</p>
                        <p className="text-[9px] text-[#65716d]">{fechaLarga(cita.fecha)} · {cita.barbero_nombre}</p>
                      </div>
                      <button onClick={() => abrirReserva({ servicioId: cita.id_servicio, barberoId: cita.id_barbero })} className="rounded-md border border-[#dce4e1] px-2 py-1 text-[9px] font-bold text-[#263532] hover:bg-[#f5faf9]">Repetir</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[#65716d]">Tus citas completadas aparecerán aquí.</p>
              )}
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-xl bg-[#172124] p-3.5 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-full p-[5px]"
                  style={{ background: `conic-gradient(#55d7e5 ${saldoFidelizacion?.progreso_nivel ?? 0}%, #435052 0)` }}
                  aria-label={saldoFidelizacion ? `${saldoFidelizacion.progreso_nivel}% de progreso al siguiente nivel` : 'Progreso de nivel pendiente de actualizar'}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#172124]">
                    <span className="font-heading text-lg font-black leading-none">{saldoActual}</span>
                    <span className="text-[8px] text-[#becac7]">puntos</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#55d7e5]">Club Globde · {nivelActual}</p>
                  {saldoFidelizacion?.proximo_nivel && saldoFidelizacion.puntos_para_proximo_nivel !== null ? (
                    <p className="mt-1 text-[10px] font-semibold text-white">{saldoFidelizacion.puntos_para_proximo_nivel} pts para nivel {saldoFidelizacion.proximo_nivel}</p>
                  ) : saldoFidelizacion ? (
                    <p className="mt-1 text-[10px] font-semibold text-white">Has alcanzado el nivel máximo.</p>
                  ) : (
                    <p className="mt-1 text-[10px] font-semibold text-white">Consulta tu saldo y nivel.</p>
                  )}
                  {puntosCitaProxima
                    ? <p className="mt-1 text-[9px] text-[#becac7]">Gana {puntosCitaProxima} pts al completar tu próxima cita.</p>
                    : <p className="mt-1 text-[9px] text-[#becac7]">Acumula puntos en tus servicios completados.</p>}
                </div>
              </div>
              {errorSaldo && <p role="alert" className="mt-2 text-[9px] font-semibold text-[#ffb4a9]">{errorSaldo}</p>}
              <button onClick={() => irA('fidelizacion')} className="mt-3 flex w-full items-center justify-between border-t border-white/10 pt-2 text-[9px] font-bold text-[#55d7e5]">
                Ver puntos y beneficios <span aria-hidden="true">→</span>
              </button>
            </section>

            <button onClick={() => setQuizAbierto(true)} className="w-full rounded-xl bg-[#55d7e5] p-3.5 text-left text-[#12383c] shadow-sm transition hover:bg-[#45cbd9]">
              <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.16em]"><Sparkles className="h-3.5 w-3.5" /> Asesor de estilo</span>
              <p className="mt-1 text-xs font-black">Descubre qué corte va con tu rostro</p>
              <span className="mt-2 inline-flex rounded-md bg-[#172124] px-2.5 py-1.5 text-[9px] font-bold text-white">Probar asesor <span className="ml-1">→</span></span>
            </button>

            <section className="rounded-xl border border-[#e4e8e2] bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#6a7772]">Tu barbero</p>
                  <p className="mt-0.5 text-xs font-black text-[#172124]">{barberoTarjeta?.nombre ?? 'Elige un barbero'}</p>
                  {barberoTarjeta && <p className="text-[9px] text-[#65716d]">{barberoTarjeta.rol_titulo}</p>}
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#74563f] text-sm font-black text-white">
                  {barberoTarjeta
                    ? <BarberoFoto
                      idBarbero={barberoTarjeta.id_barbero}
                      nombre={barberoTarjeta.nombre}
                      fotoUrl={barberoTarjeta.foto_url}
                      className="h-full w-full object-cover"
                      iconClassName="h-4 w-4"
                    />
                    : <Scissors className="h-4 w-4" aria-hidden="true" />}
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  id="barbero-favorito"
                  aria-label="Barbero favorito"
                  value={usuario?.id_barbero_favorito ?? ''}
                  onChange={(evento) => void guardarBarberoFavorito(evento.target.value)}
                  disabled={actualizandoFavorito || !barberos.length}
                  className="min-w-0 flex-1 rounded-md border border-[#dce4e1] bg-white px-2 py-1.5 text-[9px] text-[#263532]"
                >
                  <option value="">Guardar como favorito</option>
                  {barberos.map((barbero) => (
                    <option key={barbero.id_barbero} value={barbero.id_barbero}>{barbero.nombre}</option>
                  ))}
                </select>
                <button onClick={() => abrirReserva({ barberoId: usuario?.id_barbero_favorito ?? barberoTarjeta?.id_barbero })} className="rounded-md bg-[#172124] px-2.5 py-1.5 text-[9px] font-bold text-white">Reservar</button>
              </div>
              {errorFavorito && <p role="alert" className="mt-1.5 text-[9px] font-semibold text-rose-700">{errorFavorito}</p>}
            </section>

            <section className="rounded-xl border border-[#e4e8e2] bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-heading text-xs font-black text-[#172124]">Premios disponibles</h2>
                <button onClick={() => irA('fidelizacion')} className="text-[9px] font-bold text-[#18899a]">Ver todos</button>
              </div>
              {premiosVisibles.length ? premiosVisibles.map((premio: PremioFidelidad) => (
                <div key={premio.id_premio} className="flex items-center justify-between gap-2 border-t border-[#edf0ec] py-1.5 first:border-0">
                  <p className="min-w-0 truncate text-[9px] font-semibold text-[#394642]">{premio.icono} {premio.titulo}</p>
                  <span className="shrink-0 text-[9px] font-bold text-[#73817b]">{premio.costo_puntos} pts</span>
                </div>
              )) : <p className="text-[9px] text-[#65716d]">No hay premios publicados.</p>}
            </section>
          </aside>
        </section>

        {/* Pestañas */}
        {tab !== 'resumen' && <div className="flex flex-wrap gap-2">
          {[
            { id: 'proximas', t: `Próximas (${proximas.length})`, i: CalendarDays },
            { id: 'historial', t: `Historial (${historial.length})`, i: History },
            { id: 'puntos', t: 'Movimientos de puntos', i: Sparkles },
            { id: 'espera', t: `Lista de espera (${misEsperas.length})`, i: Hourglass },
          ].map((x) => (
            <button key={x.id} onClick={() => setTab(x.id as typeof tab)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold transition ${
                tab === x.id ? 'bg-[#172124] text-white' : 'border border-[#e4e8e2] bg-white text-[#65716d] hover:border-[#55d7e5]'
              }`}>
              <x.i className="h-4 w-4" /> {x.t}
            </button>
          ))}
          <button onClick={() => setTab('resumen')} className="rounded-lg px-3 py-2 text-[10px] font-bold text-[#65716d] hover:bg-white">Cerrar</button>
        </div>}

        {/* PRÓXIMAS */}
        {tab === 'proximas' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {proximas.length === 0 && (
              <div className="card col-span-full p-12 text-center">
                <p className="text-5xl">💈</p>
                <h3 className="font-heading mt-3 text-xl font-black text-[#EAF0F6]">No tienes citas programadas</h3>
                <p className="mt-1 text-sm text-[#93A1B1]">Reserva tu turno y asegura tu horario preferido.</p>
                <button onClick={() => abrirReserva()} className="btn-primario mx-auto mt-5 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black">
                  <Plus className="h-4 w-4" /> Agendar ahora
                </button>
              </div>
            )}

            {proximasOrdenadas.map((c) => {
              const est = estiloEstado(c.estado);
              return (
                <article key={c.id_cita} className="card card-hover overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/8 bg-[#0F151C] px-5 py-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7A8C]">Código</span>
                      <p className="font-heading text-lg font-black text-amber-700">{c.codigo_reserva}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${est.clase}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${est.punto}`} /> {est.texto}
                    </span>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="cita-horario rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/8 p-4">
                      <span className="text-[11px] font-black uppercase tracking-widest text-amber-700">Franja reservada</span>
                      <p className="font-heading text-2xl font-black text-[#EAF0F6]">{rangoHorario(c.hora_inicio, c.hora_fin)}</p>
                      <p className="text-xs font-semibold text-[#93A1B1]">
                        {fechaLarga(c.fecha)} · <Timer className="inline h-3 w-3 text-amber-300" /> {duracionLegible(c.duracion_minutos)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[11px] text-[#6B7A8C]">Servicio</span>
                        <p className="font-bold text-[#EAF0F6]">{c.servicio_nombre}</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-[#6B7A8C]">Barbero</span>
                        <p className="font-bold text-amber-300">{c.barbero_nombre}</p>
                      </div>
                    </div>

                    {citaProxima?.id_cita === c.id_cita && (
                      <div className="flex items-center gap-4 rounded-2xl border border-amber-400/20 bg-[#0F151C] p-3">
                        <div className="shrink-0 rounded-xl bg-white p-2">
                          <CodigoQRReserva codigo={c.codigo_reserva} />
                        </div>
                        <div className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600">
                            <QrCode className="h-3.5 w-3.5" /> Pase digital
                          </span>
                          <p className="mt-1 text-sm font-black text-[#EAF0F6]">Presenta este QR al llegar</p>
                          <p className="mt-1 break-all font-mono text-xs tracking-wider text-[#93A1B1]">{c.codigo_reserva}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-2xl bg-[#0F151C] px-4 py-2.5">
                      <span className="text-xs font-semibold text-[#93A1B1]">Total</span>
                      <span className="font-heading text-lg font-black text-[#EAF0F6]">{formatoCOP(c.precio_total)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => verTicket(c)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-400/12 py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-400/20">
                        <QrCode className="h-3.5 w-3.5" /> Pase QR
                      </button>
                      <button onClick={() => { setAReprogramar(c); setNFecha(c.fecha); setNHora(''); setError(''); }}
                        className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 py-2.5 text-xs font-bold text-[#93A1B1] transition hover:bg-white/5">
                        <RotateCcw className="h-3.5 w-3.5" /> Reprogramar
                      </button>
                      <button onClick={() => { setACancelar(c); setMotivo(MOTIVOS[0]); }}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-400/12 py-2.5 text-xs font-black text-rose-300 transition hover:bg-rose-400/20">
                        <Ban className="h-3.5 w-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0F151C] text-[11px] uppercase tracking-wide text-[#6B7A8C]">
                  <tr>
                    <th className="p-4">Código</th><th className="p-4">Servicio</th><th className="p-4">Barbero</th>
                    <th className="p-4">Fecha y franja</th><th className="p-4">Total</th><th className="p-4">Estado</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {historial.map((c) => {
                    const est = estiloEstado(c.estado);
                    return (
                      <tr key={c.id_cita} className="transition hover:bg-white/3">
                        <td className="p-4 font-black text-amber-700">{c.codigo_reserva}</td>
                        <td className="p-4 font-semibold text-[#EAF0F6]">{c.servicio_nombre}</td>
                        <td className="p-4 text-amber-300">{c.barbero_nombre}</td>
                        <td className="p-4 text-[#93A1B1]">
                          {fechaLarga(c.fecha)}<br />
                          <span className="text-xs font-semibold text-[#6B7A8C]">{rangoHorario(c.hora_inicio, c.hora_fin)}</span>
                        </td>
                        <td className="p-4 font-bold text-[#EAF0F6]">{formatoCOP(c.precio_total)}</td>
                        <td className="p-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${est.clase}`}>{est.texto}</span>
                        </td>
                        <td className="p-4 text-center">
                          {c.estado === 'completada' && !c.resena ? (
                            <button onClick={() => setACalificar(c)} className="rounded-xl bg-amber-400/15 px-3 py-1.5 text-[11px] font-black text-amber-300 transition hover:bg-amber-400/25">
                              ⭐ Calificar (+15 pts)
                            </button>
                          ) : c.resena ? (
                            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300">
                              <Star className="h-3.5 w-3.5 fill-amber-300" /> {c.resena.rating}/5
                            </span>
                          ) : (
                            <button onClick={() => verTicket(c)} className="flex items-center gap-1 rounded-xl border border-white/12 px-3 py-1.5 text-[11px] font-bold text-[#93A1B1] hover:bg-white/5">
                              <Eye className="h-3.5 w-3.5" /> Ver detalle
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'puntos' && (
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 p-4">
              <div>
                <h2 className="font-heading text-base font-black text-[#EAF0F6]">Historial de puntos</h2>
                <p className="mt-1 text-xs text-[#93A1B1]">Consulta tus puntos ganados, canjeados y ajustes.</p>
              </div>
              <span className="rounded-xl bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-300">
                Saldo: {saldoActual} pts
              </span>
            </div>
            {errorMovimientos && (
              <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-xl bg-rose-400/10 p-3 text-xs text-rose-300">
                {errorMovimientos}
                <button onClick={() => setRevisionMovimientos((revision) => revision + 1)} className="font-bold underline">Reintentar</button>
              </div>
            )}
            {cargandoMovimientos ? (
              <p className="p-8 text-center text-sm text-[#93A1B1]">Cargando movimientos…</p>
            ) : !errorMovimientos && movimientosPuntos.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#93A1B1]">Todavía no tienes movimientos de puntos.</p>
            ) : (
              <div className="divide-y divide-white/6">
                {movimientosPuntos.map((movimiento) => (
                  <article key={movimiento.id_movimiento} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#EAF0F6]">{movimiento.descripcion || movimiento.tipo}</p>
                      <p className="mt-1 text-[11px] text-[#6B7A8C]">
                        {movimiento.creado_en ? new Date(movimiento.creado_en).toLocaleString('es-CO') : 'Fecha no disponible'}
                        {' · '}{movimiento.tipo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-heading text-base font-black ${movimiento.puntos >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {movimiento.puntos > 0 ? '+' : ''}{movimiento.puntos} pts
                      </p>
                      {movimiento.saldo_resultante !== null && (
                        <p className="text-[10px] text-[#6B7A8C]">Saldo: {movimiento.saldo_resultante}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/8 px-4 py-3 text-xs text-[#93A1B1]">
              <span>{totalMovimientosPuntos} movimiento(s) · Página {paginaMovimientos} de {Math.max(1, Math.ceil(totalMovimientosPuntos / porPaginaMovimientos))}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPaginaMovimientos((pagina) => Math.max(1, pagina - 1))}
                  disabled={paginaMovimientos <= 1 || cargandoMovimientos}
                  className="rounded-lg border border-white/12 px-3 py-1.5 font-bold disabled:opacity-40">Anterior</button>
                <button type="button" onClick={() => setPaginaMovimientos((pagina) => pagina + 1)}
                  disabled={paginaMovimientos >= Math.ceil(totalMovimientosPuntos / porPaginaMovimientos) || cargandoMovimientos}
                  className="rounded-lg border border-white/12 px-3 py-1.5 font-bold disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          </section>
        )}

        {/* LISTA DE ESPERA */}
        {tab === 'espera' && (
          <div className="space-y-4">
            <button onClick={() => setEsperaAbierta(true)} className="btn-primario flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold">
              <Plus className="h-4 w-4" /> Nueva solicitud
            </button>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {misEsperas.length === 0 && <p className="card p-8 text-center text-sm text-[#93A1B1]">Aún no tienes solicitudes en lista de espera.</p>}
              {misEsperas.map((e) => (
                <div key={e.id_espera} className="card p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-black text-[#EAF0F6]">{e.servicio_nombre}</h4>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                      e.estado === 'ofrecida' ? 'bg-emerald-400/15 text-emerald-300'
                      : ['convertida', 'cancelada', 'vencida'].includes(e.estado) ? 'bg-neutral-500/15 text-[#93A1B1]'
                      : 'bg-amber-400/15 text-amber-300'
                    }`}>
                      {e.estado === 'en_espera' ? 'En espera'
                        : e.estado === 'ofrecida' ? 'Turno disponible'
                        : e.estado === 'reservando' ? 'Confirmando turno'
                        : e.estado === 'convertida' ? 'Cita confirmada'
                        : e.estado === 'vencida' ? 'Oferta vencida'
                        : 'Cancelada'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#93A1B1]">{fechaLarga(e.fecha_deseada)} · franja {e.franja_horaria}</p>
                  {e.barbero_nombre && <p className="text-xs font-semibold text-amber-300">Con {e.barbero_nombre}</p>}
                  {e.estado === 'ofrecida' && e.oferta_hora_inicio && e.oferta_hora_fin && (
                    <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3">
                      <p className="text-xs font-bold text-emerald-200">
                        Turno ofrecido: {rangoHorario(e.oferta_hora_inicio, e.oferta_hora_fin)}
                      </p>
                      {e.oferta_expira && (
                        <p className="mt-1 text-[10px] text-[#93A1B1]">
                          Disponible hasta {new Date(e.oferta_expira).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      <button type="button" onClick={async () => {
                        const resultado = await aceptarOfertaEspera(e.id_espera);
                        mostrarAviso(resultado.mensaje);
                      }} className="mt-2 rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-black text-[#052019]">
                        Aceptar y confirmar cita
                      </button>
                    </div>
                  )}
                  {['en_espera', 'ofrecida'].includes(e.estado) && (
                    <button type="button" onClick={async () => {
                      const resultado = await cancelarSolicitudEspera(e.id_espera);
                      mostrarAviso(resultado.mensaje);
                    }} className="mt-3 rounded-lg border border-rose-400/30 px-3 py-1.5 text-[10px] font-bold text-rose-300">
                      Cancelar solicitud
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CANCELAR */}
      {aCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="flex items-start justify-between bg-rose-500 px-6 py-5 text-[#1C0508]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">Cancelación</span>
                <h3 className="font-heading text-2xl font-black">¿Cancelar tu cita?</h3>
              </div>
              <button onClick={() => setACancelar(null)} className="rounded-full bg-[#1C0508]/15 p-2 hover:bg-[#1C0508]/25"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-2xl bg-[#0F151C] p-4 text-sm">
                <p className="font-black text-[#EAF0F6]">{aCancelar.servicio_nombre}</p>
                <p className="text-xs text-[#93A1B1]">{fechaLarga(aCancelar.fecha)} · {rangoHorario(aCancelar.hora_inicio, aCancelar.hora_fin)}</p>
                <p className="text-xs font-semibold text-amber-300">Con {aCancelar.barbero_nombre}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#93A1B1]">Cuéntanos el motivo</label>
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
                  {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className={`flex items-start gap-2 rounded-2xl border p-3 text-[11px] font-semibold ${
                horasParaCita !== null && horasParaCita < 2
                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
                  : 'border-amber-400/30 bg-amber-400/10 text-amber-800'
              }`}>
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {horasParaCita !== null && horasParaCita < 2
                  ? 'Faltan menos de 2 horas para tu cita. Esta cancelación puede generar una penalidad según las condiciones del servicio.'
                  : 'Al cancelar con 2 o más horas de anticipación no se aplica penalidad y tus puntos se conservan.'}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setACancelar(null)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1] hover:bg-white/5">
                  Mantener cita
                </button>
                <button onClick={confirmarCancelacion} className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-black text-[#1C0508] transition hover:bg-rose-400">
                  Sí, cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR */}
      {aReprogramar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <div className="sticky top-0 flex items-start justify-between bg-gradient-to-r from-neutral-950 to-neutral-800 px-6 py-5 text-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">{aReprogramar.codigo_reserva}</span>
                <h3 className="font-heading text-2xl font-black">Reprogramar cita</h3>
              </div>
              <button onClick={() => setAReprogramar(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              {error && <p className="rounded-2xl bg-rose-400/10 p-3 text-xs font-bold text-rose-300">{error}</p>}

              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 8 }, (_, i) => sumarDiasISO(i)).map((d) => {
                  const inf = desglosarFecha(d);
                  return (
                    <button key={d} onClick={() => { setNFecha(d); setNHora(''); setErrorSlotsReprogramacion(''); }}
                      className={`min-w-[68px] rounded-2xl border px-3 py-2 text-center transition ${
                        nFecha === d ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-white/10 bg-[#141A21] text-[#93A1B1]'
                      }`}>
                      <span className="block text-[10px] font-bold uppercase">{inf.esHoy ? 'Hoy' : inf.diaSemanaCorto}</span>
                      <span className="font-heading block text-lg font-black">{inf.dia}</span>
                    </button>
                  );
                })}
              </div>

              {errorSlotsReprogramacion && (
                <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs font-semibold text-rose-300">
                  {errorSlotsReprogramacion}
                </p>
              )}
              {cargandoSlotsReprogramacion && (
                <p role="status" className="text-center text-xs text-[#93A1B1]">Consultando disponibilidad…</p>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {franjasRep.map((f) => (
                  <button key={f.ini} disabled={!f.libre} onClick={() => setNHora(f.ini)}
                    className={`rounded-2xl border px-2 py-2 text-center text-xs transition ${
                      !f.libre ? 'cursor-not-allowed border-white/5 bg-[#0F151C] text-[#3D4855] line-through'
                      : nHora === f.ini ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-white/10 bg-[#141A21] text-[#C6D0DC] hover:border-amber-400/50'
                    }`}>
                    <span className="block font-black">{hora12(f.ini)}</span>
                    <span className="block text-[10px] opacity-70">a {hora12(f.fin)}</span>
                  </button>
                ))}
              </div>
              {!cargandoSlotsReprogramacion && !errorSlotsReprogramacion && franjasRep.length === 0 && (
                <p className="rounded-xl bg-[#0F151C] p-3 text-center text-xs text-[#93A1B1]">
                  No hay horarios disponibles para esta fecha.
                </p>
              )}

              <button
                onClick={guardarReprogramacion}
                disabled={guardandoReprogramacion || !nHora}
                className="btn-primario w-full rounded-2xl py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardandoReprogramacion ? 'Guardando…' : 'Guardar nuevo horario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CALIFICAR */}
      {aCalificar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-5">
              <h3 className="font-heading text-2xl font-black text-[#2B1E04]">Califica tu experiencia</h3>
              <p className="text-xs font-semibold text-[#2B1E04]/75">Con {aCalificar.barbero_nombre}</p>
            </div>
            <div className="space-y-4 p-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="transition hover:scale-125">
                    <Star className={`h-9 w-9 ${rating >= s ? 'fill-amber-300 text-amber-300' : 'text-[#263140]'}`} />
                  </button>
                ))}
              </div>
              <textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="¿Cómo estuvo tu corte y la atención?"
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#0F151C] p-3 text-sm text-[#EAF0F6] outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15" />
              <div className="flex gap-2">
                <button onClick={() => setACalificar(null)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1]">Cerrar</button>
                <button onClick={enviarResena} className="btn-oro flex-1 rounded-2xl py-3 text-sm font-black">
                  <span className="flex items-center justify-center gap-1.5"><Sparkles className="h-4 w-4" /> Publicar (+15 pts)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
