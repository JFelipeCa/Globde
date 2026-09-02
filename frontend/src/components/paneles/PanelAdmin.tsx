import React, { useEffect, useState } from 'react';
import {
  Coins, CalendarDays, Scissors, Award, Send, Download, Search, Check, X,
  Pencil, Eye, Ban, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Cita, CategoriaServicio, ClienteBusqueda, EstadoCita } from '../../types';
import {
  formatoCOP, fechaLarga, rangoHorario, duracionLegible, estiloEstado,
  paginar, generarFranjas, franjasVigentes, sumarMinutos, hora12, haySolape, sumarDiasISO, desglosarFecha,
} from '../../utils/helpers';

const POR_PAGINA = 6;

export const PanelAdmin: React.FC = () => {
  const {
    citas, servicios, barberos, facturas, confirmarCita, cambiarEstadoCita,
    cancelarCita, editarCita, agregarServicio, eliminarServicio,
    actualizarNivelBarbero, difusionMasiva, verTicket, franjasOcupadas,
    crearCita, buscarClientes, descargarReporte,
  } = useApp();

  const [seccion, setSeccion] = useState<'resumen' | 'citas' | 'servicios' | 'equipo' | 'avisos'>('resumen');
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [fBarbero, setFBarbero] = useState('todos');
  const [fEstado, setFEstado] = useState('todos');
  const [aviso, setAviso] = useState('');
  const [reporteDescargando, setReporteDescargando] = useState<string | null>(null);

  /* edición */
  const [edit, setEdit] = useState<Cita | null>(null);
  const [eFecha, setEFecha] = useState('');
  const [eHora, setEHora] = useState('');
  const [eBarbero, setEBarbero] = useState(1);
  const [eServicio, setEServicio] = useState(1);
  const [eEstado, setEEstado] = useState<EstadoCita>('confirmada');
  const [eObs, setEObs] = useState('');
  const [eError, setEError] = useState('');

  /* nueva cita (agendamiento manual desde administración) */
  const [modalCita, setModalCita] = useState(false);
  const [nCliente, setNCliente] = useState<ClienteBusqueda | null>(null);
  const [nClienteTexto, setNClienteTexto] = useState('');
  const [nClienteResultados, setNClienteResultados] = useState<ClienteBusqueda[]>([]);
  const [nBuscando, setNBuscando] = useState(false);
  const [nBuscadoYa, setNBuscadoYa] = useState(false);
  const [nErrorBusqueda, setNErrorBusqueda] = useState('');
  const [nBarbero, setNBarbero] = useState(1);
  const [nServicio, setNServicio] = useState(1);
  const [nFecha, setNFecha] = useState('');
  const [nHora, setNHora] = useState('');
  const [nObs, setNObs] = useState('');
  const [nError, setNError] = useState('');
  const [nGuardando, setNGuardando] = useState(false);

  /* nuevo servicio */
  const [modalServ, setModalServ] = useState(false);
  const [sNombre, setSNombre] = useState('');
  const [sCat, setSCat] = useState<CategoriaServicio>('Cortes');
  const [sPrecio, setSPrecio] = useState(25000);
  const [sDur, setSDur] = useState(30);
  const [sDesc, setSDesc] = useState('');

  /* avisos */
  const [aTitulo, setATitulo] = useState('');
  const [aMensaje, setAMensaje] = useState('');

  const ingresos = facturas.reduce((a, f) => a + f.total, 0);
  const completadas = citas.filter((c) => c.estado === 'completada').length;
  const pendientes = citas.filter((c) => c.estado === 'pendiente');
  const efectividad = citas.length ? Math.round((completadas / citas.length) * 100) : 100;

  const filtradas = citas.filter((c) => {
    const t = busqueda.toLowerCase();
    const okTexto = !t || c.cliente_nombre.toLowerCase().includes(t) || c.codigo_reserva.toLowerCase().includes(t) || c.servicio_nombre.toLowerCase().includes(t);
    const okB = fBarbero === 'todos' || String(c.id_barbero) === fBarbero;
    const okE = fEstado === 'todos' || c.estado === fEstado;
    return okTexto && okB && okE;
  });
  const pag = paginar(filtradas, pagina, POR_PAGINA);

  const mostrar = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 4000); };

  const abrirEdicion = (c: Cita) => {
    setEdit(c); setEFecha(c.fecha); setEHora(c.hora_inicio); setEBarbero(c.id_barbero);
    setEServicio(c.id_servicio); setEEstado(c.estado); setEObs(c.observaciones); setEError('');
  };

  const servEdit = servicios.find((s) => s.id_servicio === eServicio) ?? servicios[0];
  const barbEdit = barberos.find((b) => b.id_barbero === eBarbero) ?? barberos[0];
  const ocupEdit = edit ? franjasOcupadas(eFecha, eBarbero) : [];
  const franjasEdit = edit
    ? franjasVigentes(
        generarFranjas(barbEdit.hora_apertura, barbEdit.hora_cierre, 15, servEdit.duracion_minutos),
        eFecha,
      ).map((ini) => {
        const fin = sumarMinutos(ini, servEdit.duracion_minutos);
        const propia = edit.fecha === eFecha && edit.hora_inicio === ini && edit.id_barbero === eBarbero;
        return { ini, fin, libre: propia || !ocupEdit.some((o) => haySolape(ini, fin, o.inicio, o.fin)) };
      })
    : [];

  const servNueva = servicios.find((s) => s.id_servicio === nServicio) ?? servicios[0];
  const barbNueva = barberos.find((b) => b.id_barbero === nBarbero) ?? barberos[0];
  const ocupNueva = modalCita ? franjasOcupadas(nFecha, nBarbero) : [];
  const franjasNueva = modalCita
    ? franjasVigentes(
        generarFranjas(barbNueva.hora_apertura, barbNueva.hora_cierre, 15, servNueva.duracion_minutos),
        nFecha,
      ).map((ini) => {
        const fin = sumarMinutos(ini, servNueva.duracion_minutos);
        return { ini, fin, libre: !ocupNueva.some((o) => haySolape(ini, fin, o.inicio, o.fin)) };
      })
    : [];

  const abrirNuevaCita = () => {
    setModalCita(true);
    setNCliente(null); setNClienteTexto(''); setNClienteResultados([]);
    setNBuscando(false); setNBuscadoYa(false); setNErrorBusqueda('');
    setNBarbero(barberos[0]?.id_barbero ?? 1); setNServicio(servicios[0]?.id_servicio ?? 1);
    setNFecha(sumarDiasISO(0)); setNHora(''); setNObs(''); setNError('');
  };

  // Buscar clientes con un pequeño debounce para no disparar una petición por tecla.
  useEffect(() => {
    if (!modalCita || nCliente || nClienteTexto.trim().length < 2) {
      setNClienteResultados([]); setNBuscadoYa(false); setNErrorBusqueda('');
      return;
    }
    let vigente = true;
    setNBuscando(true); setNBuscadoYa(false); setNErrorBusqueda('');
    const temporizador = setTimeout(() => {
      buscarClientes(nClienteTexto)
        .then((res) => { if (vigente) { setNClienteResultados(res); } })
        .catch(() => { if (vigente) { setNErrorBusqueda('No se pudo buscar clientes. Revisa la conexión con el backend.'); setNClienteResultados([]); } })
        .finally(() => { if (vigente) { setNBuscando(false); setNBuscadoYa(true); } });
    }, 350);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [nClienteTexto, nCliente, modalCita, buscarClientes]);

  const guardarNuevaCita = async () => {
    if (!nCliente) { setNError('Busca y selecciona el cliente para el que se agenda la cita.'); return; }
    if (!nHora) { setNError('Selecciona una franja disponible.'); return; }
    setNGuardando(true);
    const r = await crearCita({
      servicio_id: nServicio, barbero_id: nBarbero, fecha: nFecha, hora_inicio: nHora,
      extras: [], usar_puntos: false, puntos_a_usar: 0,
      nombre: nCliente.nombre, correo: nCliente.correo, telefono: nCliente.telefono || '',
      observaciones: nObs || 'Cita creada por administración', id_cliente: nCliente.id_cliente,
    });
    setNGuardando(false);
    if (!r.ok) { setNError(r.mensaje); return; }
    setModalCita(false);
    mostrar(`Cita agendada para ${nCliente.nombre}.`);
  };

  const guardarEdicion = async () => {
    if (!edit) return;
    const r = await editarCita(edit.id_cita, {
      fecha: eFecha, hora_inicio: eHora, id_barbero: eBarbero,
      id_servicio: eServicio, observaciones: eObs, estado: eEstado,
    });
    if (!r.ok) { setEError(r.mensaje); return; }
    setEdit(null); mostrar('Cita actualizada correctamente.');
  };

  const crearServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await agregarServicio({
      nombre: sNombre, categoria: sCat, descripcion: sDesc || 'Servicio profesional de barbería.',
      precio: Number(sPrecio), duracion_minutos: Number(sDur), icono: '✂️',
      puntos_otorga: Math.round(Number(sPrecio) / 1000), activo: true,
    });
    if (!r.ok) { alert(r.mensaje); return; }
    setModalServ(false); setSNombre(''); setSDesc('');
  };

  const tabs = [
    { id: 'resumen', t: 'Resumen', i: TrendingUp },
    { id: 'citas', t: `Citas (${citas.length})`, i: CalendarDays },
    { id: 'servicios', t: 'Servicios', i: Scissors },
    { id: 'equipo', t: 'Equipo', i: Award },
    { id: 'avisos', t: 'Avisos y reportes', i: Send },
  ] as const;

  const input = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-400/15';

  return (
    <div className="min-h-[70vh] bg-[#0B0F14] py-10">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#141A21] px-3.5 py-1.5 text-xs font-bold text-teal-300 ring-1 ring-white/8">
              <Award className="h-3.5 w-3.5" /> Panel administrativo
            </span>
            <h1 className="font-heading mt-2 text-3xl font-black text-[#EAF0F6]">Control total del negocio</h1>
          </div>
          {pendientes.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5">
              <span className="text-xs font-bold text-amber-200">{pendientes.length} cita(s) por confirmar</span>
              <button onClick={() => { pendientes.forEach((c) => confirmarCita(c.id_cita)); mostrar('Todas las citas pendientes fueron confirmadas.'); }}
                className="rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-black text-[#2B1E04] transition hover:bg-amber-300">
                Confirmar todas
              </button>
            </div>
          )}
        </div>

        {aviso && (
          <div className="anim-aparecer flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3.5 text-sm font-bold text-emerald-300">
            <Check className="h-4 w-4" /> {aviso}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setSeccion(t.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                seccion === t.id ? 'bg-teal-400 text-[#04211F] shadow-lg' : 'border border-white/10 bg-[#141A21] text-[#93A1B1] hover:border-teal-400/40'
              }`}>
              <t.i className="h-4 w-4" /> {t.t}
            </button>
          ))}
        </div>

        {/* RESUMEN */}
        {seccion === 'resumen' && (
          <div className="anim-aparecer space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { t: 'Ingresos totales', v: formatoCOP(ingresos), s: 'Facturación acumulada', i: Coins, c: 'text-emerald-300 bg-emerald-400/12' },
                { t: 'Citas registradas', v: String(citas.length), s: `${completadas} completadas`, i: CalendarDays, c: 'text-teal-300 bg-teal-400/12' },
                { t: 'Efectividad', v: `${efectividad}%`, s: 'Asistencia de clientes', i: TrendingUp, c: 'text-amber-300 bg-amber-400/12' },
                { t: 'Equipo activo', v: String(barberos.length), s: 'Barberos certificados', i: Users, c: 'text-sky-300 bg-sky-400/12' },
              ].map((k) => (
                <div key={k.t} className="card p-5">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${k.c}`}><k.i className="h-5 w-5" /></span>
                  <p className="mt-3 text-[11px] font-bold uppercase text-[#6B7A8C]">{k.t}</p>
                  <p className="font-heading text-2xl font-black text-[#EAF0F6]">{k.v}</p>
                  <p className="text-[11px] text-[#93A1B1]">{k.s}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="card p-6">
                <h3 className="font-heading text-lg font-black text-[#EAF0F6]">Servicios más vendidos</h3>
                <div className="mt-4 space-y-3">
                  {servicios.slice(0, 5).map((s) => {
                    const n = citas.filter((c) => c.id_servicio === s.id_servicio).length;
                    const pct = Math.min(100, n * 25 + 20);
                    return (
                      <div key={s.id_servicio}>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-[#93A1B1]">{s.icono} {s.nombre}</span>
                          <span className="text-[#EAF0F6]">{n} citas</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/6">
                          <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-300 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-heading text-lg font-black text-[#EAF0F6]">Últimas facturas</h3>
                <div className="mt-3 space-y-2">
                  {facturas.slice(0, 5).map((f) => (
                    <div key={f.id_factura} className="flex items-center justify-between rounded-2xl bg-[#0F151C] px-4 py-2.5 text-xs">
                      <div>
                        <p className="font-black text-[#EAF0F6]">{f.numero_factura}</p>
                        <p className="text-[#93A1B1]">{f.cliente_nombre} · {f.servicio_nombre}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-teal-300">{formatoCOP(f.total)}</p>
                        <span className={`text-[10px] font-bold ${f.estado_pago === 'pagado' ? 'text-emerald-300' : 'text-amber-300'}`}>{f.estado_pago}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CITAS */}
        {seccion === 'citas' && (
          <div className="anim-aparecer space-y-4">
            <div className="flex justify-end">
              <button onClick={abrirNuevaCita} className="btn-primario flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black">
                <Plus className="h-4 w-4" /> Nueva cita
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#6B7A8C]" />
                <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  placeholder="Buscar por cliente, código o servicio…" className={input + ' pl-10'} />
              </div>
              <select value={fBarbero} onChange={(e) => { setFBarbero(e.target.value); setPagina(1); }} className={input + ' sm:w-52'}>
                <option value="todos">Todos los barberos</option>
                {barberos.map((b) => <option key={b.id_barbero} value={b.id_barbero}>{b.nombre}</option>)}
              </select>
              <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(1); }} className={input + ' sm:w-48'}>
                <option value="todos">Todos los estados</option>
                {['pendiente', 'confirmada', 'en_atencion', 'completada', 'cancelada', 'no_asistio'].map((e) => (
                  <option key={e} value={e}>{estiloEstado(e).texto}</option>
                ))}
              </select>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0F151C] text-[11px] uppercase tracking-wide text-[#6B7A8C]">
                    <tr>
                      <th className="p-4">Código</th><th className="p-4">Cliente</th><th className="p-4">Servicio</th>
                      <th className="p-4">Barbero</th><th className="p-4">Fecha y franja</th><th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6">
                    {pag.items.map((c) => {
                      const est = estiloEstado(c.estado);
                      const completada = c.estado === 'completada';
                      const cerrada = completada || c.estado === 'cancelada';
                      return (
                        <tr key={c.id_cita} className="transition hover:bg-white/3">
                          <td className="p-4 font-black text-teal-300">{c.codigo_reserva}</td>
                          <td className="p-4">
                            <p className="font-bold text-[#EAF0F6]">{c.cliente_nombre}</p>
                            <p className="text-[11px] text-[#6B7A8C]">{c.cliente_telefono}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-[#EAF0F6]">{c.servicio_nombre}</p>
                            <p className="text-[11px] text-[#6B7A8C]">{duracionLegible(c.duracion_minutos)} · {formatoCOP(c.precio_total)}</p>
                          </td>
                          <td className="p-4 font-semibold text-amber-300">{c.barbero_nombre}</td>
                          <td className="p-4 text-[#93A1B1]">
                            {fechaLarga(c.fecha)}
                            <span className="block text-[11px] font-bold text-[#6B7A8C]">{rangoHorario(c.hora_inicio, c.hora_fin)}</span>
                          </td>
                          <td className="p-4">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${est.clase}`}>{est.texto}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {c.estado === 'pendiente' && (
                                <button onClick={() => { confirmarCita(c.id_cita); mostrar(`Cita ${c.codigo_reserva} confirmada.`); }}
                                  className="flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-1.5 text-[11px] font-black text-[#04211F] transition hover:bg-emerald-300">
                                  <Check className="h-3.5 w-3.5" /> Confirmar
                                </button>
                              )}

                              {completada ? (
                                <button onClick={() => verTicket(c)}
                                  className="flex items-center gap-1 rounded-xl border border-white/12 px-3 py-1.5 text-[11px] font-bold text-[#93A1B1] transition hover:bg-white/5">
                                  <Eye className="h-3.5 w-3.5" /> Ver detalle
                                </button>
                              ) : (
                                <button onClick={() => abrirEdicion(c)}
                                  className="flex items-center gap-1 rounded-xl bg-teal-400/12 px-3 py-1.5 text-[11px] font-black text-teal-300 transition hover:bg-teal-400/20">
                                  <Pencil className="h-3.5 w-3.5" /> Editar
                                </button>
                              )}

                              {!cerrada && (
                                <>
                                  <select value={c.estado} onChange={(e) => cambiarEstadoCita(c.id_cita, e.target.value as Cita['estado'])}
                                    className="rounded-xl border border-white/12 bg-[#0F151C] px-2 py-1.5 text-[11px] font-semibold text-[#93A1B1] outline-none">
                                    <option value="pendiente">Pendiente</option>
                                    <option value="confirmada">Confirmada</option>
                                    <option value="en_atencion">En atención</option>
                                    <option value="completada">Completada</option>
                                    <option value="no_asistio">No asistió</option>
                                  </select>
                                  <button onClick={() => { cancelarCita(c.id_cita, 'Cancelada por administración'); mostrar('Cita cancelada.'); }}
                                    className="rounded-xl border border-rose-400/30 p-1.5 text-rose-300 transition hover:bg-rose-400/10" title="Cancelar">
                                    <Ban className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
                <span className="text-xs font-semibold text-[#93A1B1]">
                  Mostrando <strong className="text-[#EAF0F6]">{pag.desde}–{pag.hasta}</strong> de {pag.total}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPagina(pag.pagina - 1)} disabled={pag.pagina === 1}
                    className="rounded-xl border border-white/12 p-1.5 text-[#93A1B1] disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  {Array.from({ length: pag.totalPaginas }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => setPagina(n)}
                      className={`h-8 w-8 rounded-xl text-xs font-black ${n === pag.pagina ? 'bg-teal-400 text-[#04211F]' : 'border border-white/12 text-[#93A1B1]'}`}>{n}</button>
                  ))}
                  <button onClick={() => setPagina(pag.pagina + 1)} disabled={pag.pagina === pag.totalPaginas}
                    className="rounded-xl border border-white/12 p-1.5 text-[#93A1B1] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SERVICIOS */}
        {seccion === 'servicios' && (
          <div className="anim-aparecer space-y-4">
            <button onClick={() => setModalServ(true)} className="btn-primario flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold">
              <Plus className="h-4 w-4" /> Nuevo servicio
            </button>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servicios.map((s) => (
                <div key={s.id_servicio} className="card p-5">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{s.icono}</span>
                    <button onClick={() => eliminarServicio(s.id_servicio)} className="rounded-lg p-1.5 text-[#5A6878] transition hover:bg-rose-400/10 hover:text-rose-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h4 className="font-heading mt-2 text-base font-black text-[#EAF0F6]">{s.nombre}</h4>
                  <p className="mt-1 text-xs text-[#93A1B1] line-clamp-2">{s.descripcion}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-xs">
                    <span className="font-black text-teal-300">{formatoCOP(s.precio)}</span>
                    <span className="font-semibold text-[#93A1B1]">{duracionLegible(s.duracion_minutos)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EQUIPO */}
        {seccion === 'equipo' && (
          <div className="anim-aparecer grid grid-cols-1 gap-5 md:grid-cols-3">
            {barberos.map((b) => (
              <div key={b.id_barbero} className="card p-6">
                <div className="flex items-center gap-3">
                  <img src={b.foto_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                  <div>
                    <h4 className="font-heading text-base font-black text-[#EAF0F6]">{b.nombre}</h4>
                    <p className="text-xs font-semibold text-teal-300">{b.rol_titulo}</p>
                  </div>
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase text-[#6B7A8C]">Nivel y comisión</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(['Plata', 'Oro', 'Master'] as const).map((n) => (
                    <button key={n} onClick={() => actualizarNivelBarbero(b.id_barbero, n, n === 'Master' ? 20 : n === 'Oro' ? 10 : 0)}
                      className={`rounded-xl py-1.5 text-[11px] font-black transition ${
                        b.nivel === n ? 'bg-amber-400 text-[#2B1E04]' : 'bg-white/6 text-[#93A1B1] hover:bg-white/10'
                      }`}>{n}</button>
                  ))}
                </div>
                <div className="mt-3 space-y-1 rounded-2xl bg-[#0F151C] p-3 text-xs text-[#93A1B1]">
                  <p>Comisión actual: <strong className="text-teal-300">{50 + b.porcentaje_incremento}%</strong></p>
                  <p>Total citas: <strong className="text-[#EAF0F6]">{b.citas_completadas}</strong></p>
                  <p>Rating: <strong className="text-[#EAF0F6]">⭐ {b.rating}</strong></p>
                  <p>Jornada: <strong className="text-[#EAF0F6]">{hora12(b.hora_apertura)} – {hora12(b.hora_cierre)}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AVISOS */}
        {seccion === 'avisos' && (
          <div className="anim-aparecer grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="card p-6">
              <h3 className="font-heading flex items-center gap-2 text-lg font-black text-[#EAF0F6]">
                <Send className="h-5 w-5 text-violet-300" /> Notificación masiva
              </h3>
              <p className="mt-1 text-xs text-[#93A1B1]">Envía promociones o recordatorios a todos los clientes.</p>
              <form onSubmit={async (e) => { e.preventDefault(); const r = await difusionMasiva(aTitulo, aMensaje); if (r.ok) { setATitulo(''); setAMensaje(''); } mostrar(r.mensaje); }}
                className="mt-4 space-y-3">
                <input value={aTitulo} onChange={(e) => setATitulo(e.target.value)} required placeholder="Título del aviso" className={input} />
                <textarea rows={3} value={aMensaje} onChange={(e) => setAMensaje(e.target.value)} required
                  placeholder="Mensaje para tus clientes…" className={input + ' resize-none'} />
                <button type="submit" className="btn-primario w-full rounded-2xl py-2.5 text-sm font-bold">Enviar difusión</button>
              </form>
            </div>

            <div className="card p-6">
              <h3 className="font-heading flex items-center gap-2 text-lg font-black text-[#EAF0F6]">
                <Download className="h-5 w-5 text-teal-300" /> Exportar reportes
              </h3>
              <p className="mt-1 text-xs text-[#93A1B1]">Descarga la información operativa y contable del negocio.</p>
              <div className="mt-4 space-y-2">
                {[
                  { etiqueta: 'Reporte de ingresos y facturación (.csv)', tipo: 'ingresos' as const },
                  { etiqueta: 'Historial de citas por barbero (.csv)', tipo: 'citas' as const },
                  { etiqueta: 'Clientes y puntos de fidelidad (.csv)', tipo: 'clientes' as const },
                ].map((reporte) => (
                  <div key={reporte.tipo} className="flex items-center justify-between rounded-2xl bg-[#0F151C] px-4 py-3 text-xs">
                    <span className="font-semibold text-[#93A1B1]">{reporte.etiqueta}</span>
                    <button onClick={async () => { setReporteDescargando(reporte.tipo); const r = await descargarReporte(reporte.tipo); setReporteDescargando(null); mostrar(r.mensaje); }} disabled={reporteDescargando !== null} className="rounded-xl bg-teal-400/12 px-3 py-1.5 text-[11px] font-black text-teal-300 hover:bg-teal-400/20 disabled:cursor-wait disabled:opacity-50">
                      {reporteDescargando === reporte.tipo ? 'Generando…' : 'Descargar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDITAR CITA */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-start justify-between bg-gradient-to-r from-teal-600 to-teal-400 px-6 py-5 text-[#04211F]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">{edit.codigo_reserva} · {edit.cliente_nombre}</span>
                <h3 className="font-heading text-2xl font-black">Editar cita</h3>
              </div>
              <button onClick={() => setEdit(null)} className="rounded-full bg-[#04211F]/15 p-2 hover:bg-[#04211F]/25"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4 p-6">
              {eError && <p className="rounded-2xl bg-rose-400/10 p-3 text-xs font-bold text-rose-300">{eError}</p>}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Servicio</label>
                  <select value={eServicio} onChange={(e) => { setEServicio(Number(e.target.value)); setEHora(''); }} className={input}>
                    {servicios.map((s) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre} · {duracionLegible(s.duracion_minutos)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Barbero</label>
                  <select value={eBarbero} onChange={(e) => { setEBarbero(Number(e.target.value)); setEHora(''); }} className={input}>
                    {barberos.map((b) => <option key={b.id_barbero} value={b.id_barbero}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Estado de la cita</label>
                <select value={eEstado} onChange={(e) => setEEstado(e.target.value as EstadoCita)} className={input}>
                  {(['pendiente', 'confirmada', 'en_atencion', 'completada', 'no_asistio'] as EstadoCita[]).map((e) => (
                    <option key={e} value={e}>{estiloEstado(e).texto}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#93A1B1]">Fecha</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {Array.from({ length: 10 }, (_, i) => sumarDiasISO(i)).map((d) => {
                    const inf = desglosarFecha(d);
                    return (
                      <button key={d} onClick={() => { setEFecha(d); setEHora(''); }}
                        className={`min-w-[64px] rounded-2xl border px-2.5 py-2 text-center transition ${
                          eFecha === d ? 'border-teal-400 bg-teal-400 text-[#04211F]' : 'border-white/10 bg-[#141A21] text-[#93A1B1]'
                        }`}>
                        <span className="block text-[10px] font-bold uppercase">{inf.esHoy ? 'Hoy' : inf.diaSemanaCorto}</span>
                        <span className="font-heading block text-base font-black">{inf.dia}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#93A1B1]">
                  Nueva franja ({duracionLegible(servEdit.duracion_minutos)})
                </label>
                <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                  {franjasEdit.map((f) => (
                    <button key={f.ini} disabled={!f.libre} onClick={() => setEHora(f.ini)}
                      className={`rounded-xl border px-1.5 py-1.5 text-center text-[11px] transition ${
                        !f.libre ? 'cursor-not-allowed border-white/5 bg-[#0F151C] text-[#3D4855] line-through'
                        : eHora === f.ini ? 'border-teal-400 bg-teal-400 text-[#04211F]'
                        : 'border-white/10 text-[#93A1B1] hover:border-teal-400/50'
                      }`}>
                      <span className="block font-black">{hora12(f.ini)}</span>
                      <span className="block text-[9px] opacity-70">a {hora12(f.fin)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Observaciones</label>
                <input value={eObs} onChange={(e) => setEObs(e.target.value)} className={input} placeholder="Notas internas o del cliente" />
              </div>

              <div className="flex gap-2 border-t border-white/8 pt-4">
                <button onClick={() => setEdit(null)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1] hover:bg-white/5">Cancelar</button>
                <button onClick={guardarEdicion} className="btn-primario flex-1 rounded-2xl py-3 text-sm font-black">Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA (agendamiento manual) */}
      {modalCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-start justify-between bg-gradient-to-r from-teal-600 to-teal-400 px-6 py-5 text-[#04211F]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">Agendamiento manual</span>
                <h3 className="font-heading text-2xl font-black">Nueva cita</h3>
              </div>
              <button onClick={() => setModalCita(false)} className="rounded-full bg-[#04211F]/15 p-2 hover:bg-[#04211F]/25"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4 p-6">
              {nError && <p className="rounded-2xl bg-rose-400/10 p-3 text-xs font-bold text-rose-300">{nError}</p>}

              <div>
                <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Cliente</label>
                {nCliente ? (
                  <div className="flex items-center justify-between rounded-2xl border border-teal-400/40 bg-teal-400/10 px-4 py-3">
                    <div>
                      <p className="font-bold text-[#EAF0F6]">{nCliente.nombre}</p>
                      <p className="text-[11px] text-[#93A1B1]">{nCliente.correo} · {nCliente.telefono || 'sin teléfono'}</p>
                    </div>
                    <button onClick={() => { setNCliente(null); setNClienteTexto(''); }} className="rounded-xl border border-white/12 px-3 py-1.5 text-[11px] font-black text-[#93A1B1] hover:bg-white/5">Cambiar</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#6B7A8C]" />
                    <input value={nClienteTexto} onChange={(e) => setNClienteTexto(e.target.value)}
                      placeholder="Buscar cliente por nombre, correo o teléfono…" className={input + ' pl-10'} />
                    {nClienteTexto.trim().length >= 2 && (nBuscando || nBuscadoYa) && (
                      <div className="mt-1 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-[#0F151C]">
                        {nBuscando && <p className="p-3 text-xs text-[#6B7A8C]">Buscando…</p>}
                        {!nBuscando && nErrorBusqueda && (
                          <p className="p-3 text-xs font-bold text-rose-300">{nErrorBusqueda}</p>
                        )}
                        {!nBuscando && !nErrorBusqueda && nClienteResultados.length === 0 && (
                          <p className="p-3 text-xs text-[#6B7A8C]">Sin resultados. Verifica el dato o registra al cliente primero.</p>
                        )}
                        {!nBuscando && nClienteResultados.map((c) => (
                          <button key={c.id_cliente} onClick={() => { setNCliente(c); setNClienteResultados([]); }}
                            className="flex w-full flex-col items-start px-4 py-2.5 text-left transition hover:bg-white/5">
                            <span className="text-sm font-bold text-[#EAF0F6]">{c.nombre}</span>
                            <span className="text-[11px] text-[#6B7A8C]">{c.correo} · {c.telefono || 'sin teléfono'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Servicio</label>
                  <select value={nServicio} onChange={(e) => { setNServicio(Number(e.target.value)); setNHora(''); }} className={input}>
                    {servicios.map((s) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre} · {duracionLegible(s.duracion_minutos)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Barbero</label>
                  <select value={nBarbero} onChange={(e) => { setNBarbero(Number(e.target.value)); setNHora(''); }} className={input}>
                    {barberos.map((b) => <option key={b.id_barbero} value={b.id_barbero}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#93A1B1]">Fecha</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {Array.from({ length: 10 }, (_, i) => sumarDiasISO(i)).map((d) => {
                    const inf = desglosarFecha(d);
                    return (
                      <button key={d} onClick={() => { setNFecha(d); setNHora(''); }}
                        className={`min-w-[64px] rounded-2xl border px-2.5 py-2 text-center transition ${
                          nFecha === d ? 'border-teal-400 bg-teal-400 text-[#04211F]' : 'border-white/10 bg-[#141A21] text-[#93A1B1]'
                        }`}>
                        <span className="block text-[10px] font-bold uppercase">{inf.esHoy ? 'Hoy' : inf.diaSemanaCorto}</span>
                        <span className="font-heading block text-base font-black">{inf.dia}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#93A1B1]">
                  Franja ({duracionLegible(servNueva.duracion_minutos)})
                </label>
                <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                  {franjasNueva.map((f) => (
                    <button key={f.ini} disabled={!f.libre} onClick={() => setNHora(f.ini)}
                      className={`rounded-xl border px-1.5 py-1.5 text-center text-[11px] transition ${
                        !f.libre ? 'cursor-not-allowed border-white/5 bg-[#0F151C] text-[#3D4855] line-through'
                        : nHora === f.ini ? 'border-teal-400 bg-teal-400 text-[#04211F]'
                        : 'border-white/10 text-[#93A1B1] hover:border-teal-400/50'
                      }`}>
                      <span className="block font-black">{hora12(f.ini)}</span>
                      <span className="block text-[9px] opacity-70">a {hora12(f.fin)}</span>
                    </button>
                  ))}
                  {franjasNueva.length === 0 && (
                    <p className="col-span-full text-xs text-[#6B7A8C]">El barbero no tiene franjas ese día.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Observaciones</label>
                <input value={nObs} onChange={(e) => setNObs(e.target.value)} className={input} placeholder="Notas internas o del cliente" />
              </div>

              <div className="flex gap-2 border-t border-white/8 pt-4">
                <button onClick={() => setModalCita(false)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1] hover:bg-white/5">Cancelar</button>
                <button onClick={guardarNuevaCita} disabled={nGuardando} className="btn-primario flex-1 rounded-2xl py-3 text-sm font-black disabled:opacity-60">
                  {nGuardando ? 'Guardando…' : 'Agendar cita'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO SERVICIO */}
      {modalServ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="flex items-start justify-between bg-gradient-to-r from-teal-600 to-teal-400 px-6 py-5 text-[#04211F]">
              <h3 className="font-heading text-2xl font-black">Nuevo servicio</h3>
              <button onClick={() => setModalServ(false)} className="rounded-full bg-[#04211F]/15 p-2"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={crearServicio} className="space-y-3 p-6">
              <input value={sNombre} onChange={(e) => setSNombre(e.target.value)} required placeholder="Nombre del servicio" className={input} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={sPrecio} onChange={(e) => setSPrecio(Number(e.target.value))} placeholder="Precio" className={input} />
                <input type="number" value={sDur} onChange={(e) => setSDur(Number(e.target.value))} placeholder="Duración (min)" className={input} />
              </div>
              <select value={sCat} onChange={(e) => setSCat(e.target.value as CategoriaServicio)} className={input}>
                {['Cortes', 'Barba', 'Combos', 'Tratamientos', 'Infantil'].map((c) => <option key={c}>{c}</option>)}
              </select>
              <textarea rows={2} value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="Descripción" className={input + ' resize-none'} />
              <button type="submit" className="btn-primario w-full rounded-2xl py-3 text-sm font-black">Guardar servicio</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
