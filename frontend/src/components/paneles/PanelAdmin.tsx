import React, { useCallback, useEffect, useState } from 'react';
import {
  Coins, CalendarDays, Scissors, Award, Send, Download, Search, Check, X,
  Pencil, Eye, Ban, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, Users,
  Gift, Receipt, UserRound, XCircle, LogOut,
  Sun, Moon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Cita, CategoriaServicio, ClienteBusqueda, EstadoCita, Servicio, UsuarioInternoCreate } from '../../types';
import {
  formatoCOP, fechaLarga, rangoHorario, duracionLegible, estiloEstado,
  generarFranjasJornada, franjasVigentes, sumarMinutos, hora12, haySolape, sumarDiasISO, desglosarFecha,
} from '../../utils/helpers';
import { apiRequest } from '../../utils/apiClient';
import { useTheme } from '../../hooks/useTheme';
import { AgendaAdmin } from './AgendaAdmin';

const POR_PAGINA = 6;
const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata', 'otro'] as const;

type EstadoFacturaAdmin = 'pendiente' | 'pagada' | 'anulada' | 'reembolsada';
type MetodoPagoAdmin = (typeof METODOS_PAGO)[number];

interface FacturaAdmin {
  id_factura: number;
  numero_factura: string;
  id_cita: number;
  cliente_nombre: string | null;
  barbero_nombre: string | null;
  servicio_nombre: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: MetodoPagoAdmin;
  estado_pago: EstadoFacturaAdmin;
  fecha_emision: string | null;
  pagado_en: string | null;
}

interface ClienteFidelizacion {
  id_cliente: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  puntos_saldo: number;
  nivel_fidelizacion: string;
  total_citas: number;
  total_pagado: number;
}

interface SaldoPuntos {
  id_cliente: number;
  puntos_saldo: number;
  nivel_fidelizacion: string;
}

interface DashboardAdmin {
  total_citas: number;
  citas_completadas: number;
  citas_pendientes: number;
  total_barberos_disponibles: number;
  ingresos_pagados: number;
}

interface IngresoDia {
  periodo: string;
  total_pagado: number;
}

interface ServicioPopular {
  id_servicio: number;
  nombre: string;
  total_citas: number;
}

interface RespuestaPaginada<T> {
  items: T[];
  total: number;
}

function mapServicioAdmin(registro: Record<string, unknown>, indice: number): Servicio {
  return {
    id_servicio: Number(registro.id_servicio ?? indice + 1),
    nombre: String(registro.nombre ?? `Servicio ${indice + 1}`),
    categoria: String(registro.categoria ?? 'Cortes') as CategoriaServicio,
    descripcion: String(registro.descripcion ?? ''),
    precio: Number(registro.precio ?? 0),
    duracion_minutos: Number(registro.duracion_minutos ?? 0),
    popular: Boolean(registro.popular),
    icono: String(registro.icono ?? '✂️'),
    imagen_url: typeof registro.imagen_url === 'string' ? registro.imagen_url : undefined,
    puntos_otorga: Number(registro.puntos_otorga ?? 0),
    activo: registro.activo !== false,
  };
}

