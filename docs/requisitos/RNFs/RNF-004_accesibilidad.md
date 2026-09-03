# RNF-004 — Accesibilidad Web (WCAG 2.1 AA y ARIA)

<!--
  ¿Qué? Requisito no funcional que define las pautas de inclusión y accesibilidad web aplicadas en GLOBDE.
  ¿Para qué? Permitir que personas con diferentes capacidades sensoriales y motoras puedan usar el sistema.
  ¿Impacto? Garantiza un software inclusivo y alineado con los estándares internacionales de la W3C.
-->

---

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | RNF-004 |
| **Nombre** | Accesibilidad Web |
| **Categoría** | Accesibilidad (WCAG 2.1 Nivel AA / W3C WAI-ARIA) |
| **Prioridad** | Media-Alta |
| **Estado** | Implementado |

---

## Especificación de Requisitos

### RNF-004.1 — Contraste Cromático Suficiente
Todos los textos principales y elementos interactivos deben cumplir una relación de contraste mínima de **4.5:1** para texto normal y **3:1** para texto grande e iconos de acción, asegurando legibilidad sobre los fondos oscuros característicos del tema Globde.

### RNF-004.2 — Navegabilidad por Teclado
Todos los elementos interactivos (botones, campos de entrada, selectores de fecha, modales y enlaces de navegación) deben ser alcanzables y operables utilizando exclusivamente la tecla `Tab` y `Enter`/`Space`, con un indicador visible de foco (`outline`/`ring`).

### RNF-004.3 — Semántica HTML5 y Atributos ARIA
El código JSX debe emplear etiquetas estructurales semánticas (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`, `<dialog>`) y atributos `aria-label`, `aria-expanded` y `aria-current` en menús colapsables y controles de estado.
