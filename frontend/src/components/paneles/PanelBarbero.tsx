import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays, Star, Timer, ChevronLeft, ChevronRight,
  ToggleLeft, ToggleRight, Coins, Users, LockKeyhole, QrCode, X, Trash2, Camera, Plus, XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Cita } from '../../types';
import { apiRequest } from '../../utils/apiClient';
import {
  formatoCOP, fechaLarga, rangoHorario, duracionLegible, estiloEstado,
  hoyISO, sumarDiasISO, paginar, generarFranjasJornada, franjasVigentes, sumarMinutos, hora12, haySolape,
} from '../../utils/helpers';
import { BarberoFoto } from '../ui/BarberoFoto';

const POR_PAGINA = 4;

const desplazarFecha = (fecha: string, dias: number): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
};

interface BloqueoAgenda {
  id_bloqueo: number;
  id_barbero: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string;
}

interface ResenaBarbero {
  id_resena: number;
  cliente_nombre: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
}

interface PerfilBarbero {
  resenas_recientes?: ResenaBarbero[];
}

interface CitaQR {
  id_cita: number;
  id_barbero: number;
  codigo_reserva: string;
  cliente_nombre: string;
  servicio_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: Cita['estado'];
}

type CodigoQRDetectado = { rawValue: string };
interface DetectorQR {
  detect: (video: HTMLVideoElement) => Promise<CodigoQRDetectado[]>;
}
interface ConstructorDetectorQR {
  new (opciones: { formats: string[] }): DetectorQR;
}

