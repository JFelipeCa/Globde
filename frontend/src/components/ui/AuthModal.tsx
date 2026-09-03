import React, { useEffect, useRef, useState } from 'react';
import {
  X, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, Sparkles,
  Eye, EyeOff, Check, CircleAlert, MailCheck, RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { evaluarPassword, validarCorreo, validarNombre, validarTelefono } from '../../utils/helpers';

/* ---------- Medidor de contraseña reutilizable ---------- */
const MedidorPassword: React.FC<{ valor: string }> = ({ valor }) => {
  const f = evaluarPassword(valor);
  const reqs = [
    { ok: f.requisitos.longitud, t: 'Mínimo 8 caracteres' },
    { ok: f.requisitos.mayuscula, t: 'Una mayúscula (A-Z)' },
    { ok: f.requisitos.minuscula, t: 'Una minúscula (a-z)' },
    { ok: f.requisitos.numero, t: 'Un número (0-9)' },
    { ok: f.requisitos.especial, t: 'Un símbolo (!@#$…)' },
    { ok: f.requisitos.sinEspacios, t: 'Sin espacios en blanco' },
  ];
  return (
    <div className="mt-2 rounded-2xl border border-white/8 bg-[#0F151C] p-3">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-[#93A1B1]">Seguridad de la contraseña</span>
        <span className={f.colorTexto}>{f.etiqueta}</span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < f.puntaje ? f.color : 'bg-[#263140]'}`}
          />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {reqs.map((r) => (
          <li key={r.t} className={`flex items-center gap-1.5 text-[11px] ${r.ok ? 'text-emerald-300' : 'text-[#6B7A8C]'}`}>
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${r.ok ? 'bg-emerald-400' : 'bg-[#263140]'}`}>
              <Check className={`h-2.5 w-2.5 ${r.ok ? 'text-[#04211F]' : 'text-[#6B7A8C]'}`} />
            </span>
            {r.t}
          </li>
        ))}
      </ul>
    </div>
  );
};

