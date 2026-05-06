# fixes_final.md — Sistema de desbloqueo progresivo

## Contexto y motivación

Durante la redacción de la memoria académica se detectó una incoherencia fundamental en el diseño de la plataforma: el motor procedural de ejercicios de gramática genera frases combinando el vocabulario visto por el usuario, pero si el usuario accede a "Practica → Gramática" sin haber completado ningún bloque de Comunicación, el sistema no tiene garantía de que conozca los signos necesarios para interpretar los ejercicios. El recorrido de aprendizaje declarado en la memoria (vocabulario → gramática teórica → práctica gramatical → conversación) no estaba reforzado técnicamente.

Se implementó un sistema de desbloqueo progresivo que hace coherente la experiencia de aprendizaje con la narrativa pedagógica del TFG.

---

## Reglas de desbloqueo

### Siempre libres (sin requisitos)
- Aprende → Abecedario
- Aprende → Vocabulario
- Practica → Abecedario
- Practica → Vocabulario

### Cadena de desbloqueo
1. **Aprende → Comunicación (Bloque 1 "ENM")** se desbloquea cuando el usuario ha visto todas las palabras de todas las categorías del módulo `vocabulario`.
2. **Bloque 2, 3… 11** siguen la cadena que ya existía: cada bloque requiere el anterior completado.
3. **Practica → Gramática** se desbloquea cuando el Bloque 1 de Comunicación (`id: 'enm'`) está **completado** (no solo visible).
4. **¿Conversamos?** se desbloquea cuando los 11 bloques de Comunicación están completados (`bloquesCompletados >= 11`).

### Admins
Todo desbloqueado desde el inicio. Se comprueba `resp.usuario?.rol === 'ROL_ADMIN'` antes de llamar al servicio de desbloqueo.

---

## Implementación

### Nuevo servicio: `DesbloqueoService`
**Ruta:** `frontend/src/app/services/desbloqueo.service.ts`

Centraliza toda la lógica de desbloqueo. Hace tres llamadas HTTP en paralelo con `combineLatest`:
- `GET /api/progreso-vocabulario?modulo=vocabulario` → palabras vistas
- `GET /api/categorias` → categorías filtradas por `modulo === 'vocabulario'` con su `totalPalabras`
- `GET /api/progreso-comunicacion` → bloques completados

Devuelve un objeto `EstadoDesbloqueo`:
```typescript
interface EstadoDesbloqueo {
  vocabularioCompleto: boolean;        // palabrasVistas >= totalPalabras de vocabulario
  bloquesCompletados: number;          // cuántos bloques de comunicación completados
  bloque1Completado: boolean;          // completados.some(b => b.bloqueId === 'enm')
  todosComunicacionCompletos: boolean; // bloquesCompletados >= 11
}
```

No requiere ningún cambio en el backend. Todo se calcula en frontend a partir de endpoints ya existentes.

**Constante importante:** `TOTAL_BLOQUES_COMUNICACION = 11` (los 11 bloques definidos en `comunicacion.component.ts`).

**IDs de los bloques de Comunicación** (tal como se guardan en MongoDB):
`enm`, `sov`, `preguntas`, `genero`, `presentaciones`, `verbos`, `tiempos`, `negacion`, `plural`, `adverbios`, `intensidad`

---

### Cambios en `aprende.component.ts`
- Inyecta `DesbloqueoService` y `UsuariosService`.
- Nueva propiedad `comunicacionDesbloqueada = false` (y `esAdmin = false`).
- En `ngOnInit`: tras obtener el usuario, si es admin → `comunicacionDesbloqueada = true`; si no → llama a `desbloqueoService.obtenerEstado()` y asigna `estado.vocabularioCompleto`.
- `irAComunicacion()` hace `return` inmediato si `!comunicacionDesbloqueada`.

### Cambios en `aprende.component.html`
- Card de Comunicación recibe `[class.apr-card--locked]="!comunicacionDesbloqueada"`.
- Badge con icono candado + texto "Completa Vocabulario primero" visible cuando está bloqueada.
- Botón con `[disabled]="!comunicacionDesbloqueada"` y texto condicional "Aprender" / "Bloqueado".

