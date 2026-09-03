import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/ui/Navbar';
import { AuthModal } from './components/ui/AuthModal';
import { TicketModal } from './components/ui/TicketModal';
import { BookingWizard } from './components/ui/BookingWizard';
import { Toasts, QuizModal, EsperaModal, Footer } from './components/ui/Extras';
import { Hero, Beneficios, Servicios, Barberos, Catalogo, Fidelizacion, Resenas } from './components/sections/Landing';
import { PanelCliente } from './components/paneles/PanelCliente';
import { PanelBarbero } from './components/paneles/PanelBarbero';
import { PanelAdmin } from './components/paneles/PanelAdmin';
import { ROL_ADMINISTRADOR, ROL_BARBERO, ROL_CLIENTE } from './types';
import type { TipoRol } from './types';

// Guarda de acceso por rol en el CLIENTE. Es una primera barrera de UX; la
// autorización real la impone el backend (SoloAdmin/SoloBarbero/SoloCliente),
// que devuelve 401/403 si el token no tiene el rol requerido. Aquí solo
// evitamos mostrar un panel a quien no corresponde, leyendo el rol que
// devuelve el servidor en /auth/me (no un valor manipulable en localStorage).
const ACCESO_POR_PANEL: Record<string, TipoRol[]> = {
  'panel-admin': [ROL_ADMINISTRADOR],
  'panel-barbero': [ROL_BARBERO],
  'panel-cliente': [ROL_CLIENTE],
};

const AccesoRestringido: React.FC<{ vista: string }> = ({ vista }) => {
  const { irA, usuario } = useApp();
  const nombre = vista.replace('panel-', '');
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0B0F14] px-4 py-12">
      <div className="card max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-3xl">🔒</div>
        <h2 className="font-heading mt-4 text-2xl font-black text-[#EAF0F6]">
          Acceso restringido
        </h2>
        <p className="mt-2 text-sm text-[#9AA8B5]">
          {usuario
            ? `Tu cuenta (${usuario.nombre}) no tiene permisos para ver el ${nombre}.`
            : 'Debes iniciar sesión para ver este panel.'}
        </p>
        <button
          onClick={() => irA(usuario ? (usuario.id_rol === ROL_ADMINISTRADOR ? 'panel-admin' : usuario.id_rol === ROL_BARBERO ? 'panel-barbero' : 'panel-cliente') : 'inicio')}
          className="btn-primario mt-6 inline-flex rounded-2xl px-5 py-2.5 text-sm font-bold"
        >
          {usuario ? 'Ir a mi panel' : 'Volver al inicio'}
        </button>
      </div>
    </div>
  );
};

const Contenido: React.FC = () => {
  const { vista, usuario } = useApp();

  // Si se intenta acceder a un panel sin sesión o con un rol que no corresponde
  // (p. ej. un cliente forzando 'panel-admin'), se muestra el guard en lugar del
  // panel. El rol proviene del backend vía /auth/me.
  const renderizadorPanel = (panel: React.ReactNode) => {
    const rolesPermitidos = ACCESO_POR_PANEL[vista];
    if (rolesPermitidos && (!usuario || !rolesPermitidos.includes(usuario.id_rol))) {
      return <AccesoRestringido vista={vista} />;
    }
    return panel;
  };

  return (
    <>
      {vista === 'inicio' && (
        <>
          <Hero />
          <Servicios />
          <Beneficios />
          <Barberos />
          <Catalogo />
          <Resenas />
        </>
      )}

      {vista === 'catalogo' && (
        <>
          <Catalogo />
          <Servicios />
          <Barberos />
        </>
      )}

      {vista === 'fidelizacion' && (
        <>
          <Fidelizacion />
          <Resenas />
        </>
      )}

      {vista === 'panel-cliente' && renderizadorPanel(<PanelCliente />)}
      {vista === 'panel-barbero' && renderizadorPanel(<PanelBarbero />)}
      {vista === 'panel-admin' && renderizadorPanel(<PanelAdmin />)}
    </>
  );
};

export default function App() {
  const esRutaRecuperacion =
    window.location.pathname === '/restablecer-password' &&
    new URLSearchParams(window.location.search).has('token');

  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col bg-[#FDFBF7]">
        {!esRutaRecuperacion && <Navbar />}
        {!esRutaRecuperacion && (
          <main className="flex-1">
            <Contenido />
          </main>
        )}
        {!esRutaRecuperacion && <Footer />}

        {/* Capas superpuestas */}
        <AuthModal />
        <BookingWizard />
        <TicketModal />
        <QuizModal />
        <EsperaModal />
        <Toasts />
      </div>
    </AppProvider>
  );
}
