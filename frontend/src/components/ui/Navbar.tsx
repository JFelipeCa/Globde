import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Scissors, CalendarDays, Crown, Sparkles, Menu, X, LogOut,
  LayoutDashboard, Clock, UserRound, MapPin, Sun, Moon, Bell,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROL_ADMINISTRADOR, ROL_BARBERO, ROL_CLIENTE } from '../../types';
import type { Vista } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { BarberoFoto } from './BarberoFoto';

export const Navbar: React.FC = () => {
  const {
    usuario, barberos, logout, abrirAuth, abrirReserva, actualizarAvatar,
    vista, irA, setQuizAbierto, setEsperaAbierta, notificaciones,
    marcarNotificacionesLeidas,
  } = useApp();

  const [menu, setMenu] = useState(false);
  const [perfil, setPerfil] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [vistaNotificaciones, setVistaNotificaciones] = useState(notificaciones);
  const [hayNotificacionNueva, setHayNotificacionNueva] = useState(false);
  const idsNotificacionesVistas = useRef(new Set<string>());
  const [avatarFallido, setAvatarFallido] = useState(false);
  const { modoOscuro, alternarModo } = useTheme();

  useEffect(() => {
    if (notificaciones.length === 0) return;

    setVistaNotificaciones(notificaciones);
    const hayNuevas = notificaciones.some((notificacion) => {
      if (idsNotificacionesVistas.current.has(notificacion.id)) return false;
      idsNotificacionesVistas.current.add(notificacion.id);
      return true;
    });
    if (hayNuevas) setHayNotificacionNueva(true);
  }, [notificaciones]);

  const seleccionarAvatar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (archivo) await actualizarAvatar(archivo);
    evento.target.value = '';
  };

  // La cinta decia "Abierto hoy" a cualquier hora y cualquier dia. Ahora
  // refleja el reloj real: el domingo la barberia no abre.
  const estadoHorario = useMemo(() => {
    const ahora = new Date();
    const dia = ahora.getDay(); // 0 = domingo
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    if (dia === 0) return 'Cerrado hoy · Abrimos el lunes a las 8:00 a.m.';
    const abre = 8 * 60;
    const cierra = dia === 6 ? 15 * 60 : 20 * 60; // sábado hasta las 3:00 p.m.
    const cierreTexto = dia === 6 ? '3:00 p.m.' : '8:00 p.m.';
    if (minutos < abre) return `Cerrado ahora · Abrimos hoy a las 8:00 a.m.`;
    if (minutos >= cierra) return 'Cerrado ahora · Abrimos mañana a las 8:00 a.m.';
    return `Abierto ahora · Hasta las ${cierreTexto}`;
  }, []);

  const ir = (v: Vista) => { irA(v); setMenu(false); setPerfil(false); };

  const alternarNotificaciones = () => {
    const abrir = !notificacionesAbiertas;
    setNotificacionesAbiertas(abrir);
    setPerfil(false);
    if (abrir) {
      if (notificaciones.length > 0) setVistaNotificaciones(notificaciones);
      setHayNotificacionNueva(false);
      void marcarNotificacionesLeidas().catch((error: unknown) => {
        console.error('No se pudieron marcar las notificaciones como leídas:', error);
        setHayNotificacionNueva(true);
      });
    }
  };

  const fechaNotificacion = (fecha: string) => {
    if (fecha === 'ahora') return 'Ahora';
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
      ? fecha
      : valor.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const panelDelRol: Vista =
    usuario?.id_rol === ROL_ADMINISTRADOR ? 'panel-admin'
    : usuario?.id_rol === ROL_BARBERO ? 'panel-barbero'
    : 'panel-cliente';

  const esBarbero = usuario?.id_rol === ROL_BARBERO;
  const barberoPerfil = esBarbero
    ? barberos.find((barbero) => barbero.id_usuario === usuario?.id_usuario) ?? barberos[0] ?? null
    : null;
  const fotoPerfil = barberoPerfil?.foto_url?.trim() || usuario?.avatar_url?.trim() || null;
  const esCliente = usuario?.id_rol === ROL_CLIENTE;
  const esPanelCliente = esCliente && vista === 'panel-cliente';
  const esPanelDashboard = esPanelCliente || (esBarbero && vista === 'panel-barbero');

  useEffect(() => {
    setAvatarFallido(false);
  }, [fotoPerfil]);

  const enlaces: { v: Vista; texto: string; icono: React.ElementType }[] =
    (!usuario || esCliente) ? [
      { v: 'inicio', texto: 'Inicio', icono: MapPin },
      { v: 'catalogo', texto: 'Catálogo de servicios', icono: Scissors },
      { v: 'fidelizacion', texto: 'Club de puntos', icono: Crown },
    ] : [];

  return (
    <header className={`sticky top-0 z-40 w-full ${esPanelDashboard ? 'panel-dashboard-navbar' : ''}`}>
      {/* Cinta superior */}
      <div className={`${esPanelDashboard ? 'bg-[#111111]' : 'bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950'} text-white`}>
        <div className={`mx-auto flex items-center justify-between gap-3 ${esPanelDashboard ? 'max-w-7xl px-4 py-2 text-sm sm:px-6 lg:px-8' : 'max-w-7xl px-4 py-1.5 text-[11px] sm:px-6 lg:px-8 sm:text-xs'}`}>
          <span className="flex items-center gap-2 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            {estadoHorario}
            <span className="hidden opacity-70 sm:inline">· Calle 85 #14-20, Bogotá</span>
          </span>

          <span className="hidden opacity-70 sm:inline">Reserva en línea · Respuesta inmediata</span>
        </div>
      </div>

      {/* Barra principal */}
      <div className={`${esPanelDashboard ? 'border-b border-[#e6e8e4] bg-white' : 'glass border-b border-white/8 shadow-[0_16px_40px_-30px_rgba(0,0,0,1)]'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Marca */}
          <button onClick={() => ir('inicio')} className="group flex items-center gap-3">
            <span className="poste-barberia logo-marco relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#141A21] shadow-md ring-1 ring-neutral-900/30">
              <img src="/Logo.webp" alt="Logo Globde" className="relative z-10 h-full w-full object-contain p-1" />
            </span>
            <span className="text-left leading-none">
              <span className="font-heading block text-xl font-black tracking-tight text-[#EAF0F6]">
                GLOB<span className="text-amber-500">DE</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                BARBER GESTOR
              </span>
            </span>
          </button>

          {/* Navegación escritorio */}
          <nav className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            {enlaces.map((e) => (
              <button
                key={e.v}
                onClick={() => ir(e.v)}
                className={`inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition sm:text-sm ${
                  esPanelDashboard
                    ? 'text-[#111111] hover:bg-[#f1f5f4]'
                    : `${vista === e.v
                      ? 'bg-amber-400/12 text-amber-700 ring-1 ring-neutral-900/30'
                      : 'text-[#93A1B1] hover:bg-black/5 hover:text-[#0A0A0A]'}`
                }`}
              >
                {e.texto}
              </button>
            ))}
            {esPanelCliente && (
              <>
                <button onClick={() => setQuizAbierto(true)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-400/20 sm:text-sm">
                  <Sparkles className="h-4 w-4" />
                  Asesor de estilo
                </button>
                <button onClick={() => ir('panel-cliente')} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#111111] px-3 text-xs font-semibold text-white sm:text-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Mis citas
                </button>
              </>
            )}
            {!esPanelCliente && esCliente && (
              <button
                onClick={() => setQuizAbierto(true)}
                className="ml-1 inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-400/20 sm:text-sm"
              >
                <Sparkles className="h-4 w-4" /> Asesor de estilo
              </button>
            )}
            {!esPanelCliente && usuario && (
              <button
                onClick={() => ir(panelDelRol)}
                className={`ml-1 inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition sm:text-sm ${
                  vista.startsWith('panel')
                    ? 'bg-neutral-900 text-white'
                    : 'text-[#93A1B1] hover:bg-black/5 hover:text-[#0A0A0A]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                {usuario.id_rol === ROL_ADMINISTRADOR ? 'Panel admin' : usuario.id_rol === ROL_BARBERO ? 'Mi agenda' : 'Mis citas'}
              </button>
            )}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {(!usuario || esCliente) && (
              <button
                onClick={() => abrirReserva()}
                className={esPanelDashboard
                  ? 'inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-[#303030] sm:text-sm'
                  : 'btn-primario inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-xs font-semibold sm:text-sm'}
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Reservar cita</span>
                <span className="sm:hidden">Reservar</span>
              </button>
            )}

            <button
              type="button"
              onClick={alternarModo}
              aria-label={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={esPanelDashboard
                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#b8e9ed] bg-white text-[#16879a] transition hover:bg-[#e9fbfc]'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#141A21] text-[#C6D0DC] transition hover:border-amber-400/50 hover:text-amber-600'}
            >
              {modoOscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {usuario ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={alternarNotificaciones}
                    aria-label="Notificaciones"
                    aria-expanded={notificacionesAbiertas}
                    title="Notificaciones"
                    className={esPanelDashboard
                      ? 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9e2e0] bg-white text-[#172124] transition hover:border-[#55d7e5]'
                      : 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#141A21] text-[#C6D0DC] transition hover:border-amber-400/50 hover:text-amber-600'}
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    {hayNotificacionNueva && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
                  </button>

                  {notificacionesAbiertas && (
                    <section className="anim-zoom absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e6e8e4] bg-white text-[#172124] shadow-xl" aria-label="Notificaciones recientes">
                      <div className="flex items-center justify-between border-b border-[#edf0ec] px-3.5 py-3">
                        <h2 className="text-xs font-black">Notificaciones</h2>
                        <span className="text-[10px] text-[#75817c]">Recientes</span>
                      </div>
                      {vistaNotificaciones.length > 0 ? (
                        <ul className="max-h-72 divide-y divide-[#edf0ec] overflow-y-auto">
                          {vistaNotificaciones.slice(0, 4).map((notificacion) => (
                            <li key={notificacion.id} className="px-3.5 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs font-bold">{notificacion.titulo}</p>
                                <time className="shrink-0 text-[9px] text-[#75817c]">{fechaNotificacion(notificacion.fecha)}</time>
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#65716d]">{notificacion.mensaje}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-3.5 py-5 text-center text-xs text-[#75817c]">No hay notificaciones recientes.</p>
                      )}
                    </section>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => { setPerfil(!perfil); setNotificacionesAbiertas(false); }}
                    className={esPanelDashboard
                      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9e2e0] bg-white p-1 transition hover:border-[#55d7e5]'
                      : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#141A21] p-1 transition hover:border-amber-400/50'}
                  >
                    {barberoPerfil
                      ? <BarberoFoto
                          idBarbero={barberoPerfil.id_barbero}
                          nombre={barberoPerfil.nombre}
                          fotoUrl={fotoPerfil}
                          className="h-8 w-8 rounded-lg object-cover"
                          iconClassName="h-4 w-4 text-current"
                        />
                      : fotoPerfil && !avatarFallido
                        ? <img src={fotoPerfil} alt={usuario.nombre} onError={() => setAvatarFallido(true)} className="h-8 w-8 rounded-lg object-cover" />
                      : esPanelDashboard
                        ? <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#55d7e5] text-[#101719]"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                        : <span className="avatar-respaldo flex h-8 w-8 items-center justify-center rounded-lg text-[#06232A]"><UserRound className="h-4 w-4" strokeWidth={2.5} /></span>}
                  </button>

                  {perfil && (
                    <div className="anim-zoom absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#141A21] p-2 shadow-2xl">
                      <div className="border-b border-white/8 px-3 pb-2.5 pt-1.5">
                        <p className="truncate text-sm font-bold text-[#EAF0F6]">{usuario.nombre}</p>
                        <p className="truncate text-xs text-[#6B7A8C]">{usuario.correo}</p>
                        <span className="mt-1.5 inline-block rounded-full bg-amber-400/12 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          {usuario.id_rol === ROL_ADMINISTRADOR ? 'Administrador' : usuario.id_rol === ROL_BARBERO ? 'Barbero' : 'Cliente Club'}
                        </span>
                      </div>
                      <button onClick={() => ir(panelDelRol)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#C6D0DC] hover:bg-white/5">
                        <UserRound className="h-4 w-4 text-amber-600" /> Mi panel
                      </button>
                      <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#C6D0DC] hover:bg-white/5">
                        <UserRound className="h-4 w-4 text-amber-600" /> Cambiar foto
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={seleccionarAvatar} />
                      </label>
                      {esCliente && (
                        <button onClick={() => ir('fidelizacion')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#C6D0DC] hover:bg-white/5">
                          <Crown className="h-4 w-4 text-amber-600" /> Puntos y premios
                        </button>
                      )}
                      {!esBarbero && (
                        <button onClick={() => { setEsperaAbierta(true); setPerfil(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#C6D0DC] hover:bg-white/5">
                          <Clock className="h-4 w-4 text-[#9A9A9A]" /> Lista de espera
                        </button>
                      )}
                      <button onClick={() => { logout(); setPerfil(false); }} className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-white/8 px-3 py-2 pt-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-400/10">
                        <LogOut className="h-4 w-4" /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => abrirAuth('login')}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/12 bg-[#141A21] px-3 text-xs font-semibold text-[#C6D0DC] transition hover:border-amber-400/50 hover:text-amber-600 sm:text-sm"
              >
                <UserRound className="h-4 w-4" />
                Ingresar
              </button>
            )}

            <button
              onClick={() => setMenu(!menu)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-[#141A21] text-[#93A1B1] lg:hidden"
              aria-label="Menú"
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menu && (
          <div className="anim-aparecer border-t border-white/8 bg-[#141A21] px-4 py-3 lg:hidden">
            {esCliente && enlaces.map((e) => (
              <button key={e.v} onClick={() => ir(e.v)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#C6D0DC] hover:bg-white/5">
                <e.icono className="h-4 w-4 text-amber-600" /> {e.texto}
              </button>
            ))}
            {esCliente && (
              <button onClick={() => { setQuizAbierto(true); setMenu(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-400/10">
                <Sparkles className="h-4 w-4" /> Asesor de estilo
              </button>
            )}
            {esCliente && (
              <button onClick={() => { setEsperaAbierta(true); setMenu(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#6B7A8C] hover:bg-black/5">
                <Clock className="h-4 w-4" /> Lista de espera
              </button>
            )}
            {usuario && (
              <button onClick={() => ir(panelDelRol)} className="mt-1 flex w-full items-center gap-2.5 rounded-xl bg-neutral-900 px-3 py-2.5 text-sm font-bold text-white">
                <LayoutDashboard className="h-4 w-4" /> Ir a mi panel
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