### Cambios en `aprende.component.css`
- `.apr-card--locked`: `cursor: not-allowed`, `opacity: 0.6`, `filter: grayscale(0.4)`, sin hover.
- `.apr-lock-badge`: badge pequeño gris con el icono candado.
- `button[disabled]`: fondo gris, `cursor: not-allowed`.

---

### Cambios en `practica.component.ts`
- Implementa `OnInit` (antes solo `AfterViewInit`).
- Inyecta `DesbloqueoService` y `UsuariosService`.
- La sección Gramática arranca con `locked: true` en el array `secciones`.
- En `ngOnInit`: si admin → desbloquea; si no → espera `bloque1Completado`.
- `irA()` cambia de recibir `id: string` a recibir `s: SeccionPractica` y comprueba `s.locked` antes de navegar.

### Cambios en `practica.component.html`
- Wrapper recibe `[class.prac-ac-wrap--locked]="s.locked"`.
- El punto de novedad solo se muestra si `!s.locked`.
- El `deco` muestra `🔒` si locked.
- El porcentaje muestra `—` si locked.
- El subtítulo muestra "Completa el Bloque 1 de Comunicación para desbloquear" si locked.
- La barra de progreso y el CTA "Ir a practicar" solo se renderizan si `!s.locked`.
- `(click)="irA(s)"` en lugar de `irA(s.id)`.

### Cambios en `practica.component.css`
- `.prac-ac-wrap--locked`: `opacity: 0.55`, `filter: grayscale(0.3)`, `cursor: not-allowed`.

---

### Cambios en `modos2.component.ts`
- Implementa `OnInit`.
- Inyecta `DesbloqueoService` y `UsuariosService`.
- La card `conv` (¿Conversamos?) arranca con `locked: true`.
- En `ngOnInit`: si admin → desbloquea; si no → espera `todosComunicacionCompletos`.
- El HTML de `modos2` ya manejaba `locked` con `[class.locked]` y el icono 🔒, por lo que no requirió cambios en HTML ni CSS.

---

## Notas para la memoria

- El sistema de desbloqueo refuerza técnicamente el recorrido de aprendizaje descrito en la memoria: el usuario no puede saltar etapas.
- La decisión de calcularlo en el frontend (sin endpoint nuevo) es deliberada: los tres endpoints consultados ya existían y son ligeros. El coste de red de `combineLatest` es mínimo comparado con añadir lógica al backend.
- El bloqueo es informativo, no de seguridad: si un usuario navega directamente a `/practica/gramatica` por URL, llegará igualmente. Para el TFG esto es suficiente; un sistema de producción añadiría un guard de ruta.
- Posible mejora futura: `CanActivate` guard que consulte `DesbloqueoService` y redirija si la ruta no está desbloqueada.


---

---

# Practica → Gramática: sistema de ejercicios

## Descripción general

La sección Practica → Gramática es la parte práctica que complementa los 11 bloques teóricos de Aprende → Comunicación. Cada bloque teórico tiene su bloque de práctica equivalente: una vez que el usuario ha estudiado, por ejemplo, el orden SOV en la teoría, puede reforzarlo con ejercicios interactivos en esta sección.

La pantalla de selección de bloque (`PracticaGramaticaComponent`) lista los 11 bloques en el mismo orden que en la teoría, mostrando el estado de cada uno (bloqueado, activo, completado) y las estrellas obtenidas. Al seleccionar un bloque se navega a `/practica/gramatica/:bloqueId`, donde se ejecutan los ejercicios.

---

## Contenido estático: la misma decisión de diseño que Comunicación

El contenido de los ejercicios —las preguntas, las frases, las fichas y las opciones— está definido como datos estáticos en TypeScript, en el archivo `ejercicios-gramatica.data.ts`. Esta decisión sigue exactamente el mismo patrón que los bloques de Aprende → Comunicación, donde el contenido curricular también es TypeScript estático en lugar de estar en base de datos.