export const PanelBarbero: React.FC = () => {
  const {
    usuario, citas, barberos, cambiarEstadoCita, alternarDisponibilidad, abrirReserva, verTicket,
    actualizarAvatar,
  } = useApp();

  const barbero = barberos.find((b) => b.id_usuario === usuario?.id_usuario) ?? barberos[0];
  const idBarbero = barbero?.id_barbero;
  const hoy = hoyISO();

  const [pagProx, setPagProx] = useState(1);
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'confirmada' | 'completada'>('todas');
  const [fechaAgenda, setFechaAgenda] = useState(hoy);
  const [bloqueos, setBloqueos] = useState<BloqueoAgenda[]>([]);
  const [resenas, setResenas] = useState<ResenaBarbero[]>([]);
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [fechaBloqueo, setFechaBloqueo] = useState(hoy);
  const [inicioBloqueo, setInicioBloqueo] = useState('12:00');
  const [finBloqueo, setFinBloqueo] = useState('13:00');
  const [motivoBloqueo, setMotivoBloqueo] = useState('Pausa personal');
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);
  const [errorBloqueo, setErrorBloqueo] = useState('');
  const [aviso, setAviso] = useState('');
  const [errorAgenda, setErrorAgenda] = useState('');
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [modalQR, setModalQR] = useState(false);
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [codigoQR, setCodigoQR] = useState('');
  const [citaQR, setCitaQR] = useState<CitaQR | null>(null);
  const [errorQR, setErrorQR] = useState('');
  const [validandoQR, setValidandoQR] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const seleccionarAvatar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      setErrorAgenda('La foto debe estar en formato JPG, PNG o WebP.');
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setErrorAgenda('La foto no puede superar los 2 MB.');
      return;
    }

    setSubiendoAvatar(true);
    setErrorAgenda('');
    const resultado = await actualizarAvatar(archivo);
    setSubiendoAvatar(false);
    if (resultado.ok) {
      setAviso('Foto de perfil actualizada.');
    } else {
      setErrorAgenda(resultado.mensaje);
    }
  };

  const mias = barbero ? citas.filter((c) => c.id_barbero === barbero.id_barbero) : [];
  const deHoyTodas = mias.filter((c) => c.fecha === hoy).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const proximas = mias.filter((c) => c.fecha > hoy).sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));
  const bloqueosProximos = bloqueos.filter((bloqueo) => bloqueo.fecha > hoy).sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));

  const pProx = paginar(proximas, pagProx, POR_PAGINA);

  const completadas = deHoyTodas.filter((c) => c.estado === 'completada').length;
  const ingresos = deHoyTodas.filter((c) => c.estado === 'completada').reduce((a, c) => a + c.precio_total, 0);
  const tasaComision = 0.5 + (barbero?.porcentaje_incremento ?? 0) / 100;
  const comision = Math.round(ingresos * tasaComision);
  const minutosOcupados = deHoyTodas.filter((c) => ['completada', 'en_atencion'].includes(c.estado)).reduce((a, c) => a + c.duracion_minutos, 0);
  const citasActivas = deHoyTodas.filter((c) => !['cancelada', 'no_asistio'].includes(c.estado));
  const comisionProyectada = Math.round(citasActivas.reduce((total, c) => total + c.precio_total, 0) * tasaComision);
  const avanceComision = comisionProyectada > 0 ? Math.min(100, Math.round(comision * 100 / comisionProyectada)) : 0;
  const siguienteCita = deHoyTodas.find((c) => ['pendiente', 'confirmada', 'en_atencion'].includes(c.estado));

  const citasDiaAgenda = mias
    .filter((cita) => cita.fecha === fechaAgenda)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const franjasLibres = barbero ? franjasVigentes(
    generarFranjasJornada(barbero, fechaAgenda, 30, 30), fechaAgenda,
  )
    .map((ini) => ({ ini, fin: sumarMinutos(ini, 30) }))
    .filter((f) =>
      !citasDiaAgenda.some((c) => !['cancelada', 'no_asistio'].includes(c.estado) && haySolape(f.ini, f.fin, c.hora_inicio, c.hora_fin))
      && !bloqueos.some((b) => b.fecha === fechaAgenda && haySolape(f.ini, f.fin, b.hora_inicio, b.hora_fin)),
    ) : [];

  const diasDesdeLunes = (new Date(`${hoy}T12:00:00`).getDay() + 6) % 7;
  const semana = Array.from({ length: 7 }, (_, indice) => indice - diasDesdeLunes)
    .map((desplazamiento) => {
      const fecha = new Date(`${hoy}T12:00:00`);
      fecha.setDate(fecha.getDate() + desplazamiento);
      fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
      return fecha.toISOString().slice(0, 10);
    });
  const actividadSemanal = semana.map((fecha) => ({
    fecha,
    minutos: mias
      .filter((c) => c.fecha === fecha && !['cancelada', 'no_asistio'].includes(c.estado))
      .reduce((total, c) => total + c.duracion_minutos, 0),
  }));
  const maxMinutosSemana = Math.max(0, ...actividadSemanal.map((dia) => dia.minutos));
  const etiquetasDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  useEffect(() => {
    if (!idBarbero) return;
    let vigente = true;
    Promise.all([
      apiRequest<BloqueoAgenda[]>(`/barberos/${idBarbero}/bloqueos?desde=${hoy}&hasta=${sumarDiasISO(90)}`),
      apiRequest<PerfilBarbero>(`/barberos/${idBarbero}`),
    ])
      .then(([bloqueosApi, perfil]) => {
        if (!vigente) return;
        setBloqueos(bloqueosApi);
        setResenas(perfil.resenas_recientes ?? []);
        setErrorAgenda('');
      })
      .catch((causa: unknown) => {
        if (!vigente) return;
        setErrorAgenda('No se pudo actualizar la agenda y las reseñas.');
        console.error('Error al cargar los datos de la agenda del barbero:', causa);
      });
    return () => { vigente = false; };
  }, [idBarbero, hoy]);

  const abrirBloqueo = (franja?: { ini: string; fin: string }) => {
    setFechaBloqueo(fechaAgenda);
    const inicio = franja?.ini ?? barbero?.hora_apertura ?? '08:00';
    setInicioBloqueo(inicio);
    setFinBloqueo(franja?.fin ?? sumarMinutos(inicio, 30));
    setMotivoBloqueo('Pausa personal');
    setErrorBloqueo('');
    setModalBloqueo(true);
  };

  const guardarBloqueo = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!idBarbero) return;
    setGuardandoBloqueo(true);
    setErrorBloqueo('');
    try {
      const creado = await apiRequest<BloqueoAgenda>(`/barberos/${idBarbero}/bloqueos`, {
        method: 'POST',
        body: JSON.stringify({
          fecha: fechaBloqueo,
          hora_inicio: inicioBloqueo,
          hora_fin: finBloqueo,
          motivo: motivoBloqueo,
        }),
      });
      setBloqueos((actuales) => [...actuales, creado]);
      setModalBloqueo(false);
      setAviso('La franja quedó bloqueada en tu agenda.');
    } catch (causa) {
      setErrorBloqueo(causa instanceof Error ? causa.message : 'No se pudo bloquear la franja.');
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  const eliminarBloqueo = async (bloqueo: BloqueoAgenda) => {
    if (!idBarbero) return;
    try {
      await apiRequest(`/barberos/${idBarbero}/bloqueos/${bloqueo.id_bloqueo}`, { method: 'DELETE' });
      setBloqueos((actuales) => actuales.filter((item) => item.id_bloqueo !== bloqueo.id_bloqueo));
      setAviso('La franja quedó disponible nuevamente.');
    } catch (causa) {
      setErrorAgenda(causa instanceof Error ? causa.message : 'No se pudo liberar la franja.');
    }
  };

  const cambiarDisponibilidad = async () => {
    if (!barbero) return;
    const disponible = !barbero.disponible_hoy;
    try {
      await apiRequest(`/barberos/${barbero.id_barbero}/disponibilidad?disponible=${disponible}`, { method: 'PATCH' });
      alternarDisponibilidad(barbero.id_barbero);
      setAviso(disponible ? 'Volviste a recibir reservas.' : 'Pausaste las nuevas reservas.');
    } catch (causa) {
      setErrorAgenda(causa instanceof Error ? causa.message : 'No se pudo cambiar la disponibilidad.');
    }
  };

  const validarCodigoQR = useCallback(async (codigo: string) => {
    const normalizado = codigo.trim().toUpperCase();
    if (!normalizado) {
      setErrorQR('Escribe o escanea el código de la reserva.');
      return;
    }
    if (!idBarbero) {
      setErrorQR('No se encontró el perfil de barbero para validar la reserva.');
      return;
    }
    setValidandoQR(true);
    setErrorQR('');
    setCitaQR(null);
    try {
      const cita = await apiRequest<CitaQR>(`/citas/codigo/${encodeURIComponent(normalizado)}`);
      if (cita.id_barbero !== idBarbero) {
        throw new Error('Esta reserva no está asignada a tu agenda.');
      }
      setCitaQR(cita);
      setCodigoQR(cita.codigo_reserva);
    } catch (causa) {
      setErrorQR(causa instanceof Error ? causa.message : 'No se pudo validar el código.');
    } finally {
      setValidandoQR(false);
    }
  }, [idBarbero]);

  useEffect(() => {
    if (!escanerAbierto) return;
    const Detector = (window as Window & { BarcodeDetector?: ConstructorDetectorQR }).BarcodeDetector;
    if (!Detector) {
      setErrorQR('Este navegador no permite escanear desde la cámara. Puedes validar el código manualmente.');
      return;
    }

    let vigente = true;
    let stream: MediaStream | null = null;
    let videoElement: HTMLVideoElement | null = null;
    let frame = 0;
    const iniciarCamara = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!vigente) {
          stream.getTracks().forEach((pista) => pista.stop());
          return;
        }
        videoElement = videoRef.current;
        const video = videoElement;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ['qr_code'] });
        const buscar = async () => {
          if (!vigente) return;
          try {
            const [resultado] = await detector.detect(video);
            if (resultado?.rawValue) {
              const codigo = resultado.rawValue.trim();
              setCodigoQR(codigo);
              setEscanerAbierto(false);
              void validarCodigoQR(codigo);
              return;
            }
            frame = requestAnimationFrame(() => { void buscar(); });
          } catch (causa) {
            setEscanerAbierto(false);
            setErrorQR(causa instanceof Error ? causa.message : 'No se pudo leer el código con la cámara.');
          }
        };
        frame = requestAnimationFrame(() => { void buscar(); });
      } catch (causa) {
        if (vigente) setErrorQR(causa instanceof Error ? causa.message : 'No se pudo acceder a la cámara.');
      }
    };
    void iniciarCamara();
    return () => {
      vigente = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((pista) => pista.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [escanerAbierto, validarCodigoQR]);

  const filasAgenda = [
    ...(filtro === 'todas' ? franjasLibres.slice(0, 2).map((franja) => ({ tipo: 'libre' as const, ...franja })) : []),
    ...(filtro === 'todas' ? bloqueos.filter((bloqueo) => bloqueo.fecha === fechaAgenda).map((bloqueo) => ({ tipo: 'bloqueo' as const, bloqueo, ini: bloqueo.hora_inicio })) : []),
    ...citasDiaAgenda
      .filter((cita) => filtro === 'todas' || cita.estado === filtro)
      .map((cita) => ({ tipo: 'cita' as const, cita, ini: cita.hora_inicio })),
  ].sort((a, b) => a.ini.localeCompare(b.ini));

  if (!barbero) {
    return <div className="p-8 text-center text-sm text-[#65716d]">No se encontró el perfil de barbero.</div>;
  }
  const Paginador: React.FC<{ p: ReturnType<typeof paginar>; set: (n: number) => void }> = ({ p, set }) => (
    <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
      <span className="text-xs font-semibold text-[#93A1B1]">
        Mostrando <strong className="text-[#EAF0F6]">{p.desde}–{p.hasta}</strong> de {p.total} citas
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => set(p.pagina - 1)} disabled={p.pagina === 1}
          className="rounded-xl border border-white/12 p-1.5 text-[#93A1B1] transition disabled:opacity-30 enabled:hover:bg-white/5">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: p.totalPaginas }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => set(n)}
            className={`h-8 w-8 rounded-xl text-xs font-black transition ${
              n === p.pagina ? 'bg-amber-400 text-[#1A1400] shadow' : 'border border-white/12 text-[#93A1B1] hover:bg-white/5'
            }`}>{n}</button>
        ))}
        <button onClick={() => set(p.pagina + 1)} disabled={p.pagina === p.totalPaginas}
          className="rounded-xl border border-white/12 p-1.5 text-[#93A1B1] transition disabled:opacity-30 enabled:hover:bg-white/5">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="panel-barbero-dashboard min-h-[70vh] bg-[#f7f8f4] py-4 text-[#172124]">
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6e9e3] bg-gradient-to-r from-[#f7f2e7] to-[#e2f5f4] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-[#3d2c22]">
                <BarberoFoto
                  idBarbero={barbero.id_barbero}
                  nombre={barbero.nombre}
                  fotoUrl={barbero.foto_url}
                  className="h-full w-full object-cover"
                  iconClassName="h-5 w-5 text-white"
                />
              </span>
              <label
                title="Subir foto de perfil"
                aria-label="Subir foto de perfil"
                className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#172124] text-white"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={seleccionarAvatar}
                  disabled={subiendoAvatar}
                />
              </label>
            </div>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 font-heading text-base font-black leading-tight text-[#172124] sm:text-lg">
                {barbero.nombre}
                <span className="rounded-full bg-[#55d7e5] px-2 py-0.5 text-[8px] font-bold text-[#12383c]">{barbero.nivel}</span>
              </h1>
              <p className="truncate text-[9px] text-[#5d6965]">{barbero.rol_titulo} · {barbero.disponible_hoy ? 'Recibiendo citas en línea' : 'En pausa / almuerzo'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => abrirReserva({ barberoId: idBarbero, reservarParaTercero: true })}
              className="flex items-center gap-1 rounded-lg bg-[#55d7e5] px-3 py-2 text-[9px] font-black text-[#12383c] transition hover:bg-[#45cbd9]">
              <Plus className="h-3 w-3" /> Nueva cita
            </button>
            <button onClick={() => void cambiarDisponibilidad()} className="rounded-lg border border-[#d9e2e0] bg-white px-2.5 py-2 text-[9px] font-bold text-[#263532] hover:border-[#55d7e5]" title="Cambiar disponibilidad">
              {barbero.disponible_hoy ? <ToggleRight className="inline h-4 w-4 text-emerald-600" /> : <ToggleLeft className="inline h-4 w-4 text-[#65716d]" />} Disponibilidad
            </button>
            <button onClick={() => abrirBloqueo()} className="rounded-lg border border-[#d9e2e0] bg-white px-3 py-2 text-[9px] font-bold text-[#172124] transition hover:bg-[#f1f8f7]">
              Bloquear horas
            </button>
            <button onClick={() => { setModalQR(true); setCodigoQR(''); setCitaQR(null); setErrorQR(''); setEscanerAbierto(false); }} className="flex items-center gap-1 rounded-lg bg-[#111111] px-3 py-2 text-[9px] font-bold text-white transition hover:bg-[#303030]">
              <QrCode className="h-3 w-3" />
              Escanear QR
            </button>
          </div>
        </section>

        {aviso && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800">{aviso}</p>}
        {errorAgenda && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-800">{errorAgenda}</p>}

        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            { t: 'Citas hoy', v: deHoyTodas.length, s: `${completadas} completadas`, i: CalendarDays, c: 'bg-[#e9ece8] text-[#34403c]' },
            { t: 'Recaudado hoy', v: formatoCOP(ingresos), s: 'Servicios completados', i: Coins, c: 'bg-[#d1f4e7] text-[#117454]' },
            { t: 'Comisión estimada', v: formatoCOP(comision), s: `+${barbero.porcentaje_incremento}% por nivel`, i: Star, c: 'bg-[#55d7e5] text-[#12383c]' },
            { t: 'Tiempo en sillón', v: duracionLegible(minutosOcupados), s: 'Ocupación del día', i: Timer, c: 'bg-[#e9ece8] text-[#34403c]' },
          ].map((k) => (
            <article key={k.t} className="rounded-xl border border-[#e6e9e3] bg-white px-3 py-3 shadow-sm">
              <span className={`float-right flex h-5 w-5 items-center justify-center rounded-md ${k.c}`}><k.i className="h-3 w-3" /></span>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-[#75817c]">{k.t}</p>
              <p className="mt-1 truncate font-heading text-base font-black text-[#172124]">{k.v}</p>
              <p className="text-[8px] text-[#65716d]">{k.s}</p>
            </article>
          ))}
        </section>

        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,.85fr)]">
          <div className="space-y-3">
            <section className="overflow-hidden rounded-xl border border-[#e6e9e3] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0ec] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setFechaAgenda((fecha) => desplazarFecha(fecha, -1))}
                    aria-label="Día anterior" className="rounded-md border border-[#dce4e1] p-1 text-[#394642] hover:bg-[#f1f5f2]">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <label className="flex items-center gap-2">
                    <span className="font-heading text-xs font-black text-[#172124]">{fechaLarga(fechaAgenda)}</span>
                    <input type="date" value={fechaAgenda} onChange={(evento) => setFechaAgenda(evento.target.value)}
                      className="max-w-[135px] rounded-md border border-[#dce4e1] px-2 py-1 text-[9px] text-[#263532]" />
                  </label>
                  <button type="button" onClick={() => setFechaAgenda((fecha) => desplazarFecha(fecha, 1))}
                    aria-label="Día siguiente" className="rounded-md border border-[#dce4e1] p-1 text-[#394642] hover:bg-[#f1f5f2]">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {fechaAgenda !== hoy && (
                    <button type="button" onClick={() => setFechaAgenda(hoy)}
                      className="rounded-md px-2 py-1 text-[8px] font-bold text-[#18889c] hover:bg-[#f1f5f2]">Hoy</button>
                  )}
                </div>
                <div className="flex gap-1">
                  {(['todas', 'pendiente', 'confirmada', 'completada'] as const).map((estado) => (
                    <button key={estado} onClick={() => setFiltro(estado)} className={`rounded-full px-2 py-1 text-[8px] font-bold capitalize transition ${filtro === estado ? 'bg-[#55d7e5] text-[#12383c]' : 'text-[#65716d] hover:bg-[#f1f5f2]'}`}>
                      {estado === 'todas' ? 'Todas' : estado === 'pendiente' ? 'Pendiente' : estado === 'confirmada' ? 'Confirmada' : 'Completada'}
                    </button>
                  ))}
                </div>
              </div>
              {filasAgenda.length ? (
                <div className="divide-y divide-[#edf0ec]">
                  {filasAgenda.map((fila) => {
                    if (fila.tipo === 'libre') {
                      return (
                        <div key={`libre-${fila.ini}`} className="flex min-h-[50px] items-center gap-3 px-3 py-2">
                          <span className="w-11 shrink-0 text-[8px] font-bold text-[#3d4844]">{hora12(fila.ini)}</span>
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-dashed border-[#dce4e1] px-2.5 py-1.5">
                            <div>
                              <p className="text-[9px] font-bold text-[#394642]">Hora libre</p>
                              <p className="text-[8px] text-[#75817c]">Disponible para reservas en línea · {duracionLegible(30)}</p>
                            </div>
                            <button onClick={() => abrirBloqueo(fila)} className="rounded-md border border-[#dce4e1] px-2 py-1 text-[8px] font-semibold text-[#263532] hover:bg-[#f3f7f5]">Bloquear</button>
                          </div>
                        </div>
                      );
                    }
                    if (fila.tipo === 'bloqueo') {
                      return (
                        <div key={`bloqueo-${fila.bloqueo.id_bloqueo}`} className="flex min-h-[50px] items-center gap-3 px-3 py-2">
                          <span className="w-11 shrink-0 text-[8px] font-bold text-[#3d4844]">{hora12(fila.bloqueo.hora_inicio)}</span>
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg bg-[#f2f4f0] px-2.5 py-1.5">
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-[#394642]">Horario bloqueado</p>
                              <p className="truncate text-[8px] text-[#75817c]">{fila.bloqueo.motivo} · hasta {hora12(fila.bloqueo.hora_fin)}</p>
                            </div>
                            <button onClick={() => void eliminarBloqueo(fila.bloqueo)} className="rounded-md p-1 text-[#65716d] hover:bg-white" title="Liberar horario" aria-label="Liberar horario">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                    const cita = fila.cita;
                    const completadaCita = cita.estado === 'completada';
                    return (
                      <article key={`cita-${cita.id_cita}`} className="flex min-h-[50px] items-center gap-3 px-3 py-2">
                        <span className="w-11 shrink-0 text-[8px] font-bold text-[#3d4844]">{hora12(cita.hora_inicio)}</span>
                        <div className={`flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${completadaCita ? 'bg-[#e8f8f1]' : 'bg-[#def7f9]'}`}>
                          <div className="min-w-0">
                            <p className="truncate text-[9px] font-bold text-[#172124]">{cita.cliente_nombre}</p>
                            <p className="truncate text-[8px] text-[#65716d]">{cita.servicio_nombre} · {formatoCOP(cita.precio_total)} · {duracionLegible(cita.duracion_minutos)}</p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {cita.estado === 'en_atencion' ? (
                              <button onClick={() => cambiarEstadoCita(cita.id_cita, 'completada')} className="rounded-md bg-[#128466] px-2 py-1.5 text-[8px] font-bold text-white">Completar</button>
                            ) : ['pendiente', 'confirmada'].includes(cita.estado) ? (
                              <button onClick={() => cambiarEstadoCita(cita.id_cita, 'en_atencion')} className="rounded-md bg-[#111111] px-2 py-1.5 text-[8px] font-bold text-white">Iniciar</button>
                            ) : (
                              <span className={`text-[8px] font-bold ${completadaCita ? 'text-[#16805f]' : 'text-[#65716d]'}`}>{estiloEstado(cita.estado).texto}</span>
                            )}
                            {!['completada', 'cancelada', 'no_asistio'].includes(cita.estado) && (
                              <button
                                onClick={() => cambiarEstadoCita(cita.id_cita, 'no_asistio')}
                                className="rounded-md border border-[#dce4e1] p-1 text-[#65716d] hover:bg-white"
                                title="No asistió"
                                aria-label={`Marcar a ${cita.cliente_nombre} como no asistió`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => verTicket(cita)}
                              className="rounded-md border border-[#dce4e1] px-2 py-1 text-[8px] font-semibold text-[#263532] hover:bg-white"
                            >
                              Detalle
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-7 text-center text-[10px] text-[#65716d]">{citasDiaAgenda.length ? 'No hay citas para este filtro.' : `No tienes citas para el ${fechaLarga(fechaAgenda)}.`}</p>
              )}
            </section>

            <section className="rounded-xl border border-[#e6e9e3] bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-heading text-xs font-black text-[#172124]">Mi semana</h2>
                <span className="text-[8px] text-[#75817c]">Horas agendadas</span>
              </div>
              <div className="grid h-[82px] grid-cols-7 items-end gap-2">
                {actividadSemanal.map((dia, indice) => (
                  <div key={dia.fecha} className="flex h-full flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full max-w-10 rounded-t-md ${dia.fecha === hoy ? 'bg-[#18889c]' : 'bg-[#bdeef2]'}`}
                      style={{ height: `${maxMinutosSemana ? Math.max(6, Math.round(dia.minutos * 58 / maxMinutosSemana)) : 6}px` }}
                      title={`${duracionLegible(dia.minutos)} agendados`}
                    />
                    <span className={`text-[8px] ${dia.fecha === hoy ? 'font-black text-[#18889c]' : 'text-[#75817c]'}`}>{etiquetasDias[indice]}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <section className="rounded-xl bg-[#55d7e5] p-3.5 text-[#12383c] shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-[0.14em]">Siguiente cliente · {siguienteCita ? hora12(siguienteCita.hora_inicio) : 'Sin citas'}</p>
              {siguienteCita ? (
                <>
                  <h2 className="mt-1 truncate font-heading text-sm font-black">{siguienteCita.cliente_nombre}</h2>
                  <p className="truncate text-[9px]">{siguienteCita.servicio_nombre} · {duracionLegible(siguienteCita.duracion_minutos)} · Nivel {barbero.nivel}</p>
                  <div className="mt-2 rounded-md bg-white/60 px-2 py-1.5 text-[8px]">Código {siguienteCita.codigo_reserva} · Pase QR por validar</div>
                  <button
                    onClick={() => cambiarEstadoCita(siguienteCita.id_cita, 'en_atencion')}
                    disabled={siguienteCita.estado === 'en_atencion'}
                    className="mt-2 w-full rounded-lg bg-[#111111] py-2 text-[9px] font-black text-white transition hover:bg-[#303030] disabled:cursor-default disabled:bg-[#128466]"
                  >
                    {siguienteCita.estado === 'en_atencion' ? 'Servicio en curso' : 'Iniciar servicio'}
                  </button>
                </>
              ) : <p className="mt-1 text-[9px]">Tu agenda está libre por ahora.</p>}
            </section>

            <section className="rounded-xl border border-[#e6e9e3] bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-[10px] font-black text-[#172124]">Meta de comisión del día</h2>
                <span className="text-[10px] font-black text-[#18889c]">{avanceComision}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0ec]">
                <div className="h-full rounded-full bg-[#2ec39b] transition-all" style={{ width: `${avanceComision}%` }} />
              </div>
              <p className="mt-1.5 text-[8px] text-[#75817c]">{formatoCOP(comision)} de {formatoCOP(comisionProyectada)} estimados según las citas agendadas.</p>
            </section>

            <section className="rounded-xl border border-[#e6e9e3] bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-heading text-[10px] font-black text-[#172124]">Mis reseñas</h2>
                <span className="text-xs font-black text-[#172124]">{barbero.rating.toFixed(1)} ★</span>
              </div>
              {resenas.length ? (
                <div className="divide-y divide-[#edf0ec]">
                  {resenas.slice(0, 2).map((resena) => (
                    <div key={resena.id_resena} className="py-1.5 first:pt-0 last:pb-0">
                      <p className="line-clamp-2 text-[8px] leading-relaxed text-[#65716d]"><strong className="text-[#394642]">{resena.cliente_nombre} · </strong>{resena.comentario || `${resena.calificacion}/5 estrellas`}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[8px] text-[#75817c]">Aún no tienes reseñas publicadas.</p>}
            </section>
          </aside>
        </section>

        {(proximas.length > 0 || bloqueosProximos.length > 0) && (
          <section className="overflow-hidden rounded-xl border border-[#e6e9e3] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#edf0ec] px-3.5 py-2.5">
              <Users className="h-3.5 w-3.5 text-[#18889c]" />
              <h2 className="font-heading text-xs font-black text-[#172124]">Próximos días</h2>
            </div>
            <div className="divide-y divide-[#edf0ec]">
              {pProx.items.map((cita) => (
                <div key={cita.id_cita} className="flex items-center justify-between gap-3 px-3.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-bold text-[#172124]">{cita.cliente_nombre} · {cita.servicio_nombre}</p>
                    <p className="text-[8px] text-[#65716d]">{fechaLarga(cita.fecha)} · {rangoHorario(cita.hora_inicio, cita.hora_fin)}</p>
                  </div>
                  <span className="shrink-0 text-[9px] font-bold text-[#394642]">{formatoCOP(cita.precio_total)}</span>
                </div>
              ))}
              {bloqueosProximos.map((bloqueo) => (
                <div key={`bloqueo-${bloqueo.id_bloqueo}`} className="flex items-center justify-between gap-3 px-3.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-bold text-[#394642]">Horario bloqueado · {bloqueo.motivo}</p>
                    <p className="text-[8px] text-[#65716d]">{fechaLarga(bloqueo.fecha)} · {rangoHorario(bloqueo.hora_inicio, bloqueo.hora_fin)}</p>
                  </div>
                  <button onClick={() => void eliminarBloqueo(bloqueo)} className="shrink-0 rounded-md p-1 text-[#65716d] hover:bg-[#f1f4f1]" title="Liberar horario" aria-label="Liberar horario">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {proximas.length > 0 && <Paginador p={pProx} set={setPagProx} />}
          </section>
        )}
      </div>

      {modalBloqueo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={(evento) => void guardarBloqueo(evento)} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#18889c]">Agenda del barbero</p>
                <h2 className="font-heading text-lg font-black text-[#172124]">Bloquear horas</h2>
              </div>
              <button type="button" onClick={() => setModalBloqueo(false)} className="rounded-md p-1 text-[#65716d] hover:bg-[#f1f4f1]" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            {errorBloqueo && <p role="alert" className="mb-3 rounded-md bg-rose-50 p-2 text-[10px] font-semibold text-rose-700">{errorBloqueo}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-[9px] font-bold text-[#394642] sm:col-span-3">Fecha
                <input required type="date" min={hoy} max={sumarDiasISO(90)} value={fechaBloqueo} onChange={(evento) => setFechaBloqueo(evento.target.value)} className="mt-1 w-full rounded-md border border-[#dce4e1] px-2.5 py-2 text-xs" />
              </label>
              <label className="text-[9px] font-bold text-[#394642]">Desde
                <input required type="time" value={inicioBloqueo} onChange={(evento) => setInicioBloqueo(evento.target.value)} className="mt-1 w-full rounded-md border border-[#dce4e1] px-2.5 py-2 text-xs" />
              </label>
              <label className="text-[9px] font-bold text-[#394642]">Hasta
                <input required type="time" value={finBloqueo} onChange={(evento) => setFinBloqueo(evento.target.value)} className="mt-1 w-full rounded-md border border-[#dce4e1] px-2.5 py-2 text-xs" />
              </label>
              <label className="text-[9px] font-bold text-[#394642] sm:col-span-3">Motivo
                <input required minLength={3} maxLength={255} value={motivoBloqueo} onChange={(evento) => setMotivoBloqueo(evento.target.value)} className="mt-1 w-full rounded-md border border-[#dce4e1] px-2.5 py-2 text-xs" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setModalBloqueo(false)} className="rounded-md border border-[#dce4e1] px-3 py-2 text-[10px] font-bold text-[#394642]">Cancelar</button>
              <button disabled={guardandoBloqueo} className="rounded-md bg-[#111111] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                <LockKeyhole className="mr-1 inline h-3 w-3" />{guardandoBloqueo ? 'Guardando…' : 'Bloquear franja'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#18889c]">Validación de reserva</p>
                <h2 className="font-heading text-lg font-black text-[#172124]">Escanear QR</h2>
              </div>
              <button type="button" onClick={() => { setModalQR(false); setEscanerAbierto(false); }} className="rounded-md p-1 text-[#65716d] hover:bg-[#f1f4f1]" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
            {escanerAbierto && <video ref={videoRef} autoPlay muted playsInline className="mb-3 aspect-video w-full rounded-lg bg-[#172124] object-cover" />}
            <div className="flex gap-2">
              <button onClick={() => { setErrorQR(''); setEscanerAbierto((abierto) => !abierto); }} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#55d7e5] px-3 py-2 text-[10px] font-bold text-[#12383c]">
                <Camera className="h-3.5 w-3.5" />{escanerAbierto ? 'Cerrar cámara' : 'Abrir cámara'}
              </button>
            </div>
            <form onSubmit={(evento) => { evento.preventDefault(); void validarCodigoQR(codigoQR); }} className="mt-3 flex gap-2">
              <input aria-label="Código de reserva" placeholder="Escribe el código de reserva" value={codigoQR} onChange={(evento) => setCodigoQR(evento.target.value)} className="min-w-0 flex-1 rounded-md border border-[#dce4e1] px-3 py-2 text-xs uppercase outline-none focus:border-[#55d7e5]" />
              <button disabled={validandoQR} className="rounded-md bg-[#111111] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">{validandoQR ? 'Validando…' : 'Validar'}</button>
            </form>
            {errorQR && <p role="alert" className="mt-2 rounded-md bg-rose-50 p-2 text-[10px] font-semibold text-rose-700">{errorQR}</p>}
            {citaQR && (
              <div className="mt-3 rounded-lg border border-[#d7eee8] bg-[#f0faf6] p-3">
                <p className="text-[8px] font-black uppercase tracking-wider text-[#16805f]">Reserva válida · {citaQR.codigo_reserva}</p>
                <p className="mt-1 text-xs font-black text-[#172124]">{citaQR.cliente_nombre}</p>
                <p className="text-[9px] text-[#65716d]">{citaQR.servicio_nombre} · {fechaLarga(citaQR.fecha)} · {rangoHorario(citaQR.hora_inicio, citaQR.hora_fin)}</p>
                <div className="mt-2 flex justify-end">
                  {citaQR.estado === 'en_atencion' ? (
                    <button onClick={() => cambiarEstadoCita(citaQR.id_cita, 'completada')} className="rounded-md bg-[#128466] px-3 py-1.5 text-[9px] font-bold text-white">Completar servicio</button>
                  ) : ['pendiente', 'confirmada'].includes(citaQR.estado) ? (
                    <button onClick={() => cambiarEstadoCita(citaQR.id_cita, 'en_atencion')} className="rounded-md bg-[#111111] px-3 py-1.5 text-[9px] font-bold text-white">Iniciar servicio</button>
                  ) : <span className="text-[9px] font-bold text-[#65716d]">{estiloEstado(citaQR.estado).texto}</span>}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