export const PanelAdmin: React.FC = () => {
  const { modoOscuro, alternarModo } = useTheme();
  const {
    usuario, irA, logout, citas, servicios, barberos, confirmarCita, cambiarEstadoCita,
    cancelarCita, editarCita, agregarServicio,
    cambiarEstadoServicio, actualizarPuntosServicio,
    actualizarNivelBarbero, difusionMasiva, verTicket, franjasOcupadas,
    crearCita, buscarClientes, descargarReporte, crearUsuarioInterno,
  } = useApp();

  const [seccion, setSeccion] = useState<'resumen' | 'citas' | 'servicios' | 'equipo' | 'agenda' | 'avisos' | 'puntos' | 'facturacion'>('resumen');
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [fBarbero, setFBarbero] = useState('todos');
  const [fEstado, setFEstado] = useState('todos');
  const [fechaDesdeCitas, setFechaDesdeCitas] = useState('');
  const [fechaHastaCitas, setFechaHastaCitas] = useState('');
  const [citasPagina, setCitasPagina] = useState<Cita[]>([]);
  const [totalCitasFiltradas, setTotalCitasFiltradas] = useState(0);
  const [citasCargando, setCitasCargando] = useState(false);
  const [errorCitas, setErrorCitas] = useState('');
  const [revisionCitas, setRevisionCitas] = useState(0);
  const [aviso, setAviso] = useState('');
  const [reporteDescargando, setReporteDescargando] = useState<string | null>(null);
  const [facturas, setFacturas] = useState<FacturaAdmin[]>([]);
  const [facturasResumen, setFacturasResumen] = useState<FacturaAdmin[]>([]);
  const [totalFacturas, setTotalFacturas] = useState(0);
  const [facturasCargando, setFacturasCargando] = useState(false);
  const [errorFacturas, setErrorFacturas] = useState('');
  const [revisionFacturas, setRevisionFacturas] = useState(0);
  const [busquedaFacturas, setBusquedaFacturas] = useState('');
  const [estadoFacturas, setEstadoFacturas] = useState<'todas' | EstadoFacturaAdmin>('todas');
  const [paginaFacturas, setPaginaFacturas] = useState(1);
  const [facturaPago, setFacturaPago] = useState<FacturaAdmin | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoAdmin>('efectivo');
  const [citaFacturar, setCitaFacturar] = useState<Cita | null>(null);
  const [metodoNuevaFactura, setMetodoNuevaFactura] = useState<MetodoPagoAdmin>('efectivo');
  const [facturaAnular, setFacturaAnular] = useState<FacturaAdmin | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [errorAccionFactura, setErrorAccionFactura] = useState('');
  const [guardandoFactura, setGuardandoFactura] = useState(false);
  const [clientesPuntos, setClientesPuntos] = useState<ClienteFidelizacion[]>([]);
  const [clientesPuntosTotal, setClientesPuntosTotal] = useState(0);
  const [paginaClientesPuntos, setPaginaClientesPuntos] = useState(1);
  const [clientesPuntosCargando, setClientesPuntosCargando] = useState(false);
  const [busquedaPuntos, setBusquedaPuntos] = useState('');
  const [errorPuntos, setErrorPuntos] = useState('');
  const [clientePuntosSeleccionado, setClientePuntosSeleccionado] = useState<ClienteFidelizacion | null>(null);
  const [ajustePuntos, setAjustePuntos] = useState('');
  const [motivoAjustePuntos, setMotivoAjustePuntos] = useState('');
  const [guardandoAjustePuntos, setGuardandoAjustePuntos] = useState(false);
  const [errorAjustePuntos, setErrorAjustePuntos] = useState('');
  const [dashboard, setDashboard] = useState<DashboardAdmin | null>(null);
  const [errorDashboard, setErrorDashboard] = useState('');
  const [dashboardCargando, setDashboardCargando] = useState(true);
  const [ingresosSemanaApi, setIngresosSemanaApi] = useState<IngresoDia[]>([]);
  const [errorIngresos, setErrorIngresos] = useState('');
  const [ingresosCargando, setIngresosCargando] = useState(true);
  const [ingresosDesdeFacturas, setIngresosDesdeFacturas] = useState(false);
  const [serviciosPopulares, setServiciosPopulares] = useState<ServicioPopular[]>([]);
  const [errorServiciosPopulares, setErrorServiciosPopulares] = useState('');
  const [serviciosPopularesCargando, setServiciosPopularesCargando] = useState(true);

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
  const [sPuntos, setSPuntos] = useState(25);
  const [sDesc, setSDesc] = useState('');
  const [serviciosInactivos, setServiciosInactivos] = useState<Servicio[]>([]);
  const [errorServiciosInactivos, setErrorServiciosInactivos] = useState('');
  const [idEditandoPuntosServicio, setIdEditandoPuntosServicio] = useState<number | null>(null);
  const [puntosServicioEditados, setPuntosServicioEditados] = useState('');
  const [guardandoPuntosServicio, setGuardandoPuntosServicio] = useState(false);

  /* avisos */
  const [aTitulo, setATitulo] = useState('');
  const [aMensaje, setAMensaje] = useState('');
  const [aRol, setARol] = useState<'todos' | '1' | '2' | '3'>('3');
  const [aEnviarCorreo, setAEnviarCorreo] = useState(false);
  const [aEnviando, setAEnviando] = useState(false);

  const [modalUsuario, setModalUsuario] = useState(false);
  const [uNombre, setUNombre] = useState('');
  const [uCorreo, setUCorreo] = useState('');
  const [uTelefono, setUTelefono] = useState('');
  const [uContrasena, setUContrasena] = useState('');
  const [uRol, setURol] = useState<UsuarioInternoCreate['id_rol']>(2);
  const [uTitulo, setUTitulo] = useState('');
  const [uExperiencia, setUExperiencia] = useState(0);
  const [uBio, setUBio] = useState('');
  const [uError, setUError] = useState('');
  const [uGuardando, setUGuardando] = useState(false);

  const ingresos = dashboard?.ingresos_pagados ?? 0;
  const completadas = dashboard?.citas_completadas ?? citas.filter((c) => c.estado === 'completada').length;
  const totalCitasDashboard = dashboard?.total_citas ?? citas.length;
  const pendientes = citas.filter((c) => c.estado === 'pendiente');
  const efectividad = totalCitasDashboard ? Math.round((completadas / totalCitasDashboard) * 100) : 100;

  const cargarFacturas = useCallback(async () => {
    setFacturasCargando(true);
    setErrorFacturas('');
    try {
      const resultado = await apiRequest<RespuestaPaginada<FacturaAdmin>>('/facturas?pagina=1&por_pagina=100');
      setFacturasResumen(resultado.items);
      setTotalFacturas(resultado.total);
    } catch (error) {
      setErrorFacturas(error instanceof Error ? error.message : 'No se pudieron cargar las facturas.');
    } finally {
      setFacturasCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarFacturas();
  }, [cargarFacturas]);

  useEffect(() => {
    if (seccion !== 'citas') return;
    const controlador = new AbortController();
    const parametros = new URLSearchParams({
      pagina: String(pagina),
      por_pagina: String(POR_PAGINA),
    });
    if (busqueda.trim()) parametros.set('buscar', busqueda.trim());
    if (fBarbero !== 'todos') parametros.set('id_barbero', fBarbero);
    if (fEstado !== 'todos') parametros.set('estado', fEstado);
    if (fechaDesdeCitas) parametros.set('desde', fechaDesdeCitas);
    if (fechaHastaCitas) parametros.set('hasta', fechaHastaCitas);

    setCitasCargando(true);
    setErrorCitas('');
    apiRequest<RespuestaPaginada<Cita>>(`/citas?${parametros.toString()}`, {
      signal: controlador.signal,
    })
      .then((resultado) => {
        setCitasPagina(resultado.items);
        setTotalCitasFiltradas(resultado.total);
      })
      .catch((error: unknown) => {
        if (!controlador.signal.aborted) {
          setErrorCitas(error instanceof Error ? error.message : 'No se pudieron cargar las citas.');
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCitasCargando(false);
      });
    return () => controlador.abort();
  }, [
    seccion, pagina, busqueda, fBarbero, fEstado, fechaDesdeCitas,
    fechaHastaCitas, revisionCitas,
  ]);

  useEffect(() => {
    if (seccion !== 'servicios') return;
    let vigente = true;
    setErrorServiciosInactivos('');
    apiRequest<Record<string, unknown>[]>('/servicios?activo=false')
      .then((resultado) => {
        if (vigente) {
          setServiciosInactivos(resultado.map((servicio, indice) => mapServicioAdmin(servicio, indice)));
        }
      })
      .catch((error: unknown) => {
        if (vigente) {
          setErrorServiciosInactivos(error instanceof Error ? error.message : 'No se pudieron cargar servicios inactivos.');
        }
      });
    return () => { vigente = false; };
  }, [seccion]);

  useEffect(() => {
    let vigente = true;
    const ahora = new Date();
    const inicio = new Date(ahora);
    inicio.setDate(ahora.getDate() - 6);
    const fechaIso = (fecha: Date) => (
      `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
    );
    const consultas = [
      apiRequest<DashboardAdmin>('/reportes/dashboard/admin')
        .then((resultado) => { if (vigente) setDashboard(resultado); })
        .catch((error: unknown) => { if (vigente) setErrorDashboard(error instanceof Error ? error.message : 'No se pudo cargar el resumen.'); })
        .finally(() => { if (vigente) setDashboardCargando(false); }),
      apiRequest<{ periodos: IngresoDia[] }>(
        `/reportes/ingresos?desde=${fechaIso(inicio)}&hasta=${fechaIso(ahora)}&agrupar_por=dia`,
      ).then((resultado) => {
        if (vigente) setIngresosSemanaApi(resultado.periodos);
      }).catch(async (error: unknown) => {
        try {
          const parametros = new URLSearchParams({
            desde: fechaIso(inicio),
            hasta: fechaIso(ahora),
            estado_pago: 'pagada',
            pagina: '1',
            por_pagina: '100',
          });
          const resultado = await apiRequest<RespuestaPaginada<FacturaAdmin>>(`/facturas?${parametros.toString()}`);
          if (!vigente) return;
          const porDia = resultado.items.reduce<Record<string, number>>((totales, factura) => {
            const fecha = factura.fecha_emision?.slice(0, 10);
            if (fecha) totales[fecha] = (totales[fecha] ?? 0) + factura.total;
            return totales;
          }, {});
          setIngresosSemanaApi(Object.entries(porDia).map(([periodo, total_pagado]) => ({ periodo, total_pagado })));
          setIngresosDesdeFacturas(true);
        } catch (errorRespaldo) {
          if (vigente) {
            const detalleReporte = error instanceof Error ? error.message : 'Reporte no disponible.';
            const detalleFacturas = errorRespaldo instanceof Error ? errorRespaldo.message : 'No se pudieron consultar facturas.';
            setErrorIngresos(`${detalleReporte} ${detalleFacturas}`);
          }
        }
      }).finally(() => { if (vigente) setIngresosCargando(false); }),
      apiRequest<ServicioPopular[]>('/reportes/servicios-populares?limite=4')
        .then((resultado) => { if (vigente) setServiciosPopulares(resultado); })
        .catch((error: unknown) => { if (vigente) setErrorServiciosPopulares(error instanceof Error ? error.message : 'No se pudieron cargar los servicios más vendidos.'); })
        .finally(() => { if (vigente) setServiciosPopularesCargando(false); }),
    ];
    void Promise.all(consultas);
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (seccion !== 'puntos') return;
    let vigente = true;
    setClientesPuntosCargando(true);
    setErrorPuntos('');
    const temporizador = setTimeout(() => {
      const consulta = busquedaPuntos.trim();
      const query = consulta ? `&buscar=${encodeURIComponent(consulta)}` : '';
      apiRequest<RespuestaPaginada<ClienteFidelizacion>>(`/clientes?pagina=${paginaClientesPuntos}&por_pagina=20${query}`)
        .then((resultado) => {
          if (!vigente) return;
          setClientesPuntos(resultado.items);
          setClientesPuntosTotal(resultado.total);
        })
        .catch((error: unknown) => {
          if (vigente) setErrorPuntos(error instanceof Error ? error.message : 'No se pudieron cargar los clientes.');
        })
        .finally(() => { if (vigente) setClientesPuntosCargando(false); });
    }, 250);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [seccion, busquedaPuntos, paginaClientesPuntos]);

  useEffect(() => {
    if (seccion !== 'facturacion') return;
    let vigente = true;
    setFacturasCargando(true);
    setErrorFacturas('');
    const temporizador = setTimeout(() => {
      const parametros = new URLSearchParams({
        pagina: String(paginaFacturas),
        por_pagina: String(POR_PAGINA),
      });
      if (estadoFacturas !== 'todas') parametros.set('estado_pago', estadoFacturas);
      if (busquedaFacturas.trim()) parametros.set('buscar', busquedaFacturas.trim());
      apiRequest<RespuestaPaginada<FacturaAdmin>>(`/facturas?${parametros.toString()}`)
        .then((resultado) => {
          if (!vigente) return;
          setFacturas(resultado.items);
          setTotalFacturas(resultado.total);
        })
        .catch((error: unknown) => {
          if (vigente) setErrorFacturas(error instanceof Error ? error.message : 'No se pudieron cargar las facturas.');
        })
        .finally(() => { if (vigente) setFacturasCargando(false); });
    }, 200);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [seccion, paginaFacturas, estadoFacturas, busquedaFacturas, revisionFacturas]);

  const totalPaginasCitas = Math.max(1, Math.ceil(totalCitasFiltradas / POR_PAGINA));
  const serviciosAdmin = [...servicios, ...serviciosInactivos];
  const pag = {
    items: citasPagina,
    total: totalCitasFiltradas,
    pagina,
    totalPaginas: totalPaginasCitas,
    desde: totalCitasFiltradas ? (pagina - 1) * POR_PAGINA + 1 : 0,
    hasta: Math.min(pagina * POR_PAGINA, totalCitasFiltradas),
  };
  const inicioVentanaPaginas = Math.max(1, Math.min(pagina - 2, totalPaginasCitas - 4));
  const paginasCitas = Array.from(
    { length: Math.min(5, totalPaginasCitas) },
    (_, indice) => inicioVentanaPaginas + indice,
  );

  const mostrar = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 4000); };
  const confirmarDesdeAdmin = async (cita: Cita) => {
    const resultado = await confirmarCita(cita.id_cita);
    if (resultado.ok) {
      mostrar(`Cita ${cita.codigo_reserva} confirmada.`);
      setRevisionCitas((revision) => revision + 1);
    } else {
      mostrar(resultado.mensaje);
    }
  };
  const cambiarEstadoDesdeAdmin = async (idCita: number, estado: EstadoCita) => {
    const resultado = await cambiarEstadoCita(idCita, estado);
    if (resultado.ok) setRevisionCitas((revision) => revision + 1);
    else mostrar(resultado.mensaje);
  };
  const cancelarDesdeAdmin = async (cita: Cita) => {
    const resultado = await cancelarCita(cita.id_cita, 'Cancelada por administración');
    if (resultado.ok) {
      mostrar('Cita cancelada.');
      setRevisionCitas((revision) => revision + 1);
    } else {
      mostrar(resultado.mensaje);
    }
  };

  const guardarAjustePuntos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientePuntosSeleccionado) return;
    const puntos = Number(ajustePuntos);
    if (!Number.isInteger(puntos) || puntos === 0) {
      setErrorAjustePuntos('Ingresa una cantidad entera distinta de cero.');
      return;
    }
    if (motivoAjustePuntos.trim().length < 3) {
      setErrorAjustePuntos('Escribe un motivo de al menos 3 caracteres.');
      return;
    }
    setGuardandoAjustePuntos(true);
    setErrorAjustePuntos('');
    try {
      const saldo = await apiRequest<SaldoPuntos>(
        `/puntos/clientes/${clientePuntosSeleccionado.id_cliente}/ajuste`,
        {
          method: 'POST',
          body: JSON.stringify({ puntos, descripcion: motivoAjustePuntos.trim() }),
        },
      );
      const actualizado = {
        ...clientePuntosSeleccionado,
        puntos_saldo: saldo.puntos_saldo,
        nivel_fidelizacion: saldo.nivel_fidelizacion,
      };
      setClientePuntosSeleccionado(actualizado);
      setClientesPuntos((clientes) => clientes.map((cliente) => (
        cliente.id_cliente === actualizado.id_cliente ? actualizado : cliente
      )));
      setAjustePuntos('');
      setMotivoAjustePuntos('');
      mostrar('El saldo de puntos fue actualizado.');
    } catch (error) {
      setErrorAjustePuntos(error instanceof Error ? error.message : 'No se pudo ajustar el saldo.');
    } finally {
      setGuardandoAjustePuntos(false);
    }
  };

  const registrarPagoFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaPago) return;
    setGuardandoFactura(true);
    setErrorAccionFactura('');
    try {
      const actualizada = await apiRequest<FacturaAdmin>(`/facturas/${facturaPago.id_factura}/pago`, {
        method: 'PATCH',
        body: JSON.stringify({ metodo_pago: metodoPago }),
      });
      setFacturas((actuales) => actuales.map((factura) => (
        factura.id_factura === actualizada.id_factura ? actualizada : factura
      )));
      setFacturasResumen((actuales) => actuales.map((factura) => (
        factura.id_factura === actualizada.id_factura ? actualizada : factura
      )));
      setFacturaPago(null);
      mostrar(`Pago de ${actualizada.numero_factura} registrado.`);
    } catch (error) {
      setErrorAccionFactura(error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      setGuardandoFactura(false);
    }
  };

  const emitirFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citaFacturar) return;
    setGuardandoFactura(true);
    setErrorAccionFactura('');
    try {
      const emitida = await apiRequest<FacturaAdmin>('/facturas', {
        method: 'POST',
        body: JSON.stringify({
          id_cita: citaFacturar.id_cita,
          metodo_pago: metodoNuevaFactura,
          estado_pago: 'pendiente',
        }),
      });
      setFacturas((actuales) => [emitida, ...actuales]);
      setFacturasResumen((actuales) => [emitida, ...actuales].slice(0, 100));
      setTotalFacturas((actual) => actual + 1);
      setCitaFacturar(null);
      setBusquedaFacturas('');
      setEstadoFacturas('todas');
      setPaginaFacturas(1);
      mostrar(`Factura ${emitida.numero_factura} emitida.`);
    } catch (error) {
      setErrorAccionFactura(error instanceof Error ? error.message : 'No se pudo emitir la factura.');
    } finally {
      setGuardandoFactura(false);
    }
  };

  const anularFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaAnular) return;
    if (motivoAnulacion.trim().length < 3) {
      setErrorAccionFactura('El motivo debe tener al menos 3 caracteres.');
      return;
    }
    setGuardandoFactura(true);
    setErrorAccionFactura('');
    try {
      const anulada = await apiRequest<FacturaAdmin>(`/facturas/${facturaAnular.id_factura}/anular`, {
        method: 'POST',
        body: JSON.stringify({ motivo: motivoAnulacion.trim() }),
      });
      setFacturas((actuales) => actuales.map((factura) => (
        factura.id_factura === anulada.id_factura ? anulada : factura
      )));
      setFacturasResumen((actuales) => actuales.map((factura) => (
        factura.id_factura === anulada.id_factura ? anulada : factura
      )));
      setFacturaAnular(null);
      setMotivoAnulacion('');
      mostrar(`Factura ${anulada.numero_factura} anulada.`);
    } catch (error) {
      setErrorAccionFactura(error instanceof Error ? error.message : 'No se pudo anular la factura.');
    } finally {
      setGuardandoFactura(false);
    }
  };

  const hoy = new Date();
  const isoLocal = (fecha: Date) => (
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
  );
  const fechaEncabezado = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'short',
  }).format(hoy);
  const diasSemana = Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - 6 + indice);
    return {
      iso: isoLocal(fecha),
      etiqueta: new Intl.DateTimeFormat('es-CO', { weekday: 'short' }).format(fecha).replace('.', ''),
      esHoy: indice === 6,
    };
  });
  const ventasSemana = diasSemana.map((dia) => ({
    ...dia,
    total: ingresosSemanaApi.find((ingreso) => ingreso.periodo.slice(0, 10) === dia.iso)?.total_pagado ?? 0,
  }));
  const maxVenta = Math.max(...ventasSemana.map((dia) => dia.total), 1);
  const serviciosRanking = serviciosPopulares;
  const totalServiciosRanking = serviciosRanking.reduce((total, servicio) => total + servicio.total_citas, 0);
  const coloresDonut = ['#00BCD4', '#2C8298', '#F3D853', '#B6E9EE'];
  let limiteDonut = 0;
  const donut = totalServiciosRanking
    ? `conic-gradient(${serviciosRanking.map((servicio, indice) => {
        const inicio = limiteDonut;
        limiteDonut += (servicio.total_citas / totalServiciosRanking) * 100;
        return `${coloresDonut[indice % coloresDonut.length]} ${inicio}% ${limiteDonut}%`;
      }).join(', ')})`
    : 'conic-gradient(#DCE7E8 0% 100%)';
  const diasAgenda = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const horasAgenda = [9, 11, 13, 15, 17];
  const celdasAgenda = diasAgenda.flatMap((_, dia) => horasAgenda.map((hora) => {
    const citasEnFranja = citas.filter((cita) => {
      const fecha = new Date(`${cita.fecha}T00:00:00`);
      const diaSemana = (fecha.getDay() + 6) % 7;
      return diaSemana === dia && Number(cita.hora_inicio.slice(0, 2)) >= hora &&
        Number(cita.hora_inicio.slice(0, 2)) < hora + 2 &&
        !['cancelada', 'no_asistio'].includes(cita.estado);
    }).length;
    return { dia, hora, citas: citasEnFranja };
  }));
  const maxCitasFranja = Math.max(...celdasAgenda.map((celda) => celda.citas), 1);
  const citasPorBarbero = barberos.map((barbero) => ({
    ...barbero,
    citas: barbero.citas_completadas,
  }));
  const maxCitasBarbero = Math.max(...citasPorBarbero.map((barbero) => barbero.citas), 1);
  const totalPaginasFacturas = Math.max(1, Math.ceil(totalFacturas / POR_PAGINA));
  const citasFacturables = citas.filter((cita) => (
    cita.estado === 'completada' && !facturasResumen.some((factura) => factura.id_cita === cita.id_cita)
  ));

  const abrirNuevoUsuario = () => {
    setModalUsuario(true); setUNombre(''); setUCorreo(''); setUTelefono(''); setUContrasena('');
    setURol(2); setUTitulo(''); setUExperiencia(0); setUBio(''); setUError('');
  };

  const guardarNuevoUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setUGuardando(true); setUError('');
    const datos: UsuarioInternoCreate = {
      nombre: uNombre.trim(), correo: uCorreo.trim(), telefono: uTelefono,
      contrasena: uContrasena, id_rol: uRol,
      ...(uRol === 2 ? { titulo: uTitulo.trim() || 'Barbero', experiencia_anios: Number(uExperiencia), bio: uBio.trim() || undefined } : {}),
    };
    const r = await crearUsuarioInterno(datos);
    setUGuardando(false);
    if (!r.ok) { setUError(r.mensaje); return; }
    setModalUsuario(false); mostrar(r.mensaje);
  };

  const abrirEdicion = (c: Cita) => {
    setEdit(c); setEFecha(c.fecha); setEHora(c.hora_inicio); setEBarbero(c.id_barbero);
    setEServicio(c.id_servicio); setEEstado(c.estado); setEObs(c.observaciones); setEError('');
  };

  const servEdit = servicios.find((s) => s.id_servicio === eServicio) ?? servicios[0];
  const barbEdit = barberos.find((b) => b.id_barbero === eBarbero) ?? barberos[0];
  const ocupEdit = edit ? franjasOcupadas(eFecha, eBarbero) : [];
  const franjasEdit = edit
    ? franjasVigentes(
        generarFranjasJornada(barbEdit, eFecha, servEdit.duracion_minutos, servEdit.duracion_minutos),
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
        generarFranjasJornada(barbNueva, nFecha, servNueva.duracion_minutos, servNueva.duracion_minutos),
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
    setRevisionCitas((revision) => revision + 1);
    mostrar(`Cita agendada para ${nCliente.nombre}.`);
  };

  const guardarEdicion = async () => {
    if (!edit) return;
    const r = await editarCita(edit.id_cita, {
      fecha: eFecha, hora_inicio: eHora, id_barbero: eBarbero,
      id_servicio: eServicio, observaciones: eObs, estado: eEstado,
    });
    if (!r.ok) { setEError(r.mensaje); return; }
    setEdit(null);
    setRevisionCitas((revision) => revision + 1);
    mostrar('Cita actualizada correctamente.');
  };

  const crearServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await agregarServicio({
      nombre: sNombre, categoria: sCat, descripcion: sDesc || 'Servicio profesional de barbería.',
      precio: Number(sPrecio), duracion_minutos: Number(sDur), icono: '✂️',
      puntos_otorga: Number(sPuntos), activo: true,
    });
    if (!r.ok) { alert(r.mensaje); return; }
    setModalServ(false); setSNombre(''); setSDesc('');
  };

  const alternarServicioAdmin = async (servicio: Servicio) => {
    const nuevoEstado = !servicio.activo;
    const resultado = await cambiarEstadoServicio(servicio.id_servicio, nuevoEstado);
    if (!resultado.ok) {
      mostrar(resultado.mensaje);
      return;
    }
    if (nuevoEstado) {
      setServiciosInactivos((prev) => prev.filter((item) => item.id_servicio !== servicio.id_servicio));
    } else {
      setServiciosInactivos((prev) => [...prev, { ...servicio, activo: false }]);
    }
    mostrar(resultado.mensaje);
  };

  const guardarPuntosServicio = async (servicio: Servicio) => {
    const puntos = Number(puntosServicioEditados);
    if (!Number.isInteger(puntos) || puntos < 0) {
      mostrar('Los puntos deben ser un número entero igual o mayor que cero.');
      return;
    }
    setGuardandoPuntosServicio(true);
    const resultado = await actualizarPuntosServicio(servicio.id_servicio, puntos);
    setGuardandoPuntosServicio(false);
    if (!resultado.ok) {
      mostrar(resultado.mensaje);
      return;
    }
    setServiciosInactivos((prev) => prev.map((item) => (
      item.id_servicio === servicio.id_servicio ? { ...item, puntos_otorga: puntos } : item
    )));
    setIdEditandoPuntosServicio(null);
    setPuntosServicioEditados('');
    mostrar(resultado.mensaje);
  };

  const tabs = [
    { id: 'resumen', t: 'Resumen', i: TrendingUp },
    { id: 'citas', t: `Citas (${dashboard?.total_citas ?? citas.length})`, i: CalendarDays },
    { id: 'servicios', t: 'Servicios', i: Scissors },
    { id: 'equipo', t: 'Equipo', i: Award },
    { id: 'agenda', t: 'Agenda', i: CalendarDays },
    { id: 'avisos', t: 'Avisos y reportes', i: Send },
    { id: 'puntos', t: 'Club de puntos', i: Gift },
    { id: 'facturacion', t: 'Facturación', i: Receipt },
  ] as const;

  const titulos: Record<typeof seccion, string> = {
    resumen: 'Control total del negocio',
    citas: 'Gestión de citas',
    servicios: 'Catálogo de servicios',
    equipo: 'Equipo interno',
    agenda: 'Horarios y cierres',
    avisos: 'Avisos y reportes',
    puntos: 'Club de puntos',
    facturacion: 'Facturación',
  };
  const input = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-400/15';

  return (
    <div className="panel-dashboard panel-admin min-h-screen bg-[#0B0F14]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="admin-sidebar flex flex-col bg-[#0B0B0B] p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:min-h-[520px]">
          <button onClick={() => irA('inicio')} className="mb-5 flex items-center gap-3 px-2 text-left">
            <div className="min-w-0">
              <p className="font-heading text-sm font-black tracking-wide">GLOBDE</p>
              <p className="mt-1 border border-cyan-400/60 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Panel admin</p>
            </div>
          </button>
          <nav aria-label="Secciones administrativas" className="flex gap-1.5 overflow-x-auto lg:flex-col">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setSeccion(t.id); setPaginaFacturas(1); }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                  seccion === t.id ? 'bg-cyan-400 text-[#06232A]' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}>
                <t.i className="h-4 w-4 shrink-0" /> {t.t}
              </button>
            ))}
          </nav>
          <div className="mt-5 flex items-center justify-between gap-2 rounded-xl bg-[#1B2024] p-2.5 lg:mt-auto">
            <div className="flex min-w-0 items-center gap-2">
              {usuario?.avatar_url
                ? <img src={usuario.avatar_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-xs font-black text-[#06232A]">
                    {(usuario?.nombre[0] ?? 'A').toUpperCase()}
                  </span>}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{usuario?.nombre ?? 'Administrador'}</p>
                <p className="text-[10px] text-slate-400">Administrador</p>
              </div>
            </div>
            <button onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-5 bg-[#F5F6F2] p-5 sm:p-7 lg:p-9">
          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-semibold text-slate-500">Panel administrativo · {fechaEncabezado}</p>
              <h1 className="font-heading mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{titulos[seccion]}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={alternarModo}
                aria-label={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-cyan-400"
              >
                {modoOscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {pendientes.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
                  <span className="text-[10px] font-bold text-slate-700">{pendientes.length} cita(s) por confirmar</span>
                  <button onClick={() => { pendientes.forEach((c) => confirmarCita(c.id_cita)); mostrar('Todas las citas pendientes fueron confirmadas.'); }}
                    className="text-[10px] font-black text-slate-950 hover:text-cyan-800">
                    Confirmar todas
                  </button>
                </div>
              )}
              {seccion === 'resumen' && (
                <button onClick={async () => {
                  setReporteDescargando('ingresos');
                  const resultado = await descargarReporte('ingresos');
                  setReporteDescargando(null);
                  mostrar(resultado.mensaje);
                }} disabled={reporteDescargando !== null}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50">
                  {reporteDescargando === 'ingresos' ? 'Generando…' : 'Exportar reporte'}
                </button>
              )}
            </div>
          </header>

          {aviso && (
            <div className="anim-aparecer flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <Check className="h-4 w-4" /> {aviso}
            </div>
          )}

          {/* RESUMEN */}
          {seccion === 'resumen' && (
            <div className="anim-aparecer space-y-4">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                  { t: 'Ingresos totales', v: dashboard ? formatoCOP(ingresos) : dashboardCargando ? '…' : '—', s: 'Facturas pagadas', i: Coins, color: 'bg-emerald-100 text-emerald-600' },
                  { t: 'Citas registradas', v: dashboard ? String(totalCitasDashboard) : dashboardCargando ? '…' : String(citas.length), s: `${completadas} completadas`, i: CalendarDays, color: 'bg-emerald-100 text-emerald-600' },
                  { t: 'Efectividad', v: dashboardCargando ? '…' : `${efectividad}%`, s: 'Citas completadas', i: TrendingUp, color: 'bg-cyan-100 text-cyan-600' },
                  { t: 'Equipo activo', v: dashboard ? String(dashboard.total_barberos_disponibles) : dashboardCargando ? '…' : String(barberos.filter((b) => b.disponible_hoy).length), s: 'Barberos disponibles', i: Users, color: 'bg-cyan-50 text-cyan-600' },
                ].map((k) => (
                  <div key={k.t} className="card min-h-28 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{k.t}</p>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md ${k.color}`}><k.i className="h-3 w-3" /></span>
                    </div>
                    <p className="font-heading mt-2 text-xl font-black text-slate-950">{k.v}</p>
                    <p className="text-[9px] text-slate-500">{k.s}</p>
                  </div>
                ))}
              </div>
              {errorDashboard && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10px] font-semibold text-rose-800">{errorDashboard}</div>
              )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
                <section className="card min-h-56 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-heading text-sm font-black text-slate-950">Ingresos de la semana</h2>
                    <span className="text-[9px] text-slate-500">Últimos 7 días · facturas pagadas</span>
                  </div>
                  {ingresosCargando ? (
                    <p className="py-12 text-center text-xs text-slate-500">Cargando ingresos…</p>
                  ) : errorIngresos ? (
                    <p className="py-12 text-center text-xs text-rose-700">{errorIngresos}</p>
                  ) : (
                    <div className="flex h-40 items-end justify-between gap-3" aria-label="Ingresos por día de la semana">
                      {ventasSemana.map((dia) => (
                        <div key={dia.iso} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                          <span className="text-[9px] font-semibold text-slate-500">{dia.total ? formatoCOP(dia.total) : ''}</span>
                          <div className={`w-full max-w-20 rounded-t-md ${dia.esHoy ? 'bg-cyan-700' : 'bg-cyan-200'}`}
                            style={{ height: `${Math.max(7, (dia.total / maxVenta) * 76)}%` }}
                            title={`${dia.etiqueta}: ${formatoCOP(dia.total)}`} />
                          <span className={`text-[9px] ${dia.esHoy ? 'font-black text-cyan-800' : 'text-slate-500'}`}>
                            {dia.esHoy ? 'Hoy' : dia.etiqueta}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {ingresosDesdeFacturas && !errorIngresos && (
                    <p className="mt-2 text-[9px] text-amber-700">Datos calculados desde facturas; el reporte de ingresos no respondió.</p>
                  )}
                </section>

                <section className="card min-h-56 p-5">
                  <h2 className="font-heading text-sm font-black text-slate-950">Servicios más vendidos</h2>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-20 w-20 shrink-0 rounded-full"
                      style={{ background: donut }} role="img" aria-label="Distribución de citas por servicio">
                      <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white">
                        <strong className="text-sm text-slate-950">{totalServiciosRanking}</strong>
                        <span className="text-[8px] text-slate-500">citas</span>
                      </div>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      {serviciosPopularesCargando && <p className="text-[10px] text-slate-500">Cargando servicios…</p>}
                      {serviciosRanking.map((servicio, indice) => (
                        <div key={servicio.id_servicio} className="flex items-center gap-1.5 text-[9px]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: coloresDonut[indice % coloresDonut.length] }} />
                          <span className="truncate text-slate-600">{servicio.nombre}</span>
                            <strong className="ml-auto text-slate-800">{servicio.total_citas}</strong>
                        </div>
                      ))}
                        {errorServiciosPopulares
                          ? <p className="text-[10px] text-rose-700">No se pudo cargar el ranking.</p>
                          : serviciosRanking.length === 0 && <p className="text-[10px] text-slate-500">Sin citas registradas.</p>}
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <section className="card min-h-48 p-5">
                  <h2 className="font-heading text-sm font-black text-slate-950">Horas con más citas</h2>
                  <div className="mt-3 grid grid-cols-7 gap-1" aria-label="Mapa de calor de citas por día y hora">
                    {diasAgenda.map((dia) => <span key={dia} className="text-center text-[8px] text-slate-500">{dia}</span>)}
                    {celdasAgenda.map((celda) => {
                      const intensidad = celda.citas / maxCitasFranja;
                      return <span key={`${celda.dia}-${celda.hora}`}
                        title={`${diasAgenda[celda.dia]} · ${celda.hora}:00: ${celda.citas} citas`}
                        className="h-4 rounded-[3px]"
                        style={{ backgroundColor: celda.citas ? `rgba(15, 112, 145, ${0.15 + intensidad * 0.8})` : '#E5EFF0' }} />;
                    })}
                  </div>
                  <p className="mt-2 text-[8px] text-slate-500">Franjas de 9:00 a. m. a 7:00 p. m.</p>
                </section>

                <section className="card min-h-48 p-5">
                  <h2 className="font-heading text-sm font-black text-slate-950">Equipo</h2>
                  <div className="mt-3 space-y-3">
                    {citasPorBarbero.slice(0, 3).map((barbero) => (
                      <div key={barbero.id_barbero}>
                        <div className="flex justify-between gap-2 text-[9px]">
                          <span className="truncate font-semibold text-slate-700">{barbero.nombre}</span>
                          <span className="shrink-0 text-slate-500">{barbero.citas} completadas</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-yellow-300"
                            style={{ width: `${Math.max(5, (barbero.citas / maxCitasBarbero) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    {citasPorBarbero.length === 0 && <p className="text-[10px] text-slate-500">No hay barberos registrados.</p>}
                  </div>
                </section>

                <section className="card min-h-48 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-sm font-black text-slate-950">Últimas facturas</h2>
                    <button onClick={() => setSeccion('facturacion')} className="text-[9px] font-bold text-cyan-800 hover:underline">Ver todas</button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {facturasCargando && <p className="py-4 text-center text-[10px] text-slate-500">Cargando…</p>}
                    {!facturasCargando && errorFacturas && <p className="py-4 text-center text-[10px] text-rose-700">{errorFacturas}</p>}
                    {!facturasCargando && !errorFacturas && facturasResumen.slice(0, 2).map((factura) => (
                      <div key={factura.id_factura} className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[9px]">
                        <div className="min-w-0">
                          <p className="font-black text-slate-800">{factura.numero_factura}</p>
                          <p className="truncate text-slate-500">{factura.cliente_nombre} · {factura.servicio_nombre}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-black text-slate-900">{formatoCOP(factura.total)}</p>
                          <span className={factura.estado_pago === 'pagada' ? 'text-emerald-700' : 'text-cyan-800'}>
                            {factura.estado_pago}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!facturasCargando && !errorFacturas && facturasResumen.length === 0 && <p className="py-4 text-center text-[10px] text-slate-500">Sin facturas.</p>}
                  </div>
                </section>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
              <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-semibold text-[#93A1B1]">
                Desde
                <input type="date" value={fechaDesdeCitas}
                  max={fechaHastaCitas || undefined}
                  onChange={(e) => { setFechaDesdeCitas(e.target.value); setPagina(1); }}
                  className={input} />
              </label>
              <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-semibold text-[#93A1B1]">
                Hasta
                <input type="date" value={fechaHastaCitas}
                  min={fechaDesdeCitas || undefined}
                  onChange={(e) => { setFechaHastaCitas(e.target.value); setPagina(1); }}
                  className={input} />
              </label>
              {(fechaDesdeCitas || fechaHastaCitas) && (
                <button type="button" onClick={() => {
                  setFechaDesdeCitas('');
                  setFechaHastaCitas('');
                  setPagina(1);
                }} className="rounded-xl border border-white/12 px-3 py-2 text-xs font-bold text-[#93A1B1] hover:bg-white/5">
                  Limpiar fechas
                </button>
              )}
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
                    {citasCargando ? (
                      <tr><td colSpan={7} className="p-10 text-center text-sm text-[#93A1B1]">Cargando citas…</td></tr>
                    ) : errorCitas ? (
                      <tr><td colSpan={7} role="alert" className="p-10 text-center text-sm text-rose-300">{errorCitas}</td></tr>
                    ) : pag.items.length === 0 ? (
                      <tr><td colSpan={7} className="p-10 text-center text-sm text-[#93A1B1]">No hay citas que coincidan con los filtros.</td></tr>
                    ) : pag.items.map((c) => {
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
                                <button onClick={() => void confirmarDesdeAdmin(c)}
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
                                  <select value={c.estado} onChange={(e) => void cambiarEstadoDesdeAdmin(c.id_cita, e.target.value as EstadoCita)}
                                    className="rounded-xl border border-white/12 bg-[#0F151C] px-2 py-1.5 text-[11px] font-semibold text-[#93A1B1] outline-none">
                                    <option value="pendiente">Pendiente</option>
                                    <option value="confirmada">Confirmada</option>
                                    <option value="en_atencion">En atención</option>
                                    <option value="completada">Completada</option>
                                    <option value="no_asistio">No asistió</option>
                                  </select>
                                  <button onClick={() => void cancelarDesdeAdmin(c)}
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
                  {paginasCitas.map((n) => (
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
            {errorServiciosInactivos && (
              <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs font-semibold text-rose-300">{errorServiciosInactivos}</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {serviciosAdmin.map((s) => (
                <div key={s.id_servicio} className="card p-5">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{s.icono}</span>
                    <button onClick={() => void alternarServicioAdmin(s)}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                        s.activo
                          ? 'text-rose-300 hover:bg-rose-400/10'
                          : 'bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                      }`}>
                      {s.activo ? <><Trash2 className="mr-1 inline h-3.5 w-3.5" />Desactivar</> : 'Reactivar'}
                    </button>
                  </div>
                  <h4 className="font-heading mt-2 text-base font-black text-[#EAF0F6]">{s.nombre}</h4>
                  <p className="mt-1 text-xs text-[#93A1B1] line-clamp-2">{s.descripcion}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-xs">
                    <span className="font-black text-teal-300">{formatoCOP(s.precio)}</span>
                    <span className="font-semibold text-[#93A1B1]">{duracionLegible(s.duracion_minutos)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-3">
                    {idEditandoPuntosServicio === s.id_servicio ? (
                      <>
                        <label className="flex items-center gap-2 text-[10px] font-semibold text-[#93A1B1]">
                          Puntos por cita completada
                          <input type="number" min={0} step={1} value={puntosServicioEditados}
                            onChange={(evento) => setPuntosServicioEditados(evento.target.value)}
                            className="w-20 rounded-lg border border-white/10 bg-[#0F151C] px-2 py-1.5 text-xs text-[#EAF0F6]" />
                        </label>
                        <button type="button" disabled={guardandoPuntosServicio}
                          onClick={() => void guardarPuntosServicio(s)}
                          className="rounded-lg bg-teal-400 px-2.5 py-1.5 text-[10px] font-black text-[#04211F] disabled:opacity-50">
                          Guardar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-semibold text-[#93A1B1]">{s.puntos_otorga} puntos</span>
                        <button type="button" onClick={() => {
                          setIdEditandoPuntosServicio(s.id_servicio);
                          setPuntosServicioEditados(String(s.puntos_otorga));
                        }} className="rounded-lg border border-white/12 px-2.5 py-1.5 text-[10px] font-bold text-[#93A1B1] hover:bg-white/5">
                          Configurar puntos
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {serviciosAdmin.length === 0 && !errorServiciosInactivos && (
                <p className="card col-span-full p-8 text-center text-sm text-[#93A1B1]">No hay servicios registrados.</p>
              )}
            </div>
          </div>
        )}

        {/* EQUIPO */}
        {seccion === 'equipo' && (
          <div className="anim-aparecer space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-black text-[#EAF0F6]">Equipo interno</h2>
                <p className="text-xs text-[#93A1B1]">Crea accesos para administradores y barberos.</p>
              </div>
              <button onClick={abrirNuevoUsuario} className="btn-primario flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold">
                <Plus className="h-4 w-4" /> Crear perfil
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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
          </div>
        )}

        {seccion === 'agenda' && <AgendaAdmin barberos={barberos} />}

        {/* AVISOS */}
        {seccion === 'avisos' && (
          <div className="anim-aparecer grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="card p-6">
              <h3 className="font-heading flex items-center gap-2 text-lg font-black text-[#EAF0F6]">
                <Send className="h-5 w-5 text-violet-300" /> Notificación masiva
              </h3>
              <p className="mt-1 text-xs text-[#93A1B1]">Elige destinatarios y define si también se envía por correo.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setAEnviando(true);
                const rol = aRol === 'todos' ? null : Number(aRol);
                const r = await difusionMasiva(aTitulo, aMensaje, rol, aEnviarCorreo);
                setAEnviando(false);
                if (r.ok) { setATitulo(''); setAMensaje(''); }
                mostrar(r.mensaje);
              }}
                className="mt-4 space-y-3">
                <select value={aRol} onChange={(e) => setARol(e.target.value as typeof aRol)} className={input}>
                  <option value="3">Clientes</option>
                  <option value="2">Barberos</option>
                  <option value="1">Administradores</option>
                  <option value="todos">Todos los usuarios activos</option>
                </select>
                <input value={aTitulo} onChange={(e) => setATitulo(e.target.value)} required placeholder="Título del aviso" className={input} />
                <textarea rows={3} value={aMensaje} onChange={(e) => setAMensaje(e.target.value)} required
                  placeholder="Mensaje para los destinatarios…" className={input + ' resize-none'} />
                <label className="flex items-center gap-2 text-xs font-semibold text-[#93A1B1]">
                  <input type="checkbox" checked={aEnviarCorreo} onChange={(e) => setAEnviarCorreo(e.target.checked)}
                    className="h-4 w-4 accent-cyan-500" />
                  Enviar también por correo electrónico
                </label>
                <button type="submit" disabled={aEnviando}
                  className="btn-primario w-full rounded-2xl py-2.5 text-sm font-bold disabled:cursor-wait disabled:opacity-50">
                  {aEnviando ? 'Enviando…' : 'Enviar difusión'}
                </button>
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

        {seccion === 'puntos' && (
          <div className="anim-aparecer grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
            <section className="card overflow-hidden">
              <div className="border-b border-slate-100 p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input value={busquedaPuntos} onChange={(e) => {
                      setBusquedaPuntos(e.target.value);
                      setPaginaClientesPuntos(1);
                      setClientePuntosSeleccionado(null);
                    }}
                      placeholder="Buscar cliente por nombre, correo o teléfono" className={input + ' pl-10'} />
                  </div>
                  <button onClick={async () => {
                    setReporteDescargando('clientes');
                    const resultado = await descargarReporte('clientes');
                    setReporteDescargando(null);
                    mostrar(resultado.mensaje);
                  }} disabled={reporteDescargando !== null}
                    className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {reporteDescargando === 'clientes' ? 'Generando…' : 'Exportar puntos'}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Mostrando {clientesPuntos.length} de {clientesPuntosTotal} cliente(s).
                </p>
              </div>
              {errorPuntos && <p className="m-4 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{errorPuntos}</p>}
              {clientesPuntosCargando ? (
                <p className="p-8 text-center text-xs text-slate-500">Buscando clientes…</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {clientesPuntos.map((cliente) => (
                    <button key={cliente.id_cliente} onClick={() => {
                      setClientePuntosSeleccionado(cliente);
                      setAjustePuntos('');
                      setMotivoAjustePuntos('');
                      setErrorAjustePuntos('');
                    }}
                      className={`flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-cyan-50 ${
                        clientePuntosSeleccionado?.id_cliente === cliente.id_cliente ? 'bg-cyan-50' : ''
                      }`}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-800">{cliente.nombre}</span>
                          <span className="block truncate text-[10px] text-slate-500">{cliente.correo}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <strong className="block text-xs text-slate-900">{cliente.puntos_saldo} pts</strong>
                        <span className="text-[9px] text-cyan-800">{cliente.nivel_fidelizacion}</span>
                      </span>
                    </button>
                  ))}
                  {!clientesPuntosCargando && !errorPuntos && clientesPuntos.length === 0 && (
                    <p className="p-8 text-center text-xs text-slate-500">No se encontraron clientes.</p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <span className="text-[9px] text-slate-500">
                  Página {paginaClientesPuntos} de {Math.max(1, Math.ceil(clientesPuntosTotal / 20))}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPaginaClientesPuntos((actual) => actual - 1)}
                    disabled={paginaClientesPuntos <= 1 || clientesPuntosCargando}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPaginaClientesPuntos((actual) => actual + 1)}
                    disabled={paginaClientesPuntos >= Math.ceil(clientesPuntosTotal / 20) || clientesPuntosCargando}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="font-heading text-base font-black text-slate-950">Ajustar saldo</h2>
              {!clientePuntosSeleccionado ? (
                <div className="mt-8 text-center">
                  <Gift className="mx-auto h-8 w-8 text-cyan-600" />
                  <p className="mt-2 text-xs text-slate-500">Selecciona un cliente para consultar su saldo y registrar un ajuste.</p>
                </div>
              ) : (
                <>
                  <div className="mt-4 rounded-xl bg-cyan-50 p-4">
                    <p className="text-xs font-bold text-slate-800">{clientePuntosSeleccionado.nombre}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{clientePuntosSeleccionado.correo}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <span className="text-[10px] text-slate-600">Saldo actual</span>
                      <strong className="font-heading text-2xl font-black text-cyan-800">{clientePuntosSeleccionado.puntos_saldo} pts</strong>
                    </div>
                    <p className="text-right text-[9px] text-slate-500">Nivel {clientePuntosSeleccionado.nivel_fidelizacion}</p>
                  </div>
                  <form onSubmit={guardarAjustePuntos} className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-600">Ajuste de puntos</label>
                      <input type="number" step="1" required value={ajustePuntos}
                        onChange={(e) => setAjustePuntos(e.target.value)} className={input}
                        placeholder="Ej. 50 para sumar o -20 para descontar" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-slate-600">Motivo (queda registrado)</label>
                      <textarea required minLength={3} maxLength={255} rows={3}
                        value={motivoAjustePuntos} onChange={(e) => setMotivoAjustePuntos(e.target.value)}
                        className={input + ' resize-none'} placeholder="Describe la razón del ajuste" />
                    </div>
                    {errorAjustePuntos && <p className="rounded-lg bg-rose-50 p-2.5 text-[10px] font-semibold text-rose-700">{errorAjustePuntos}</p>}
                    <button type="submit" disabled={guardandoAjustePuntos}
                      className="w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-[#06232A] transition hover:bg-cyan-400 disabled:opacity-50">
                      {guardandoAjustePuntos ? 'Guardando…' : 'Registrar ajuste'}
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        )}

        {seccion === 'facturacion' && (
          <div className="anim-aparecer space-y-4">
            {errorFacturas && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <span>{errorFacturas}</span>
                <button onClick={() => {
                  void cargarFacturas();
                  setRevisionFacturas((revision) => revision + 1);
                }} className="font-black underline">Reintentar</button>
              </div>
            )}
            <section className="card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input value={busquedaFacturas} onChange={(e) => { setBusquedaFacturas(e.target.value); setPaginaFacturas(1); }}
                    placeholder="Buscar por factura, cliente o código de cita" className={input + ' pl-10'} />
                </div>
                <select value={estadoFacturas} onChange={(e) => {
                  setEstadoFacturas(e.target.value as 'todas' | EstadoFacturaAdmin);
                  setPaginaFacturas(1);
                }} className={input + ' lg:w-48'}>
                  <option value="todas">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="anulada">Anulada</option>
                  <option value="reembolsada">Reembolsada</option>
                </select>
                <button onClick={() => {
                  void cargarFacturas();
                  setRevisionFacturas((revision) => revision + 1);
                }} disabled={facturasCargando}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {facturasCargando ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-xs">
                  <thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-3">Factura</th><th className="p-3">Cliente / servicio</th>
                      <th className="p-3">Emisión</th><th className="p-3">Total</th>
                      <th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facturas.map((factura) => (
                      <tr key={factura.id_factura} className="hover:bg-slate-50">
                        <td className="p-3">
                          <strong className="block text-slate-900">{factura.numero_factura}</strong>
                          <span className="text-[9px] text-slate-500">{factura.metodo_pago}</span>
                        </td>
                        <td className="p-3">
                          <strong className="block text-slate-800">{factura.cliente_nombre ?? 'Cliente'}</strong>
                          <span className="text-[9px] text-slate-500">{factura.servicio_nombre ?? 'Servicio'}</span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {factura.fecha_emision ? fechaLarga(factura.fecha_emision.slice(0, 10)) : '—'}
                        </td>
                        <td className="p-3 font-black text-slate-900">{formatoCOP(factura.total)}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                            factura.estado_pago === 'pagada' ? 'bg-emerald-100 text-emerald-800'
                            : factura.estado_pago === 'pendiente' ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                          }`}>{factura.estado_pago}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1.5">
                            {factura.estado_pago === 'pendiente' && (
                              <button onClick={() => {
                                setFacturaPago(factura);
                                setMetodoPago(factura.metodo_pago);
                                setErrorAccionFactura('');
                              }} className="rounded-lg bg-cyan-100 px-2.5 py-1.5 text-[9px] font-black text-cyan-900 hover:bg-cyan-200">
                                Registrar pago
                              </button>
                            )}
                            {!['anulada', 'reembolsada'].includes(factura.estado_pago) && (
                              <button onClick={() => {
                                setFacturaAnular(factura);
                                setMotivoAnulacion('');
                                setErrorAccionFactura('');
                              }} title={factura.estado_pago === 'pagada' ? 'Anular y registrar reembolso' : 'Anular factura'}
                                className="rounded-lg border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50">
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!facturasCargando && facturas.length === 0 && (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-500">No hay facturas que coincidan con los filtros.</td></tr>
                    )}
                  </tbody>
                </table>
                {facturasCargando && <p className="p-8 text-center text-xs text-slate-500">Cargando facturas…</p>}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <span className="text-[10px] text-slate-500">
                  {totalFacturas} factura(s) · página {paginaFacturas} de {totalPaginasFacturas}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPaginaFacturas((actual) => actual - 1)} disabled={paginaFacturas <= 1 || facturasCargando}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setPaginaFacturas((actual) => actual + 1)} disabled={paginaFacturas >= totalPaginasFacturas || facturasCargando}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </section>

            <section className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-sm font-black text-slate-950">Citas completadas por facturar</h2>
                  <p className="mt-1 text-[10px] text-slate-500">Solo se pueden emitir facturas para citas completadas que aún no tengan una.</p>
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-800">{citasFacturables.length}</span>
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {citasFacturables.slice(0, 5).map((cita) => (
                  <div key={cita.id_cita} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{cita.cliente_nombre} · {cita.servicio_nombre}</p>
                      <p className="text-[9px] text-slate-500">{cita.codigo_reserva} · {fechaLarga(cita.fecha)} · {formatoCOP(cita.precio_total)}</p>
                    </div>
                    <button onClick={() => {
                      setCitaFacturar(cita);
                      setMetodoNuevaFactura('efectivo');
                      setErrorAccionFactura('');
                    }} className="rounded-lg bg-slate-950 px-3 py-1.5 text-[9px] font-black text-white hover:bg-slate-800">
                      Emitir factura
                    </button>
                  </div>
                ))}
                {citasFacturables.length === 0 && <p className="py-4 text-center text-[10px] text-slate-500">No hay citas pendientes de facturación.</p>}
              </div>
            </section>
          </div>
        )}
        </main>
      </div>

      {/* MODAL NUEVO PERFIL INTERNO */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card max-h-[92vh] w-full max-w-xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-start justify-between bg-gradient-to-r from-teal-600 to-teal-400 px-6 py-5 text-[#04211F]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-75">Acceso administrativo</span>
                <h3 className="font-heading text-2xl font-black">Crear perfil interno</h3>
              </div>
              <button onClick={() => setModalUsuario(false)} className="rounded-full bg-[#04211F]/15 p-2 hover:bg-[#04211F]/25"><X className="h-4 w-4" /></button>
            </div>

            <form onSubmit={guardarNuevoUsuario} className="space-y-4 p-6">
              {uError && <p className="rounded-2xl bg-rose-400/10 p-3 text-xs font-bold text-rose-300">{uError}</p>}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Tipo de perfil</label>
                <select value={uRol} onChange={(e) => setURol(Number(e.target.value) as UsuarioInternoCreate['id_rol'])} className={input}>
                  <option value={2}>Barbero</option>
                  <option value={1}>Administrador</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Nombre completo</label>
                  <input value={uNombre} onChange={(e) => setUNombre(e.target.value)} required minLength={3} className={input} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Correo</label>
                  <input type="email" value={uCorreo} onChange={(e) => setUCorreo(e.target.value)} required className={input} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Teléfono</label>
                  <input value={uTelefono} onChange={(e) => setUTelefono(e.target.value)} className={input} placeholder="Teléfono (opcional)" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Contraseña</label>
                  <input type="password" value={uContrasena} onChange={(e) => setUContrasena(e.target.value)} required minLength={8} className={input} placeholder="Mínimo 8 caracteres" />
                </div>
              </div>

              {uRol === 2 && (
                <div className="space-y-3 rounded-2xl border border-white/8 bg-[#0F151C] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-teal-300">Perfil del barbero</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Título</label>
                      <input value={uTitulo} onChange={(e) => setUTitulo(e.target.value)} className={input} placeholder="Barbero senior" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Años de experiencia</label>
                      <input type="number" min={0} max={80} value={uExperiencia} onChange={(e) => setUExperiencia(Number(e.target.value))} className={input} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#93A1B1]">Biografía</label>
                    <textarea rows={3} value={uBio} onChange={(e) => setUBio(e.target.value)} className={input + ' resize-none'} placeholder="Presentación profesional (opcional)" />
                  </div>
                </div>
              )}

              <div className="flex gap-2 border-t border-white/8 pt-4">
                <button type="button" onClick={() => setModalUsuario(false)} className="flex-1 rounded-2xl border border-white/12 py-3 text-sm font-bold text-[#93A1B1] hover:bg-white/5">Cancelar</button>
                <button type="submit" disabled={uGuardando} className="btn-primario flex-1 rounded-2xl py-3 text-sm font-black disabled:opacity-60">
                  {uGuardando ? 'Creando…' : 'Crear perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className="text-xs font-semibold text-[#93A1B1]">
                  Puntos que otorga al completar
                  <input type="number" min={0} step={1} value={sPuntos}
                    onChange={(e) => setSPuntos(Number(e.target.value))}
                    className={`${input} mt-1`} />
                </label>
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

      {citaFacturar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="modal-emitir-factura"
            className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="flex items-start justify-between bg-cyan-500 px-5 py-4 text-[#06232A]">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest">Cita completada</p>
                <h2 id="modal-emitir-factura" className="font-heading text-lg font-black">Emitir factura</h2>
              </div>
              <button onClick={() => setCitaFacturar(null)} aria-label="Cerrar"
                className="rounded-full bg-black/10 p-1.5 hover:bg-black/20"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={emitirFactura} className="space-y-4 p-5">
              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-bold text-slate-900">{citaFacturar.cliente_nombre} · {citaFacturar.servicio_nombre}</p>
                <p className="mt-1 text-slate-500">{citaFacturar.codigo_reserva} · {formatoCOP(citaFacturar.precio_total)}</p>
              </div>
              {errorAccionFactura && <p className="rounded-lg bg-rose-50 p-2.5 text-[10px] font-semibold text-rose-700">{errorAccionFactura}</p>}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-600">Medio de pago esperado</label>
                <select value={metodoNuevaFactura} onChange={(e) => setMetodoNuevaFactura(e.target.value as MetodoPagoAdmin)} className={input}>
                  {METODOS_PAGO.map((metodo) => <option key={metodo} value={metodo}>{metodo}</option>)}
                </select>
                <p className="mt-1 text-[9px] text-slate-500">La factura quedará pendiente hasta registrar el pago.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCitaFacturar(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600">Cancelar</button>
                <button type="submit" disabled={guardandoFactura}
                  className="flex-1 rounded-xl bg-slate-950 py-2.5 text-xs font-black text-white disabled:opacity-50">
                  {guardandoFactura ? 'Emitiendo…' : 'Emitir factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {facturaPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="modal-registrar-pago"
            className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="flex items-start justify-between bg-cyan-500 px-5 py-4 text-[#06232A]">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest">{facturaPago.numero_factura}</p>
                <h2 id="modal-registrar-pago" className="font-heading text-lg font-black">Registrar pago</h2>
              </div>
              <button onClick={() => setFacturaPago(null)} aria-label="Cerrar"
                className="rounded-full bg-black/10 p-1.5 hover:bg-black/20"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={registrarPagoFactura} className="space-y-4 p-5">
              <p className="text-sm text-slate-600">Confirma el pago de <strong className="text-slate-950">{formatoCOP(facturaPago.total)}</strong>.</p>
              {errorAccionFactura && <p className="rounded-lg bg-rose-50 p-2.5 text-[10px] font-semibold text-rose-700">{errorAccionFactura}</p>}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-600">Medio de pago recibido</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as MetodoPagoAdmin)} className={input}>
                  {METODOS_PAGO.map((metodo) => <option key={metodo} value={metodo}>{metodo}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFacturaPago(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600">Cancelar</button>
                <button type="submit" disabled={guardandoFactura}
                  className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-xs font-black text-[#06232A] disabled:opacity-50">
                  {guardandoFactura ? 'Guardando…' : 'Confirmar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {facturaAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="modal-anular-factura"
            className="anim-zoom card w-full max-w-md overflow-hidden">
            <div className="flex items-start justify-between bg-rose-100 px-5 py-4 text-rose-950">
              <div>
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest"><XCircle className="h-3 w-3" /> {facturaAnular.numero_factura}</p>
                <h2 id="modal-anular-factura" className="font-heading text-lg font-black">
                  {facturaAnular.estado_pago === 'pagada' ? 'Anular y reembolsar' : 'Anular factura'}
                </h2>
              </div>
              <button onClick={() => setFacturaAnular(null)} aria-label="Cerrar"
                className="rounded-full bg-rose-900/10 p-1.5 hover:bg-rose-900/20"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={anularFactura} className="space-y-4 p-5">
              <p className="text-xs text-slate-600">
                {facturaAnular.estado_pago === 'pagada'
                  ? 'Esta factura quedará marcada como reembolsada. Registra el motivo para auditoría.'
                  : 'La factura quedará anulada. Registra el motivo para auditoría.'}
              </p>
              {errorAccionFactura && <p className="rounded-lg bg-rose-50 p-2.5 text-[10px] font-semibold text-rose-700">{errorAccionFactura}</p>}
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-600">Motivo de anulación</label>
                <textarea required minLength={3} maxLength={255} rows={3} value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)} className={input + ' resize-none'}
                  placeholder="Motivo (requerido)" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFacturaAnular(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600">Volver</button>
                <button type="submit" disabled={guardandoFactura}
                  className="flex-1 rounded-xl bg-rose-700 py-2.5 text-xs font-black text-white disabled:opacity-50">
                  {guardandoFactura ? 'Anulando…' : 'Confirmar anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