La justificación es la misma que se aplica a los bloques teóricos: el contenido pedagógico de una plataforma de aprendizaje de lengua de signos es estable, validado por una intérprete, y no necesita un CMS. Es el patrón que Duolingo denomina "tips": contenido curricular fijo que solo cambia con actualizaciones deliberadas de la aplicación, no con entradas de usuarios. Mantenerlo en TypeScript simplifica la arquitectura (sin endpoint de contenido, sin modelo MongoDB adicional), facilita la revisión académica del corpus, y permite que el intérprete validador pueda revisar el fichero directamente.

En total el archivo contiene **74 ejercicios** distribuidos en los 11 bloques, con entre 4 y 10 ejercicios por bloque según la riqueza pedagógica de cada tema.

---

## Tipos de ejercicio y criterio de asignación

Existen dos formatos de ejercicio, y la asignación de uno u otro a cada pregunta no es aleatoria: depende de qué habilidad se está evaluando en ese bloque concreto.

### Formato A — Opción múltiple (`tipo: 'opciones'`)

El usuario lee una pregunta y elige entre cuatro respuestas. Tiene dos variantes:

**Variante A1 — Pregunta teórica.** La pregunta evalúa comprensión conceptual del bloque: reglas gramaticales, posición de elementos, diferencias entre construcciones. Ejemplo: *"¿Dónde va el signo NO en LSE?"* o *"¿Qué mecanismo no verbal sirve para marcar el énfasis?"*. Se usa en bloques donde la regla no tiene una representación directa en forma de frase construible con el corpus (ENM, Género, Plural, Intensidad).

**Variante A2 — Frase signada.** El avatar muestra una secuencia de fichas de signos y el usuario identifica su significado en español. Ejemplo: el avatar muestra `TÚ VIVIR DÓNDE` y el usuario elige entre *"¿Dónde vives?"*, *"Tú vives aquí."*, etc. Esta variante aparece en bloques donde existe una frase concreta que practicar (Preguntas, Verbos, Adverbios) y evalúa la comprensión receptiva: reconocer una frase en LSE y entender su significado.

### Formato B — Ordenar fichas (`tipo: 'fichas'`)

El usuario ve una frase en español y debe construir su equivalente en LSE pulsando fichas para ordenarlas en la zona de construcción. El banco incluye las fichas correctas más uno o dos distractores del mismo tipo léxico para añadir dificultad. Ejemplo: para *"No compramos la casa"* el banco incluye `NOSOTROS`, `CASA`, `COMPRAR`, `NO` y el distractor `VIVIR`.

Este formato evalúa la producción estructural: el conocimiento activo de las reglas de orden (SOV, marcador temporal al inicio, NO al final, partícula interrogativa al final). Se usa predominantemente en los bloques SOV, Preguntas, Verbos, Tiempos, Negación y Adverbios —precisamente los bloques cuya regla central es una regla de posición dentro de la frase.

### Por qué a veces aparece uno y a veces otro

Los ejercicios de cada bloque se barajan aleatoriamente al entrar, de modo que el orden de aparición varía en cada sesión. Pero el tipo de ejercicio no es aleatorio: está fijado en los datos para cada pregunta concreta. La distribución responde a una decisión pedagógica: los bloques que enseñan reglas de orden (SOV, Negación, Tiempos…) tienen mayoría de ejercicios de tipo fichas porque esa mecánica obliga al usuario a aplicar la regla activamente. Los bloques que enseñan conceptos no reducibles a un orden (ENM, Intensidad) solo tienen opciones múltiples porque no existe una "frase que construir" que represente el concepto.

La distribución final es: **27 ejercicios de tipo fichas** (36 %) y **47 de tipo opciones** (64 %).

| Bloque | Fichas | Opciones | Total |
|---|---|---|---|
| ENM | 0 | 6 | 6 |
| SOV | 6 | 4 | 10 |
| Preguntas | 3 | 5 | 8 |
| Género | 2 | 4 | 6 |
| Presentaciones | 2 | 4 | 6 |
| Verbos | 3 | 5 | 8 |
| Tiempos | 3 | 3 | 6 |
| Negación | 3 | 3 | 6 |
| Plural | 1 | 3 | 4 |
| Adverbios | 3 | 3 | 6 |
| Intensidad | 0 | 6 | 6 |
| **Total** | **27** | **47** | **74** |

