import type { Vista } from '../types';

const ACCESS_TOKEN_KEY = 'globde_access_token';
const REFRESH_TOKEN_KEY = 'globde_refresh_token';
const VISTA_KEY = 'globde_vista';
const VISTAS_VALIDAS: Vista[] = [
  'inicio', 'catalogo', 'fidelizacion', 'mis-citas',
  'panel-admin', 'panel-barbero', 'panel-cliente',
];

/**
 * Guarda las credenciales de sesión.
 * El perfil y el rol se consultan desde el backend con /api/auth/me.
 */
export function guardarSesion(
  accessToken: string,
  refreshToken: string,
): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function obtenerAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function obtenerRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function limpiarSesion(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function guardarVista(vista: Vista): void {
  sessionStorage.setItem(VISTA_KEY, vista);
}

export function obtenerVista(): Vista | null {
  const vista = sessionStorage.getItem(VISTA_KEY);
  return vista && VISTAS_VALIDAS.includes(vista as Vista) ? vista as Vista : null;
}

export function limpiarVista(): void {
  sessionStorage.removeItem(VISTA_KEY);
}