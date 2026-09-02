import { obtenerAccessToken } from './session';

const DEFAULT_BASE_URL = '/api';

function getBaseUrl() {
  const meta = import.meta as unknown as {
    env?: { VITE_API_URL?: string };
  };

  const configured = meta.env?.VITE_API_URL?.toString().trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return DEFAULT_BASE_URL;
}

/**
 * Cliente único de API.
 * Añade el JWT automáticamente cuando existe una sesión.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = obtenerAccessToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';

  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'detail' in payload
        ? String(
            (payload as { detail?: unknown }).detail ??
              'Solicitud no exitosa',
          )
        : typeof payload === 'string' && payload
          ? payload
          : 'Solicitud no exitosa';

    throw new Error(message);
  }

  return (payload as T) ?? ({} as T);
}