---

## Integración del sistema ENM en los ejercicios

Uno de los diferenciadores pedagógicos de Visual Voices es que la Expresión No Manual (ENM) no es un elemento decorativo sino parte de la gramática LSE. Los ejercicios reflejan esto de dos formas.

**ENM activo en el avatar.** Cuando el ejercicio presenta una secuencia que el avatar signa y esa secuencia requiere ENM (preguntas con o sin partícula), el overlay ENM se abre automáticamente al cargar el ejercicio, mostrando la imagen de referencia y la descripción del patrón facial correspondiente. Esto ocurre en los 3 ejercicios de variante A2 que tienen `enmAbreAvatar` no nulo.

**ENM como parte de la respuesta.** En los 24 ejercicios marcados con `conEnm: true`, el formulario de respuesta incluye un selector de ENM con cinco opciones: *Ninguna*, *Pregunta sin partícula*, *Pregunta con partícula*, *Negación* y *Afirmación*. El usuario debe seleccionar el ENM correcto además de ordenar las fichas o elegir la opción correcta. La validación es independiente: si el orden de fichas es correcto pero el ENM es incorrecto, el sistema lo indica específicamente (*"Orden correcto, pero la expresión no manual no era la indicada"*), de modo que el usuario comprende que ambas dimensiones —manual y no manual— son necesarias para una comunicación correcta en LSE.

Al seleccionar cualquier opción de ENM distinta de *Ninguna*, el overlay ENM se abre mostrando la referencia visual del patrón facial, lo que permite al usuario consultarla mientras decide.

---

## Motor procedural: aleatoriedad controlada

Aunque el contenido es estático, el componente introduce aleatoriedad en tres puntos para que cada sesión sea diferente:

**Orden de ejercicios.** Al entrar en un bloque, el array de ejercicios se baraja con `Array.sort(() => Math.random() - 0.5)`. El usuario nunca ve los ejercicios en el mismo orden en dos sesiones distintas.

**Orden de opciones.** En los ejercicios de tipo opciones, la opción correcta siempre ocupa el índice 0 en los datos (convención de diseño que simplifica la validación), pero antes de renderizarse se barajan. El usuario nunca ve la respuesta correcta en la misma posición.

**Banco de fichas.** En los ejercicios de tipo fichas, las fichas del banco (correctas más distractores) también se barajan al preparar cada ejercicio.

Esta aleatoriedad controlada —contenido fijo, presentación variable— es coherente con la decisión de mantener el contenido estático: no es necesario un generador procedural de frases porque la variabilidad necesaria para la práctica repetida se consigue con el orden aleatorio de un corpus curado y validado.

---

## Progresión y sistema de estrellas

Cada bloque tiene un número fijo de ejercicios (entre 4 y 10). Al completar todos los ejercicios de un bloque, el componente calcula el porcentaje de aciertos y asigna estrellas:

- **3 estrellas**: 100 % de aciertos
- **2 estrellas**: 70 % o más
- **1 estrella**: 40 % o más
- **0 estrellas**: menos del 40 %

Si el usuario supera el **60 % de aciertos**, el bloque se marca como completado en la colección `ProgresoComun` de MongoDB mediante el endpoint `POST /api/progreso-comunicacion/completar`. Este umbral del 60 % es el mismo que se usa para completar los bloques teóricos desde la sección Aprende → Comunicación, lo que unifica el criterio de progresión en toda la plataforma.

El desbloqueo en cadena de los bloques de práctica sigue la misma lógica que en la teoría: el Bloque 2 de práctica (SOV) solo está disponible si el Bloque 1 de teoría (ENM) está completado, que a su vez requiere haber terminado el vocabulario. La pantalla de selección de bloque de `PracticaGramaticaComponent` consulta el progreso de comunicación al arrancar y aplica el mismo algoritmo de desbloqueo que la teoría.

---

## Arquitectura del componente

