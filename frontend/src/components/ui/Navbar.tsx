import React, { useEffect, useMemo, useState } from 'react';
import {
  Scissors, CalendarDays, Crown, Sparkles, Menu, X, LogOut,
  LayoutDashboard, ChevronDown, Clock, UserRound, MapPin, Sun, Moon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROL_ADMINISTRADOR, ROL_BARBERO, ROL_CLIENTE } from '../../types';
import type { Vista } from '../../types';

export const Navbar: React.FC = () => {
  const {
    usuario, logout, abrirAuth, abrirReserva, actualizarAvatar,
    vista, irA, setQuizAbierto, setEsperaAbierta,
  } = useApp();

  const [menu, setMenu] = useState(false);
  const [perfil, setPerfil] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(() => localStorage.getItem('globde_tema') === 'oscuro');

  const seleccionarAvatar = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (archivo) await actualizarAvatar(archivo);
    evento.target.value = '';
  };

  useEffect(() => {
    document.documentElement.classList.toggle('tema-oscuro', modoOscuro);
    document.documentElement.classList.toggle('tema-claro', !modoOscuro);
    localStorage.setItem('globde_tema', modoOscuro ? 'oscuro' : 'claro');
  }, [modoOscuro]);

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

  const panelDelRol: Vista =
    usuario?.id_rol === ROL_ADMINISTRADOR ? 'panel-admin'
    : usuario?.id_rol === ROL_BARBERO ? 'panel-barbero'
    : 'panel-cliente';

  const enlaces: { v: Vista; texto: string; icono: React.ElementType }[] = [
    { v: 'inicio', texto: 'Inicio', icono: MapPin },
    { v: 'catalogo', texto: 'Catálogo de cortes', icono: Scissors },
    { v: 'fidelizacion', texto: 'Club de puntos', icono: Crown },
  ];

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Cinta superior */}
      <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-[11px] sm:text-xs sm:px-6 lg:px-8">
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
      <div className="glass border-b border-white/8 shadow-[0_16px_40px_-30px_rgba(0,0,0,1)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Marca */}
          <button onClick={() => ir('inicio')} className="group flex items-center gap-3">
            <span className="poste-barberia logo-marco relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#141A21] shadow-md ring-1 ring-amber-400/40">
              <img src="/Logo.webp" alt="Logo Globde" className="relative z-10 h-full w-full object-contain p-1" />
            </span>
            <span className="text-left leading-none">
              <span className="font-heading block text-xl font-black tracking-tight text-[#EAF0F6]">
                GLOB<span className="text-amber-500">DE</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                Barber Studio
              </span>
            </span>
          </button>

          {/* Navegación escritorio */}
          <nav className="hidden items-center gap-1 lg:flex">
            {enlaces.map((e) => (
              <button
                key={e.v}
                onClick={() => ir(e.v)}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  vista === e.v
                    ? 'bg-amber-400/12 text-amber-700 ring-1 ring-amber-400/40'
                    : 'text-[#93A1B1] hover:bg-black/5 hover:text-[#0A0A0A]'
                }`}
              >
                {e.texto}
              </button>
            ))}
            <button
              onClick={() => setQuizAbierto(true)}
              className="ml-1 flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-400/20"
            >
              <Sparkles className="h-4 w-4" /> Asesor de estilo
            </button>
            {usuario && (
              <button
                onClick={() => ir(panelDelRol)}
                className={`ml-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
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
            {usuario?.id_rol === ROL_CLIENTE && (
              <button
                onClick={() => ir('fidelizacion')}
                className="hidden items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-400/20 sm:flex"
              >
                <Crown className="h-3.5 w-3.5" /> {usuario.puntos} pts · {usuario.nivel_fidelizacion}
              </button>
            )}

            {(!usuario || usuario.id_rol === ROL_CLIENTE) && (
              <button
                onClick={() => abrirReserva()}
                className="btn-primario flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Reservar cita</span>
                <span className="sm:hidden">Reservar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setModoOscuro((actual) => !actual)}
              aria-label={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={modoOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="rounded-2xl border border-white/12 bg-[#141A21] p-2.5 text-[#C6D0DC] transition hover:border-amber-400/50 hover:text-amber-600"
            >
              {modoOscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {usuario ? (
              <div className="relative">
                <button
                  onClick={() => setPerfil(!perfil)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#141A21] p-1.5 pr-2.5 transition hover:border-amber-400/50"
                >
            {usuario.avatar_url
                 ? <img src={usuario.avatar_url} alt={usuario.nombre} className="h-8 w-8 rounded-xl object-cover" />
                : <span className="avatar-respaldo flex h-8 w-8 items-center justify-center rounded-xl text-[#06232A]"><UserRound className="h-4 w-4" strokeWidth={2.5} /></span>}                  <ChevronDown className="h-3.5 w-3.5 text-[#6B7A8C]" />
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
                    <button onClick={() => ir('fidelizacion')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#C6D0DC] hover:bg-white/5">
                      <Crown className="h-4 w-4 text-amber-600" /> Puntos y premios
                    </button>
                    <button onClick={() => { setEsperaAbierta(true); setPerfil(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#C6D0DC] hover:bg-white/5">
                      <Clock className="h-4 w-4 text-[#9A9A9A]" /> Lista de espera
                    </button>
                    <button onClick={() => { logout(); setPerfil(false); }} className="mt-1 flex w-full items-center gap-2.5 rounded-xl border-t border-white/8 px-3 py-2 pt-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-400/10">
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => abrirAuth('login')}
                className="rounded-2xl border border-white/12 bg-[#141A21] px-3.5 py-2.5 text-xs font-bold text-[#C6D0DC] transition hover:border-amber-400/50 hover:text-amber-600"
              >
                Ingresar
              </button>
            )}

            <button
              onClick={() => setMenu(!menu)}
              className="rounded-2xl border border-white/12 bg-[#141A21] p-2.5 text-[#93A1B1] lg:hidden"
              aria-label="Menú"
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menu && (
          <div className="anim-aparecer border-t border-white/8 bg-[#141A21] px-4 py-3 lg:hidden">
            {enlaces.map((e) => (
              <button key={e.v} onClick={() => ir(e.v)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#C6D0DC] hover:bg-white/5">
                <e.icono className="h-4 w-4 text-amber-600" /> {e.texto}
              </button>
            ))}
            <button onClick={() => { setQuizAbierto(true); setMenu(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-400/10">
              <Sparkles className="h-4 w-4" /> Asesor de estilo
            </button>
            <button onClick={() => { setEsperaAbierta(true); setMenu(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#6B7A8C] hover:bg-black/5">
              <Clock className="h-4 w-4" /> Lista de espera
            </button>
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
