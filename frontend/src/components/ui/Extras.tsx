import React, { useState } from 'react';
import {
  X, Sparkles, ArrowRight, RotateCcw, Crown, Clock, Check, Bell,
  CalendarDays, Scissors, MapPin, Phone, ShieldCheck, Code2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatoCOP, hoyISO, duracionLegible } from '../../utils/helpers';

/* =========================================================
   NOTIFICACIONES FLOTANTES
   ========================================================= */
export const Toasts: React.FC = () => {
  const { notificaciones } = useApp();
  if (!notificaciones.length) return null;

  const estilo: Record<string, string> = {
    cita: 'border-amber-400/40',
    puntos: 'border-amber-400/30',
    promo: 'border-neutral-300',
    sistema: 'border-white/10',
    error: 'border-rose-400/30',
    recordatorio: 'border-neutral-300',
  };
  const punto: Record<string, string> = {
    cita: 'bg-amber-400', puntos: 'bg-amber-400', promo: 'bg-neutral-800',
    sistema: 'bg-[#6B7A8C]', error: 'bg-rose-400', recordatorio: 'bg-neutral-800',
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2.5">
      {notificaciones.map((n) => (
        <div key={n.id} className={`anim-derecha pointer-events-auto rounded-2xl border bg-[#141A21] p-3.5 shadow-[0_24px_50px_-25px_rgba(0,0,0,1)] ${estilo[n.tipo]}`}>
          <div className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${punto[n.tipo]}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#EAF0F6]">{n.titulo}</p>
              <p className="mt-0.5 text-xs leading-snug text-[#93A1B1]">{n.mensaje}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* =========================================================
   ASESOR DE ESTILO (QUIZ)
   ========================================================= */
export const QuizModal: React.FC = () => {
  const { quizAbierto, setQuizAbierto, abrirReserva, catalogoCortes } = useApp();
  const [paso, setPaso] = useState(1);
  const [rostro, setRostro] = useState('');
  const [estilo, setEstilo] = useState('');
  const [barba, setBarba] = useState('');

  if (!quizAbierto) return null;

  const reiniciar = () => { setPaso(1); setRostro(''); setEstilo(''); setBarba(''); };
  const cerrar = () => { setQuizAbierto(false); reiniciar(); };

  let corte = catalogoCortes[0];
  let motivo = 'El más versátil de la temporada: juvenil, dinámico y muy favorecedor.';
  if (rostro === 'Cuadrado' || estilo === 'Ejecutivo clásico') {
    corte = catalogoCortes[2]; motivo = 'Suaviza los ángulos de la mandíbula y aporta una silueta elegante y ejecutiva.';
  } else if (barba === 'Barba densa') {
    corte = catalogoCortes[1]; motivo = 'El taper se integra con tu barba creando una transición armónica y natural.';
  } else if (estilo === 'Artístico') {
    corte = catalogoCortes[4]; motivo = 'Resalta tu personalidad audaz con textura y movimiento marcado.';
  } else if (estilo === 'Bajo mantenimiento') {
    corte = catalogoCortes[3]; motivo = 'Líneas limpias, frescura total y cero esfuerzo diario de peinado.';
  }

  const opciones = (items: string[], valor: string, set: (v: string) => void, next: number) => (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((o) => (
        <button key={o} onClick={() => { set(o); setPaso(next); }}
          className={`rounded-2xl border p-3.5 text-left text-sm font-bold transition hover:-translate-y-0.5 hover:border-amber-400/60 ${
            valor === o ? 'border-amber-400 bg-amber-400/10 text-amber-700' : 'border-white/10 bg-[#141A21] text-[#C6D0DC]'
          }`}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="anim-zoom card w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between bg-gradient-to-r from-neutral-950 to-neutral-800 px-6 py-5 text-white">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Asesor de estilo</span>
            <h3 className="font-heading text-2xl font-black">¿Qué corte me queda mejor?</h3>
          </div>
          <button onClick={cerrar} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-6">
          {paso <= 3 && (
            <div className="flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${paso >= i ? 'bg-amber-400' : 'bg-[#263140]'}`} />
              ))}
            </div>
          )}

          {paso === 1 && (
            <div className="anim-aparecer space-y-3">
              <p className="text-sm font-bold text-[#EAF0F6]">1. ¿Cómo es la forma de tu rostro?</p>
              {opciones(['Ovalado', 'Cuadrado', 'Redondo', 'Alargado'], rostro, setRostro, 2)}
            </div>
          )}
          {paso === 2 && (
            <div className="anim-aparecer space-y-3">
              <p className="text-sm font-bold text-[#EAF0F6]">2. ¿Cuál es tu estilo?</p>
              {opciones(['Urbano moderno', 'Ejecutivo clásico', 'Bajo mantenimiento', 'Artístico'], estilo, setEstilo, 3)}
            </div>
          )}
          {paso === 3 && (
            <div className="anim-aparecer space-y-3">
              <p className="text-sm font-bold text-[#EAF0F6]">3. ¿Cómo llevas tu barba?</p>
              {opciones(['Sin barba', 'Barba corta', 'Barba densa', 'Solo bigote'], barba, setBarba, 4)}
            </div>
          )}

          {paso === 4 && (
            <div className="anim-zoom space-y-4">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-4 text-center">
                <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#1A1400]">
                  Compatibilidad 98%
                </span>
                <h4 className="font-heading mt-2 text-xl font-black text-[#EAF0F6]">{corte.nombre}</h4>
                <p className="mt-1 text-xs text-[#93A1B1]">{motivo}</p>
              </div>
              <img src={corte.imagen_url} alt={corte.nombre} className="h-44 w-full rounded-2xl object-cover" />
              <div className="flex items-center justify-between text-xs font-semibold text-[#93A1B1]">
                <span className="flex items-center gap-1"><Crown className="h-3.5 w-3.5 text-amber-600" /> {corte.barbero_recomendado}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-600" /> {duracionLegible(corte.duracion_minutos)}</span>
                <span className="font-black text-[#EAF0F6]">{formatoCOP(corte.precio_sugerido)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={reiniciar} className="flex items-center gap-1.5 rounded-2xl border border-white/12 px-4 py-2.5 text-xs font-bold text-[#93A1B1] hover:bg-white/5">
                  <RotateCcw className="h-3.5 w-3.5" /> Repetir
                </button>
                <button onClick={() => { cerrar(); abrirReserva({ servicioId: 1 }); }}
                  className="btn-primario flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold">
                  Agendar este corte <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   LISTA DE ESPERA
   ========================================================= */
export const EsperaModal: React.FC = () => {
  const { esperaAbierta, setEsperaAbierta, servicios, barberos, usuario, unirseListaEspera } = useApp();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [tel, setTel] = useState(usuario?.telefono ?? '');
  const [servId, setServId] = useState(servicios[0]?.id_servicio ?? 1);
  const [barbId, setBarbId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(hoyISO());
  const [franja, setFranja] = useState<'manana' | 'tarde' | 'cualquiera'>('tarde');

  if (!esperaAbierta) return null;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const s = servicios.find((x) => x.id_servicio === Number(servId));
    const b = barberos.find((x) => x.id_barbero === Number(barbId));
    unirseListaEspera({
      id_cliente: usuario?.id_usuario ?? 999,
      nombre_cliente: nombre || 'Cliente',
      telefono: tel || '+57 300 000 0000',
      id_servicio: Number(servId),
      servicio_nombre: s?.nombre ?? '',
      id_barbero: barbId ? Number(barbId) : undefined,
      barbero_nombre: b?.nombre,
      fecha_deseada: fecha,
      franja_horaria: franja,
    });
  };

  const input = 'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="anim-zoom card w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between bg-gradient-to-r from-neutral-950 to-neutral-800 px-6 py-5 text-white">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Turno prioritario</span>
            <h3 className="font-heading text-2xl font-black">Lista de espera</h3>
          </div>
          <button onClick={() => setEsperaAbierta(false)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={enviar} className="space-y-3 p-6">
          <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/8 p-3 text-xs text-amber-700">
            <Bell className="mt-0.5 h-4 w-4 shrink-0" />
            Si se libera un turno en tu franja, te avisamos de inmediato por WhatsApp.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" required className={input} />
            <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="WhatsApp" required className={input} />
          </div>
          <select value={servId} onChange={(e) => setServId(Number(e.target.value))} className={input}>
            {servicios.map((s) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}
          </select>
          <select value={barbId} onChange={(e) => setBarbId(e.target.value ? Number(e.target.value) : '')} className={input}>
            <option value="">Cualquier barbero disponible</option>
            {barberos.map((b) => <option key={b.id_barbero} value={b.id_barbero}>{b.nombre}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
            <select value={franja} onChange={(e) => setFranja(e.target.value as 'manana' | 'tarde' | 'cualquiera')} className={input}>
              <option value="manana">Mañana (8 a.m. – 1 p.m.)</option>
              <option value="tarde">Tarde (1 p.m. – 8 p.m.)</option>
              <option value="cualquiera">Cualquier horario</option>
            </select>
          </div>
          <button type="submit" className="btn-primario w-full rounded-2xl py-3 text-sm font-bold">
            <span className="flex items-center justify-center gap-2"><Check className="h-4 w-4" /> Anotarme en la lista</span>
          </button>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   PIE DE PÁGINA
   ========================================================= */
export const Footer: React.FC = () => {
  const { irA, abrirReserva, setEsperaAbierta } = useApp();

  return (
    <footer className="border-t border-white/8 bg-[#141A21]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="poste-barberia logo-marco relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0F151C] ring-1 ring-amber-400/40">
                <img src="/Logo.webp" alt="Logo Globde" className="relative z-10 h-full w-full object-contain p-1" />
              </span>
              <span>
                <span className="font-heading block text-lg font-black text-[#EAF0F6]">GLOB<span className="text-amber-500">DE</span></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">Barber Studio</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#93A1B1]">
              Tu barbershop de confianza en Bogotá. Agenda tu cita en línea, acumula
              puntos con cada visita y disfruta de beneficios exclusivos en cada corte.
            </p>
          </div>

          <div>
            <h4 className="font-heading mb-3 text-sm font-black uppercase tracking-wide text-[#EAF0F6]">Navegación</h4>
            <ul className="space-y-2 text-xs font-semibold text-[#93A1B1]">
              <li><button onClick={() => irA('inicio')} className="hover:text-amber-600">Inicio</button></li>
              <li><button onClick={() => irA('catalogo')} className="hover:text-amber-600">Catálogo de cortes</button></li>
              <li><button onClick={() => irA('fidelizacion')} className="hover:text-amber-600">Club de puntos</button></li>
              <li><button onClick={() => setEsperaAbierta(true)} className="hover:text-amber-600">Lista de espera</button></li>
              <li><button onClick={() => abrirReserva()} className="font-black text-amber-600 hover:underline">Reservar cita</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading mb-3 flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-[#EAF0F6]">
              <CalendarDays className="h-4 w-4 text-amber-600" /> Horarios
            </h4>
            <ul className="space-y-1.5 text-xs text-[#93A1B1]">
              <li className="flex justify-between"><span>Lunes a viernes</span><strong className="text-[#EAF0F6]">8:00 a.m. – 8:00 p.m.</strong></li>
              <li className="flex justify-between"><span>Sábados</span><strong className="text-[#EAF0F6]">8:00 a.m. – 7:30 p.m.</strong></li>
              <li className="flex justify-between"><span>Domingos</span><strong className="text-amber-600">10:00 a.m. – 5:00 p.m.</strong></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading mb-3 text-sm font-black uppercase tracking-wide text-[#EAF0F6]">Contacto</h4>
            <ul className="space-y-2 text-xs text-[#93A1B1]">
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-amber-600" /> Calle 85 #14-20, Zona Rosa, Bogotá</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-600" /> +57 312 456 7890</li>
              <li className="flex items-center gap-2"><Scissors className="h-4 w-4 text-amber-600" /> 3 barberos certificados</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-2xl bg-[#0F151C] p-4 sm:flex-row">
          <span className="flex items-center gap-2 text-xs font-semibold text-[#93A1B1]">
            <Code2 className="h-4 w-4 text-amber-600" /> Equipo ADSO · SENA: Juan Felipe Cañón · Dayanna Patiño · Laura Cepeda
          </span>
          <span className="flex items-center gap-2 text-xs text-[#93A1B1]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Datos protegidos y contraseñas cifradas
          </span>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#5A6878]">
          © 2026 Globde Barber Studio · Todos los derechos reservados
          <Sparkles className="ml-1 inline h-3 w-3 text-amber-500" />
        </p>
      </div>
    </footer>
  );
};