El componente de ejercicio (`PracticaGramaticaEjercicioComponent`) implementa un ciclo de estado explícito con cuatro fases: **preparación** (barajar ejercicios y opciones, resetear estado), **interacción** (el usuario selecciona fichas, elige opción, selecciona ENM), **confirmación** (validación y cálculo de feedback) y **transición** (avanzar al siguiente ejercicio o mostrar la pantalla final).

Todo el estado mutable —`zonaFichas`, `opcionSeleccionada`, `enmSeleccionado`, `confirmado`, `puedeConfirmarActual`— se gestiona como propiedades concretas de la clase, no como getters derivados, y se recalcula explícitamente tras cada acción del usuario mediante el método `recalcular()`. Esto garantiza que Angular detecte los cambios y re-renderice la vista de forma predecible.

El panel izquierdo aloja el avatar con `[standalone]="true"` para que no se vea afectado por el servicio global de animaciones que limpia el canvas al cambiar de ruta. El panel derecho contiene toda la interacción: las preguntas, las fichas, las opciones, el selector ENM y los botones de acción. La proporción es 58/42, idéntica a la de Practica → Vocabulario, garantizando coherencia visual entre las secciones de práctica de la aplicación.

Entendido. Te genero el bloque para añadir al final:

---

# ENM Overlay: controles de reproducción de vídeo

## Motivación

El pack `pregunta-con-particula` pasó de usar una imagen estática a un vídeo `.mp4` real (`enm/pcp.mp4`). Con el vídeo en autoplay y loop, el usuario no tenía ningún control sobre la reproducción, lo que resulta problemático si quiere pausar para observar un gesto con calma o volver al inicio para comparar.

## Cambios implementados

### `enm-packs.data.ts`
Se añadió el campo `video: 'enm/pcp.mp4'` al pack `pregunta-con-particula`. El campo `video` ya tenía prioridad sobre `imagen` por diseño previo del sistema, así que no requirió ningún cambio de arquitectura.

### `enm-overlay.component.ts`
- Se añaden `ViewChild`, `ElementRef` y `NgZone` a los imports.
- Nuevas propiedades: `videoRef` (referencia al elemento `<video>`), `videoPausado` (booleano que controla el icono play/pausa) y `videoProgreso` (número 0–100 que alimenta la barra).
- Se inyecta `NgZone` para ejecutar el bucle de `requestAnimationFrame` fuera de la zona de Angular y solo entrar en zona para actualizar `videoProgreso`, evitando detecciones de cambio innecesarias en cada frame.
- Métodos nuevos: `onVideoListo()` (arranca el RAF al evento `canplay`), `togglePlay()`, `reiniciar()` (vuelve a `currentTime = 0` y retoma la reproducción), `onBarraClick()` (calcula el ratio de clic sobre la barra y salta al instante correspondiente).
- `pararRaf()` se llama tanto en `ngOnDestroy` como al cambiar de pack, evitando fugas de memoria.

### `enm-overlay.component.html`
- Se añade `#enmVideo` y el evento `(canplay)="onVideoListo()"` al elemento `<video>`.
- Se añade el bloque `.enm-controls` bajo `.enm-media`, visible únicamente cuando `pack.video` existe. Contiene el botón reiniciar, el botón play/pausa (con icono condicional según `videoPausado`) y la barra de progreso clicable.

### `enm-overlay.component.css`
- `.enm-controls`: franja de 6px de gap con fondo `#111` y borde superior sutil, igual que la cabecera.
- `.enm-ctrl-play`: color naranja `#E04A1A`, coherente con la identidad de marca.
- `.enm-progress`: barra de 4px de alto que se engrosa a 6px en hover para indicar interactividad. El relleno usa transición de 0.1s para suavizar el avance frame a frame.

## Notas

- Los controles solo se renderizan cuando el pack tiene vídeo (`*ngIf="pack.video"`), así que los packs con imagen estática no se ven afectados.
- El vídeo sigue siendo `muted` y `loop`; los controles añaden agencia al usuario sin cambiar el comportamiento base.
- El asset `pcp.mp4` debe copiarse manualmente a `frontend/public/enm/pcp.mp4` antes del despliegue.