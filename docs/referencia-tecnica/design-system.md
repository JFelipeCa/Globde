# Design System & Identidad Visual — GLOBDE

<!--
  ¿Qué? Documentación del sistema de diseño real del frontend: tokens de Tailwind v4,
        paleta, clases utilitarias propias y deuda técnica de estilos.
  ¿Para qué? Que cualquiera que toque la UI sepa qué existe hoy en `src/index.css`,
             qué se puede reutilizar y qué está pendiente de normalizar.
  ¿Impacto? Evita seguir sumando colores hardcodeados y da un plan concreto para
            terminar la migración a Tailwind puro.
-->

> **Proyecto**: GLOBDE — Sistema de Gestión de Citas y Barbería
> **Temática**: Barbería clásica y moderna — tema **claro** con acentos negro y dorado
> **Motor de estilos**: **Tailwind CSS v4** vía plugin `@tailwindcss/vite`
> **Hoja única**: `frontend/src/index.css` (255 líneas) — no hay `tailwind.config.js`

---

## 1. Cómo está montado Tailwind v4

Tailwind v4 se configura **en CSS**, no en un archivo JS. Todo el sistema vive en
`frontend/src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-carbon: #0A0A0A;
  ...
}
```

| Pieza | Dónde | Para qué |
| :--- | :--- | :--- |
| Plugin de build | `vite.config.ts` → `@tailwindcss/vite` | Compila las utilidades en el bundle |
| Tokens de tema | `index.css` → bloque `@theme` | Genera utilidades tipo `bg-carbon`, `text-dorado` |
| Estilos base | `index.css` → `@layer base` | `html`, `body`, tipografía de encabezados |
| Clases propias | `index.css` (CSS plano) | `.card`, `.btn-oro`, animaciones, fondos |
| Composición de clases | `src/utils/cn.ts` | `clsx` + `tailwind-merge` para fusionar clases sin conflictos |

Las tipografías se cargan desde Google Fonts en `frontend/index.html`
(**Outfit** para encabezados, **Plus Jakarta Sans** para el cuerpo).

---

## 2. Tokens declarados en `@theme`

Estos 8 tokens generan utilidades de Tailwind (`bg-*`, `text-*`, `border-*`…):

| Token | Hex | Rol previsto |
| :--- | :---: | :--- |
| `--color-carbon` | `#0A0A0A` | Negro base: textos principales y superficies oscuras |
| `--color-superficie` | `#141414` | Superficie oscura secundaria |
| `--color-elevado` | `#1C1C1C` | Superficie oscura elevada |
| `--color-hueso` | `#F7F5F0` | Blanco cálido para texto sobre oscuro |
| `--color-turquesa` | `#D4AF37` | Acento principal (nombre heredado; **hoy es dorado**) |
| `--color-turquesa-hondo` | `#B8941F` | Acento en hover/activo |
| `--color-dorado` | `#E8C766` | Dorado claro de realce |
| `--color-dorado-hondo` | `#C9A227` | Dorado profundo |

> [!WARNING]
> Los tokens `turquesa` / `turquesa-hondo` conservan el nombre de la paleta cian
> anterior pero **contienen valores dorados**. Renombrarlos a `acento` /
> `acento-hondo` es parte de la deuda técnica de la sección 6.

---

## 3. Paleta efectiva (lo que se ve en pantalla)

El tema real es **claro**, no oscuro:

| Uso | Hex | Dónde |
| :--- | :---: | :--- |
| Fondo de página | `#FDFCFA` | `body` |
| Superficie de tarjeta | `#FFFFFF` | `.card`, `.glass` |
| Texto principal | `#0A0A0A` | `body`, títulos |
| Texto secundario | `#3F3F3F` | Descripciones |
| Texto atenuado | `#6B6B6B` / `#9A9A9A` | Metadatos, placeholders |
| Borde | `#E7E2D3` | Tarjetas, inputs, separadores |
| Acento dorado | `#D4AF37` | Botones de acción, focos, hovers |
| Dorado claro / profundo | `#E8C766` / `#B8941F` | Degradados de `.btn-oro`, `.text-oro` |

---

## 4. Clases utilitarias propias

Definidas a mano en `index.css`. Reutilizarlas antes de escribir estilos nuevos:

### Superficies
| Clase | Efecto |
| :--- | :--- |
| `.card` | Tarjeta blanca, borde suave, `border-radius: 1.5rem`, sombra difusa |
| `.card-hover` | Eleva la tarjeta 6 px y tiñe el borde de dorado al pasar el cursor |
| `.glass` | Cristal esmerilado: `backdrop-filter: blur(18px) saturate(140%)` |

### Botones
| Clase | Efecto |
| :--- | :--- |
| `.btn-primario` | Degradado negro con borde dorado; se eleva y aclara en hover |
| `.btn-oro` | Degradado dorado con texto oscuro `#1A1400` |

### Texto con degradado
| Clase | Efecto |
| :--- | :--- |
| `.text-aqua` | Degradado de grises a negro recortado sobre el texto |
| `.text-oro` | Degradado dorado recortado sobre el texto |

