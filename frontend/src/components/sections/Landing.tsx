import React, { useState } from 'react';
import {
  CalendarDays, Sparkles, Scissors, ArrowRight, Star, Crown, Clock,
  ShieldCheck, Timer, Check, QrCode, Bell, Award, Eye, X, MapPin, Gift, Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatoCOP, duracionLegible, hora12 } from '../../utils/helpers';
import type { CatalogoCorte, PremioFidelidad } from '../../types';

/* ---------------------------------------------------------------
   HERO
--------------------------------------------------------------- */
export const Hero: React.FC = () => {
  const { abrirReserva, irA, setQuizAbierto } = useApp();

  return (
    <section className="relative overflow-hidden malla-suave">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-20 lg:px-8">
        <div className="anim-aparecer space-y-6 lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-bold text-amber-700 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            Agenda disponible hoy · respuesta inmediata
          </span>

          <h1 className="font-heading text-4xl font-black leading-[1.05] text-[#EAF0F6] sm:text-5xl lg:text-6xl">
            Tu mejor versión empieza con un
            <span className="text-aqua"> corte perfecto</span> y
            <span className="text-oro"> cero espera</span>.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-[#93A1B1]">
            Reserva por rangos horarios exactos, elige a tu barbero favorito, recibe tu pase digital con QR
            y acumula puntos canjeables en cada visita. Todo en menos de un minuto.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => abrirReserva()} className="btn-primario group flex items-center gap-2.5 rounded-2xl px-7 py-4 text-base font-black">
              <CalendarDays className="h-5 w-5" /> Reservar mi cita
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => irA('catalogo')} className="flex items-center gap-2 rounded-2xl border border-white/12 bg-[#141A21] px-6 py-4 text-sm font-bold text-[#C6D0DC] transition hover:-translate-y-0.5 hover:border-amber-400/50">
              <Scissors className="h-4 w-4 text-amber-600" /> Ver catálogo de cortes
            </button>
            <button onClick={() => setQuizAbierto(true)} className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm font-bold text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-400/20">
              <Sparkles className="h-4 w-4" /> Asesor de estilo
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/8 pt-6">
            {[
              { i: Clock, t: '0 min', s: 'de espera en sala', c: 'text-[#EAF0F6] bg-white/8' },
              { i: Crown, t: '+1.400', s: 'clientes con puntos', c: 'text-amber-700 bg-amber-400/12' },
              { i: Star, t: '4.9/5', s: 'calificación media', c: 'text-[#EAF0F6] bg-white/8' },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-2.5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${x.c}`}><x.i className="h-5 w-5" /></span>
                <span>
                  <span className="font-heading block text-lg font-black leading-none text-[#EAF0F6]">{x.t}</span>
                  <span className="text-[11px] text-[#6B7A8C]">{x.s}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Imagen */}
        <div className="anim-aparecer retraso-2 relative lg:col-span-6">
          <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-white/10 blur-3xl anim-latido" />
          <div className="absolute -bottom-8 -right-4 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl anim-latido" />

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#141A21] p-2 shadow-[0_40px_90px_-40px_rgba(0,0,0,1)]">
            <img
              src="https://images.pexels.com/photos/34702982/pexels-photo-34702982.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=760&w=680&fm=webp"
              alt="Barbero atendiendo a un cliente en Globde"
              className="h-[440px] w-full rounded-[1.6rem] object-cover"
            />

            <div className="anim-flotar absolute left-6 top-6 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0B0F14]/90 p-2.5 pr-4 shadow-xl backdrop-blur">
              <img src="https://images.pexels.com/photos/12304510/pexels-photo-12304510.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=120&w=120&fm=webp" alt="Carlos" className="h-10 w-10 rounded-xl object-cover" />
              <div>
                <p className="text-xs font-black text-[#EAF0F6]">Carlos Méndez</p>
                <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Libre a las 11:00 a.m.
                </p>
              </div>
            </div>

            <div className="absolute bottom-6 right-6 w-48 rounded-2xl border border-white/10 bg-[#0B0F14]/90 p-3.5 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15"><Crown className="h-4 w-4 text-amber-300" /></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Club Globde</p>
                  <p className="text-xs font-black text-[#EAF0F6]">+25 pts por cita</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-300 to-amber-500" />
              </div>
              <p className="mt-1 text-[10px] text-[#6B7A8C]">185/250 pts para nivel Oro</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------
   BENEFICIOS
--------------------------------------------------------------- */
export const Beneficios: React.FC = () => {
  const { abrirReserva, setEsperaAbierta } = useApp();
  const items = [
    { i: CalendarDays, t: 'Reserva por rangos horarios', d: 'Ves la hora exacta de inicio y fin de tu cita según la duración real del servicio.', c: 'bg-amber-400/12 text-amber-700' },
    { i: QrCode, t: 'Pase digital con QR', d: 'Recibes un comprobante con código único para validar tu turno al llegar.', c: 'bg-neutral-900/8 text-neutral-900' },
    { i: Bell, t: 'Lista de espera inteligente', d: 'Si se libera un turno antes, te avisamos de inmediato por WhatsApp.', c: 'bg-neutral-900/8 text-neutral-900' },
    { i: Crown, t: 'Puntos que se canjean', d: 'Acumula en cada visita y cámbialos por servicios, productos o descuentos.', c: 'bg-amber-400/12 text-amber-700' },
    { i: Award, t: 'Ranking de barberos', d: 'Nivel Master, Oro y Plata según desempeño, puntualidad y calificaciones.', c: 'bg-neutral-900/8 text-neutral-900' },
    { i: ShieldCheck, t: 'Seguridad y bioseguridad', d: 'Contraseñas cifradas, navaja de un solo uso y esterilización UV certificada.', c: 'bg-neutral-900/8 text-neutral-900' },
  ];

  return (
    <section className="bg-[#0F151C] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/12 px-4 py-1.5 text-xs font-bold text-amber-700">
            <Zap className="h-3.5 w-3.5" /> Por qué elegirnos
          </span>
          <h2 className="font-heading mt-3 text-3xl font-black text-[#EAF0F6] sm:text-4xl">
            Una experiencia pensada para <span className="text-aqua">ahorrarte tiempo</span>
          </h2>
          <p className="mt-3 text-sm text-[#93A1B1]">
            Tecnología y barbería tradicional en una plataforma clara, rápida y hecha para ti.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((x, i) => (
            <div key={x.t} className={`card card-hover anim-aparecer retraso-${(i % 6) + 1} p-6`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${x.c}`}><x.i className="h-6 w-6" /></span>
              <h3 className="font-heading mt-4 text-lg font-black text-[#EAF0F6]">{x.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#93A1B1]">{x.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 px-6 py-10 text-center text-white">
          <h3 className="font-heading text-2xl font-black sm:text-3xl">¿Listo para tu próximo corte?</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-white/80">
            Aparta tu franja en segundos o únete a la lista de espera si buscas un horario específico.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => abrirReserva()} className="flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-black text-[#1A1400] shadow-lg transition hover:-translate-y-0.5">
              <CalendarDays className="h-4 w-4" /> Reservar ahora
            </button>
            <button onClick={() => setEsperaAbierta(true)} className="flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              <Clock className="h-4 w-4" /> Lista de espera
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------
   SERVICIOS
--------------------------------------------------------------- */
export const Servicios: React.FC = () => {
  const { servicios, abrirReserva } = useApp();
  const [cat, setCat] = useState('Todos');
  const cats = ['Todos', 'Cortes', 'Barba', 'Combos', 'Tratamientos', 'Infantil'];
  const lista = servicios.filter((s) => cat === 'Todos' || s.categoria === cat);

  return (
    <section className="bg-[#0B0F14] py-16 lg:py-24 patron-puntos">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#141A21] px-4 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-white/8">
              <Scissors className="h-3.5 w-3.5" /> Carta de servicios
            </span>
            <h2 className="font-heading mt-3 text-3xl font-black text-[#EAF0F6] sm:text-4xl">
              Servicios con <span className="text-aqua">tiempo y precio claros</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#93A1B1]">
              Cada servicio muestra su duración exacta para que sepas cuánto dura tu cita antes de reservar.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-2xl bg-[#141A21] p-1.5 ring-1 ring-white/8">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  cat === c ? 'bg-amber-400 text-[#1A1400] shadow' : 'text-[#93A1B1] hover:bg-white/5'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lista.map((s, i) => (
            <article key={s.id_servicio} className={`card card-hover anim-aparecer retraso-${(i % 6) + 1} group overflow-hidden`}>
              <div className="relative h-40 overflow-hidden">
                <img src={s.imagen_url} alt={s.nombre} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141A21] via-[#141A21]/30 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#0B0F14]/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-300 backdrop-blur">
                  {s.categoria}
                </span>
                {s.popular && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-[#2B1E04]">
                    ⭐ Más pedido
                  </span>
                )}
                <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B0F14]/85 px-2.5 py-1 text-[11px] font-black text-[#EAF0F6] backdrop-blur">
                  <Timer className="h-3.5 w-3.5 text-amber-300" /> {duracionLegible(s.duracion_minutos)}
                </span>
              </div>

              <div className="p-5">
                <h3 className="font-heading text-lg font-black leading-tight text-[#EAF0F6]">{s.icono} {s.nombre}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#93A1B1] line-clamp-3">{s.descripcion}</p>

                <div className="mt-4 flex items-end justify-between border-t border-white/8 pt-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#6B7A8C]">Valor</span>
                    <p className="font-heading text-xl font-black text-[#EAF0F6]">{formatoCOP(s.precio)}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/12 px-2.5 py-1 text-[11px] font-black text-amber-300">
                    <Sparkles className="h-3 w-3" /> +{s.puntos_otorga} pts
                  </span>
                </div>

                <button onClick={() => abrirReserva({ servicioId: s.id_servicio })}
                  className="btn-primario mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold">
                  Agendar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------
   BARBEROS
--------------------------------------------------------------- */
export const Barberos: React.FC = () => {
  const { barberos, abrirReserva } = useApp();

  return (
    <section className="bg-[#0F151C] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/12 px-4 py-1.5 text-xs font-bold text-amber-300">
            <Award className="h-3.5 w-3.5" /> Nuestro equipo
          </span>
          <h2 className="font-heading mt-3 text-3xl font-black text-[#EAF0F6] sm:text-4xl">
            Barberos con <span className="text-oro">certificación y estilo propio</span>
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {barberos.map((b, i) => (
            <article key={b.id_barbero} className={`card card-hover anim-aparecer retraso-${i + 1} overflow-hidden`}>
              <div className="relative h-64 overflow-hidden">
                <img src={b.foto_url} alt={b.nombre} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141A21] via-transparent to-transparent" />
                <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow" style={{ backgroundColor: b.color }}>
                  Nivel {b.nivel}
                </span>
                <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B0F14]/85 px-2.5 py-1 text-[11px] font-black text-emerald-300 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {b.disponible_hoy ? 'Disponible hoy' : 'Agenda cerrada'}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl font-black text-[#EAF0F6]">{b.nombre}</h3>
                  <span className="flex items-center gap-1 rounded-lg bg-amber-400/12 px-2 py-1 text-xs font-black text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-amber-300" /> {b.rating}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#6B7A8C]">{b.rol_titulo}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#93A1B1]">{b.bio}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.especialidades.map((e) => (
                    <span key={e} className="rounded-lg bg-white/6 px-2 py-0.5 text-[10px] font-semibold text-[#93A1B1]">{e}</span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-[11px] font-semibold text-[#93A1B1]">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> {hora12(b.hora_apertura)} – {hora12(b.hora_cierre)}</span>
                  <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-300" /> {b.citas_completadas}+ citas</span>
                </div>

                <button onClick={() => abrirReserva({ barberoId: b.id_barbero })}
                  className="btn-oro mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-black">
                  <CalendarDays className="h-4 w-4" /> Reservar con {b.nombre.split(' ')[0]}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------
   CATÁLOGO / LOOKBOOK
--------------------------------------------------------------- */
export const Catalogo: React.FC = () => {
  const { catalogoCortes, abrirReserva, setQuizAbierto } = useApp();
  const [cat, setCat] = useState('Todos');
  const [detalle, setDetalle] = useState<CatalogoCorte | null>(null);

  const cats = ['Todos', ...Array.from(new Set(catalogoCortes.map((c) => c.categoria)))];
  const lista = catalogoCortes.filter((c) => cat === 'Todos' || c.categoria === cat);

  return (
    <section className="bg-[#0B0F14] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#141A21] px-4 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-white/8">
              <Scissors className="h-3.5 w-3.5" /> Lookbook 2026
            </span>
            <h2 className="font-heading mt-3 text-3xl font-black text-[#EAF0F6] sm:text-4xl">
              Encuentra tu <span className="text-aqua">estilo ideal</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#93A1B1]">
              Explora resultados reales, mira la duración estimada y agenda con un clic.
            </p>
          </div>
          <button onClick={() => setQuizAbierto(true)} className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-400/20">
            <Sparkles className="h-4 w-4" /> No sé cuál elegir
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl bg-[#141A21] p-1.5 ring-1 ring-white/8">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${cat === c ? 'bg-amber-400 text-[#1A1400] shadow' : 'text-[#93A1B1] hover:bg-white/5'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((c, i) => (
            <button key={c.id_corte} onClick={() => setDetalle(c)}
              className={`card card-hover anim-aparecer retraso-${(i % 6) + 1} group overflow-hidden text-left`}>
              <div className="relative h-60 overflow-hidden">
                <img src={c.imagen_url} alt={c.nombre} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 flex items-center justify-center bg-[#0B0F14]/0 opacity-0 transition group-hover:bg-[#0B0F14]/60 group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-[#1A1400]">
                    <Eye className="h-4 w-4" /> Ver detalle
                  </span>
                </div>
                <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#0B0F14]/85 px-2.5 py-1 text-[10px] font-black text-amber-300 backdrop-blur">{c.categoria}</span>
                <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-[#2B1E04]">{c.popularidad}% ❤️</span>
              </div>
              <div className="p-5">
                <h3 className="font-heading text-base font-black text-[#EAF0F6]">{c.nombre}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#93A1B1] line-clamp-2">{c.descripcion}</p>
                <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-[#93A1B1]">
                    <Timer className="h-3.5 w-3.5 text-amber-600" /> {duracionLegible(c.duracion_minutos)}
                  </span>
                  <span className="font-black text-[#EAF0F6]">{formatoCOP(c.precio_sugerido)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="anim-zoom card w-full max-w-lg overflow-hidden">
            <div className="relative h-64">
              <img src={detalle.imagen_url} alt={detalle.nombre} className="h-full w-full object-cover" />
              <button onClick={() => setDetalle(null)} className="absolute right-4 top-4 rounded-full border border-white/10 bg-[#0B0F14]/85 p-2 text-[#EAF0F6] backdrop-blur"><X className="h-4 w-4" /></button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141A21] to-transparent p-4">
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-[#1A1400]">{detalle.categoria}</span>
                <h3 className="font-heading mt-1 text-2xl font-black text-[#EAF0F6]">{detalle.nombre}</h3>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-[#93A1B1]">{detalle.descripcion}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#0F151C] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#6B7A8C]">Duración</span>
                  <p className="flex items-center gap-1.5 text-sm font-black text-[#EAF0F6]"><Timer className="h-4 w-4 text-amber-600" /> {duracionLegible(detalle.duracion_minutos)}</p>
                </div>
                <div className="rounded-2xl bg-[#0F151C] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#6B7A8C]">Recomendado por</span>
                  <p className="flex items-center gap-1.5 text-sm font-black text-amber-300"><Crown className="h-4 w-4" /> {detalle.barbero_recomendado}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detalle.tags.map((t) => <span key={t} className="rounded-lg bg-amber-400/12 px-2.5 py-1 text-[11px] font-semibold text-amber-700">#{t}</span>)}
              </div>
              <div className="flex items-center justify-between border-t border-white/8 pt-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#6B7A8C]">Desde</span>
                  <p className="font-heading text-2xl font-black text-[#EAF0F6]">{formatoCOP(detalle.precio_sugerido)}</p>
                </div>
                <button onClick={() => { setDetalle(null); abrirReserva({ servicioId: 1 }); }} className="btn-primario flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black">
                  Quiero este corte <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ---------------------------------------------------------------
   FIDELIZACIÓN
--------------------------------------------------------------- */
export const Fidelizacion: React.FC = () => {
  const { usuario, premios, canjearPremio } = useApp();
  const [msg, setMsg] = useState('');

  const puntos = usuario?.puntos ?? 0;
  const nivel = usuario?.nivel_fidelizacion ?? 'Bronce';
  const meta = puntos >= 500 ? 500 : puntos >= 250 ? 500 : puntos >= 100 ? 250 : 100;
  const pct = Math.min(100, Math.round((puntos / meta) * 100));

  const niveles = [
    { n: 'Bronce', p: '0 pts', b: ['Acumulación estándar', 'Regalo de cumpleaños'] },
    { n: 'Plata', p: '100 pts', b: ['Bebida de cortesía', '5% en productos'] },
    { n: 'Oro', p: '250 pts', b: ['Toalla caliente gratis', '10% en servicios'] },
    { n: 'Diamante', p: '500 pts', b: ['Corte anual gratis', '20% permanente'] },
  ];

  const canjear = async (p: PremioFidelidad) => {
    const r = await canjearPremio(p);
    setMsg(r.mensaje);
    setTimeout(() => setMsg(''), 4500);
  };

  return (
    <section className="bg-[#0F151C] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/12 px-4 py-1.5 text-xs font-bold text-amber-300">
            <Crown className="h-3.5 w-3.5" /> Club Globde
          </span>
          <h2 className="font-heading mt-3 text-3xl font-black text-[#EAF0F6] sm:text-4xl">
            Tu lealtad vale <span className="text-oro">premios reales</span>
          </h2>
        </div>

        {/* Tarjeta de puntos */}
        <div className="mt-10 overflow-hidden rounded-[2rem] border border-amber-400/25 malla-suave p-6 sm:p-8">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="text-xs font-black uppercase tracking-widest text-amber-300">Tu saldo</span>
              <p className="font-heading text-5xl font-black text-[#EAF0F6]">{puntos}<span className="ml-1 text-lg text-amber-300">pts</span></p>
              <p className="text-xs text-[#93A1B1]">{usuario?.nombre ?? 'Invitado'} · Nivel {nivel}</p>
            </div>
            <div className="md:col-span-8">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-[#93A1B1]">Progreso hacia {meta} pts</span>
                <span className="text-amber-300">{pct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#0B0F14]">
                <div className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 brillo transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {niveles.map((n) => (
                  <div key={n.n} className={`rounded-2xl border p-3 text-left ${nivel === n.n ? 'border-amber-400/50 bg-amber-400/8' : 'border-white/8 bg-[#141A21]/70'}`}>
                    <p className="flex items-center justify-between text-xs font-black text-[#EAF0F6]">{n.n}<span className="text-[10px] font-bold text-amber-300">{n.p}</span></p>
                    <ul className="mt-1 space-y-0.5">
                      {n.b.map((x) => <li key={x} className="flex items-start gap-1 text-[10px] text-[#93A1B1]"><Check className="mt-0.5 h-2.5 w-2.5 text-emerald-300" />{x}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {msg && (
            <div className="anim-aparecer mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-300">
              <Check className="h-4 w-4" /> {msg}
            </div>
          )}
        </div>

        {/* Premios */}
        <h3 className="font-heading mt-12 flex items-center gap-2 text-2xl font-black text-[#EAF0F6]">
          <Gift className="h-6 w-6 text-amber-300" /> Catálogo de premios
        </h3>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {premios.map((p, i) => {
            const puede = puntos >= p.costo_puntos;
            return (
              <div key={p.id_premio} className={`card card-hover anim-aparecer retraso-${(i % 6) + 1} flex flex-col justify-between p-6`}>
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{p.icono}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${puede ? 'bg-amber-400/15 text-amber-300' : 'bg-white/6 text-[#6B7A8C]'}`}>
                      {p.costo_puntos} pts
                    </span>
                  </div>
                  <h4 className="font-heading mt-3 text-base font-black text-[#EAF0F6]">{p.titulo}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[#93A1B1]">{p.descripcion}</p>
                </div>
                <button onClick={() => canjear(p)} disabled={!puede}
                  className={`mt-5 rounded-2xl py-2.5 text-sm font-black transition ${
                    puede ? 'btn-oro' : 'cursor-not-allowed bg-white/5 text-[#5A6878]'
                  }`}>
                  {puede ? 'Canjear ahora' : `Te faltan ${p.costo_puntos - puntos} pts`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------
   RESEÑAS
--------------------------------------------------------------- */
export const Resenas: React.FC = () => {
  const { testimonios } = useApp();

  return (
    <section className="bg-[#0B0F14] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#141A21] px-4 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-white/8">
            <Star className="h-3.5 w-3.5 fill-amber-300" /> Opiniones verificadas
          </span>
          <h2 className="font-heading mt-3 text-3xl font-black text-[#EAF0F6] sm:text-4xl">
            Lo que dicen nuestros <span className="text-oro">clientes</span>
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {testimonios.slice(0, 4).map((t, i) => (
            <figure key={t.id} className={`card card-hover anim-aparecer retraso-${i + 1} flex flex-col justify-between p-6`}>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-amber-300 text-amber-300" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm italic leading-relaxed text-[#C6D0DC]">“{t.texto}”</blockquote>
              </div>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
                <img src={t.avatar_url} alt={t.nombre} className="h-10 w-10 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#EAF0F6]">{t.nombre}</p>
                  <p className="truncate text-[11px] text-[#6B7A8C]">{t.rol}</p>
                  <p className="truncate text-[11px] font-semibold text-amber-700">{t.corte}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-[2rem] border border-white/8 bg-[#141A21] p-6">
          {[
            { i: MapPin, t: 'Calle 85 #14-20', s: 'Zona Rosa, Bogotá' },
            { i: Clock, t: 'Lun a Dom', s: 'Desde las 8:00 a.m.' },
            { i: ShieldCheck, t: 'Bioseguridad', s: 'Certificada 2026' },
          ].map((x) => (
            <div key={x.t} className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/12 text-amber-700"><x.i className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-black text-[#EAF0F6]">{x.t}</span>
                <span className="text-[11px] text-[#6B7A8C]">{x.s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