const Campo: React.FC<{
  etiqueta: string; icono: React.ElementType; children: React.ReactNode;
}> = ({ etiqueta, icono: Icono, children }) => (
  <div>
    <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-[#93A1B1]">
      <Icono className="h-3.5 w-3.5 text-amber-600" /> {etiqueta}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full rounded-xl border border-white/10 bg-[#0F151C] px-3.5 py-2.5 text-sm text-[#EAF0F6] placeholder-[#5A6878] outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15';

export const AuthModal: React.FC = () => {
  const {
    modalAuth, abrirAuth, cerrarAuth, login, registrar,
    solicitarCodigo, verificarCodigo, restablecerPassword, limpiarRecuperacion,
    codigoRecuperacion,
  } = useApp();
  const verificarCodigoRef = useRef(verificarCodigo);
  verificarCodigoRef.current = verificarCodigo;

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verPwd, setVerPwd] = useState(false);
  const [error, setError] = useState('');

  const [rNombre, setRNombre] = useState('');
  const [rCorreo, setRCorreo] = useState('');
  const [rTel, setRTel] = useState('');
  const [rPwd, setRPwd] = useState('');
  const [rPwd2, setRPwd2] = useState('');

  /* Recuperación */
  const [pasoRec, setPasoRec] = useState(() => (
    new URLSearchParams(window.location.search).has('token') ? 2 : 1
  ));
  const [recCorreo, setRecCorreo] = useState('');
  const [tokenRecuperacion, setTokenRecuperacion] = useState(() => (
    new URLSearchParams(window.location.search).get('token') ?? ''
  ));
  const [nuevaPwd, setNuevaPwd] = useState('');
  const [nuevaPwd2, setNuevaPwd2] = useState('');
  const [exitoRec, setExitoRec] = useState('');
  const enlaceValidado = useRef(false);
  useEffect(() => {
    const tokenDesdeUrl = new URLSearchParams(window.location.search).get('token');
    if (codigoRecuperacion) setTokenRecuperacion(codigoRecuperacion);
    if (!tokenDesdeUrl || modalAuth !== 'recuperar' || enlaceValidado.current) return;

    enlaceValidado.current = true;
    const validarEnlace = async () => {
      const resultado = await verificarCodigoRef.current(tokenDesdeUrl);
      if (resultado.ok) {
        window.history.replaceState({}, document.title, window.location.pathname);
        window.dispatchEvent(new PopStateEvent('popstate'));
        setPasoRec(3);
      } else {
        setError(resultado.mensaje);
      }
    };
    void validarEnlace();
  }, [codigoRecuperacion, modalAuth]);

  useEffect(() => {
    if (modalAuth) return;
    setCorreo('');
    setContrasena('');
    setVerPwd(false);
    setError('');
    setRNombre('');
    setRCorreo('');
    setRTel('');
    setRPwd('');
    setRPwd2('');
    setPasoRec(1);
    setRecCorreo('');
    setNuevaPwd('');
    setNuevaPwd2('');
    setExitoRec('');
  }, [modalAuth]);

  if (!modalAuth) return null;

  const cerrar = () => {
    cerrarAuth();
    setError(''); setPasoRec(1); setExitoRec('');
    setTokenRecuperacion('');
    limpiarRecuperacion();
  };

  const enviarLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!validarCorreo(correo)) return setError('Ingresa un correo electrónico válido.');
    if (contrasena.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    const r = await login(correo, contrasena);
    if (!r.ok) setError(r.mensaje);
  };

  const enviarRegistro = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!validarNombre(rNombre)) return setError('El nombre solo admite letras y mínimo 3 caracteres.');
    if (!validarCorreo(rCorreo)) return setError('Ingresa un correo electrónico válido.');
    if (!validarTelefono(rTel)) return setError('El teléfono debe tener entre 7 y 15 dígitos.');
    if (!evaluarPassword(rPwd).esSegura) return setError('Tu contraseña aún no cumple todos los requisitos de seguridad.');
    if (rPwd !== rPwd2) return setError('Las contraseñas no coinciden.');
    const r = await registrar(rNombre, rCorreo, rTel, rPwd);
    if (!r.ok) setError(r.mensaje);
  };

  const pedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!validarCorreo(recCorreo)) return setError('Ingresa el correo con el que te registraste.');
    const r = await solicitarCodigo(recCorreo);
    if (!r.ok) return setError(r.mensaje);
    setPasoRec(2);
  };

  const guardarNueva = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const r = await restablecerPassword(tokenRecuperacion, nuevaPwd, nuevaPwd2);
    if (!r.ok) return setError(r.mensaje);
    setExitoRec(r.mensaje); setPasoRec(4);
  };

  const tabs = [
    { id: 'login', t: 'Iniciar sesión' },
    { id: 'registro', t: 'Crear cuenta · +150 pts' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="anim-zoom card w-full max-w-lg overflow-hidden">
        {/* Encabezado */}
        <div className="relative overflow-hidden bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90">Club Globde</span>
              <h3 className="font-heading text-2xl font-black">
                {modalAuth === 'recuperar' ? 'Recuperar contraseña' : '¡Bienvenido a la barbería!'}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-white/75">
                {modalAuth === 'recuperar'
                  ? 'Te enviaremos un enlace seguro para crear una nueva contraseña.'
                  : 'Agenda, acumula puntos y gestiona tus citas en un solo lugar.'}
              </p>
            </div>
            <button onClick={cerrar} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* Pestañas */}
          {modalAuth !== 'recuperar' && (
            <div className="mb-5 flex rounded-2xl bg-[#0F151C] p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { abrirAuth(t.id); setError(''); }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    modalAuth === t.id ? 'bg-amber-400 text-[#1A1400] shadow' : 'text-[#93A1B1] hover:text-[#EAF0F6]'
                  }`}
                >
                  {t.t}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs font-medium text-rose-300">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* ---------------- LOGIN ---------------- */}
          {modalAuth === 'login' && (
            <form onSubmit={enviarLogin} className="anim-aparecer space-y-4">
              <Campo etiqueta="Correo electrónico" icono={Mail}>
                <input type="email" value={correo} maxLength={128} onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tucorreo@ejemplo.com" pattern="[^\s@]+@[^\s@]+\.[A-Za-z]{2,}" title="Ingresa un correo válido, por ejemplo nombre@dominio.com" className={inputCls} />
              </Campo>

              <Campo etiqueta="Contraseña" icono={Lock}>
                <div className="relative">
                  <input type={verPwd ? 'text' : 'password'} value={contrasena} maxLength={128} onChange={(e) => setContrasena(e.target.value)}
                    placeholder="••••••••" className={inputCls + ' pr-11'} />
                  <button type="button" onClick={() => setVerPwd(!verPwd)}
                    className="absolute right-3 top-2.5 text-[#6B7A8C] hover:text-amber-600">
                    {verPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Campo>

              <button type="button" onClick={() => { abrirAuth('recuperar'); setError(''); }}
                className="text-xs font-bold text-amber-700 hover:underline">
                ¿Olvidaste tu contraseña? Recupérala con un enlace
              </button>

              <button type="submit" className="btn-primario flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold">
                Entrar a mi cuenta <ArrowRight className="h-4 w-4" />
              </button>

            </form>
          )}

          {/* ---------------- REGISTRO ---------------- */}
          {modalAuth === 'registro' && (
            <form onSubmit={enviarRegistro} className="anim-aparecer space-y-3.5">
              <Campo etiqueta="Nombre completo" icono={User}>
                <input value={rNombre} maxLength={80} onChange={(e) => setRNombre(e.target.value)} placeholder="Nombre y apellido" className={inputCls} />
              </Campo>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo etiqueta="Correo" icono={Mail}>
                  <input type="email" value={rCorreo} maxLength={128} onChange={(e) => setRCorreo(e.target.value)} placeholder="correo@ejemplo.com" pattern="[^\s@]+@[^\s@]+\.[A-Za-z]{2,}" title="Ingresa un correo válido, por ejemplo nombre@dominio.com" className={inputCls} />
                </Campo>
                <Campo etiqueta="Celular" icono={Phone}>
                  <input type="tel" inputMode="numeric" value={rTel} maxLength={15}
                    onChange={(e) => setRTel(e.target.value.replace(/\D/g, ''))}
                    placeholder="3000000000" pattern="[0-9]{7,15}" title="Ingresa entre 7 y 15 dígitos" className={inputCls} />
                </Campo>
              </div>

              <Campo etiqueta="Crear contraseña segura" icono={Lock}>
                <div className="relative">
                  <input type={verPwd ? 'text' : 'password'} value={rPwd} maxLength={128} onChange={(e) => setRPwd(e.target.value)}
                    placeholder="Ej: Globde2026*" className={inputCls + ' pr-11'} />
                  <button type="button" onClick={() => setVerPwd(!verPwd)} className="absolute right-3 top-2.5 text-[#6B7A8C] hover:text-amber-600">
                    {verPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <MedidorPassword valor={rPwd} />
              </Campo>

              <Campo etiqueta="Confirmar contraseña" icono={ShieldCheck}>
                <input type="password" value={rPwd2} onChange={(e) => setRPwd2(e.target.value)} placeholder="Repite la contraseña" className={inputCls} />
                {rPwd2.length > 0 && (
                  <p className={`mt-1 text-[11px] font-semibold ${rPwd === rPwd2 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {rPwd === rPwd2 ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden'}
                  </p>
                )}
              </Campo>

              <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] font-semibold text-amber-700">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                Al registrarte recibes <strong className="mx-1 text-amber-700">150 puntos</strong> de bienvenida.
              </div>

              <button type="submit" className="btn-oro flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black">
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* ---------------- RECUPERAR CONTRASEÑA ---------------- */}
          {modalAuth === 'recuperar' && (
            <div className="anim-aparecer space-y-4">
              <div className="flex items-center gap-2">
                {['Correo', 'Nueva clave'].map((p, i) => (
                  <div key={p} className="flex-1">
                    <div className={`h-1.5 rounded-full transition-all ${pasoRec > i + 1 ? 'bg-amber-400' : 'bg-[#263140]'}`} />
                    <span className={`mt-1 block text-[10px] font-bold ${pasoRec > i ? 'text-amber-700' : 'text-[#6B7A8C]'}`}>{p}</span>
                  </div>
                ))}
              </div>

              {pasoRec === 1 && (
                <form onSubmit={pedirCodigo} className="space-y-4">
                  <Campo etiqueta="Correo registrado" icono={Mail}>
                        <input type="email" value={recCorreo} maxLength={128} onChange={(e) => setRecCorreo(e.target.value)}
                          placeholder="tucorreo@ejemplo.com" pattern="[^\s@]+@[^\s@]+\.[A-Za-z]{2,}" title="Ingresa un correo válido, por ejemplo nombre@dominio.com" className={inputCls} />
                  </Campo>
                  <button type="submit" className="btn-primario flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold">
                    <MailCheck className="h-4 w-4" /> Enviarme el enlace
                  </button>
                  <button type="button" onClick={() => abrirAuth('login')} className="w-full text-xs font-bold text-[#6B7A8C] hover:text-amber-600">
                    Volver a iniciar sesión
                  </button>
                </form>
              )}

              {pasoRec === 2 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-800">
                    Enviamos un enlace de recuperación a <strong className="text-[#EAF0F6]">{recCorreo || 'tu correo registrado'}</strong>.
                    <span className="mt-1 block text-[10px] opacity-70">Abre el enlace del correo para continuar.</span>
                  </div>
                  <button type="button" onClick={() => setPasoRec(1)} className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-[#6B7A8C] hover:text-amber-600">
                    <RotateCcw className="h-3.5 w-3.5" /> Reenviar a otro correo
                  </button>
                </div>
              )}

              {pasoRec === 3 && (
                <form onSubmit={guardarNueva} className="space-y-4">
                  <Campo etiqueta="Nueva contraseña" icono={Lock}>
                    <input type="password" value={nuevaPwd} onChange={(e) => setNuevaPwd(e.target.value)} placeholder="Nueva contraseña segura" className={inputCls} />
                    <MedidorPassword valor={nuevaPwd} />
                  </Campo>
                  <Campo etiqueta="Confirmar nueva contraseña" icono={ShieldCheck}>
                    <input type="password" value={nuevaPwd2} onChange={(e) => setNuevaPwd2(e.target.value)} placeholder="Repite la contraseña" className={inputCls} />
                  </Campo>
                  <button type="submit" className="btn-primario w-full rounded-2xl py-3 text-sm font-bold">
                    Guardar nueva contraseña
                  </button>
                </form>
              )}

              {pasoRec === 4 && (
                <div className="space-y-4 py-4 text-center">
                  <div className="anim-sello mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/12">
                    <Check className="h-10 w-10 text-emerald-300" strokeWidth={3} />
                  </div>
                  <h4 className="font-heading text-2xl font-black text-[#EAF0F6]">¡Contraseña actualizada!</h4>
                  <p className="text-sm text-[#93A1B1]">{exitoRec}</p>
                  <button onClick={() => { abrirAuth('login'); setPasoRec(1); }} className="btn-primario w-full rounded-2xl py-3 text-sm font-bold">
                    Iniciar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