### Fondos decorativos
| Clase | Efecto |
| :--- | :--- |
| `.malla-suave` | Tres degradados radiales dorados de baja opacidad |
| `.patron-puntos` | Retícula de puntos de 22 × 22 px |
| `.poste-barberia` | Poste de barbería animado (negro/hueso/dorado, bucle de 2.2 s) |

### Animaciones de entrada
| Clase | Efecto |
| :--- | :--- |
| `.anim-aparecer` | Fundido + desplazamiento vertical de 18 px (0.65 s) |
| `.anim-zoom` | Fundido + escala desde 0.94 (0.35 s) |
| `.anim-derecha` | Entrada lateral desde la derecha (0.45 s) |
| `.anim-flotar` | Flotación vertical infinita (5 s) |
| `.anim-latido` | Pulso de opacidad y escala (6 s) |
| `.anim-sello` | Golpe de sello con rebote y rotación (0.7 s) |
| `.brillo` | Barrido de brillo dorado en bucle sobre el elemento |
| `.retraso-1` … `.retraso-6` | Escalonan animaciones de 0.08 s en 0.08 s |

Todas las transiciones usan la curva `cubic-bezier(.22, 1, .36, 1)`.

---

## 5. Tipografía

| Rol | Fuente | Detalle |
| :--- | :--- | :--- |
| Encabezados (`h1`–`h4`, `.font-heading`) | **Outfit** | `letter-spacing: -0.02em` |
| Cuerpo | **Plus Jakarta Sans** | Fallback: `system-ui, sans-serif` |

Para tamaños y pesos se usan las utilidades estándar de Tailwind
(`text-sm`, `text-4xl`, `font-semibold`…); no hay escala tipográfica propia.

---

## 6. Deuda técnica de estilos

Auditoría del código actual de `frontend/src`:

| Hallazgo | Cantidad |
| :--- | ---: |
| Clases con color arbitrario `[#hex]` en los `.tsx` | **453** |
| Tokens de `@theme` realmente usados en los componentes | **0 de 8** |
| Reglas `!important` en `index.css` | **13** |

### Qué pasó

Los componentes se escribieron con la paleta **oscura cian** original usando
colores literales (`bg-[#0B0F14]`, `text-[#EAF0F6]`, `text-[#93A1B1]`…). Al
cambiar a tema claro dorado no se reescribieron los componentes: se añadió al
final de `index.css` un bloque de **remapeos por selector de atributo**:

```css
[class*="bg-[#0B0F14]"] { background-color: #ffffff !important; }
[class*="text-[#EAF0F6]"] { color: #0A0A0A !important; }
```

Funciona, pero tiene tres costes: el CSS pelea contra sí mismo con
`!important`, los tokens de `@theme` quedan muertos, y leer un componente no
dice de qué color se va a ver.

### Colores literales más repetidos

| Literal | Apariciones | Debería ser |
| :--- | ---: | :--- |
| `[#EAF0F6]` | 117 | `text-carbon` |
| `[#93A1B1]` | 111 | texto atenuado (`text-neutral-500`) |
| `[#6B7A8C]` | 56 | texto muy atenuado |
| `[#141A21]` | 37 | superficie (`bg-white`) |
| `[#0F151C]` | 37 | superficie de input |
| `[#0B0F14]` | 19 | fondo de página |

### Plan de normalización (recomendación 5 del instructor)

1. Renombrar en `@theme` los tokens `turquesa*` → `acento*` y añadir los tokens
   que faltan: `--color-fondo: #FDFCFA`, `--color-borde: #E7E2D3`,
   `--color-texto-suave: #6B6B6B`.
2. Sustituir los literales por utilidades de token, empezando por los seis de la
   tabla anterior (cubren **377 de las 453** apariciones, un 83 %).
3. Borrar el bloque de remapeos con `!important` a medida que cada literal
   desaparece.
4. Extraer los patrones repetidos (badges de estado, encabezado de tabla) a
   clases propias o a un componente, en lugar de repetir cadenas largas de
   utilidades.

Es un trabajo **incremental y sin riesgo funcional**: se puede hacer archivo por
archivo verificando con `pnpm run build` que nada se rompe.

---

## 7. Estados de cita

Los seis estados que maneja el backend (`EstadoCita` en `schemas/comunes.py`) y
el color con el que se representan en la interfaz:

| Estado | Color | Significado |
| :--- | :--- | :--- |
| `pendiente` | Ámbar | Cita agendada, aún sin confirmar |
| `confirmada` | Dorado | Confirmada por barbero o administrador |
| `en_atencion` | Azul | El cliente está en el sillón |
| `completada` | Verde | Servicio terminado y facturado |
| `cancelada` | Rojo | Anulada por el cliente o el administrador |
| `no_asistio` | Gris | El cliente no se presentó (puede generar penalidad) |

---

## 📎 Ver también

- [`docs/referencia-tecnica/architecture.md`](architecture.md) — estructura del frontend.
- [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) — convenciones de código.
