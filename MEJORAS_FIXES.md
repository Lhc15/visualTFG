# Mejoras y correcciones — rama `feat/fixes`

Este documento recoge las mejoras implementadas durante la revisión del código a raíz de la redacción de la memoria. Cada sección describe el problema detectado, la decisión adoptada y los cambios realizados. Están pensadas para integrarse en los apartados correspondientes de la memoria final.

---

## 1. Corrección de tipos léxicos: adverbios temporales

### Problema detectado
Los signos AYER, ANTES y MAÑANA estaban clasificados en el corpus con `tiposLexicos: ['ENM']`, siendo que su función gramatical en LSE es de **marcador temporal adverbial**, no de expresión no manual. Esta clasificación errónea afectaba tanto al motor de práctica (que los habría tratado como ENM al generar frases) como a la visualización en las plantillas de gramática del componente `Comunicacion` (los tokens se coloreaban con el color reservado para ENM).

### Decisión adoptada
Se introduce el tipo léxico `ADV` (Adverbio) como valor adicional en el enum `tiposLexicos`, tanto en el modelo Mongoose (`models/palabras.js`) como en el seed (`seed.js`) y en el panel de administración. Los tres adverbios temporales pasan a `tiposLexicos: ['ADV']`. El tipo `ADV` se añade también al tipo unión `RolToken` del componente `Comunicacion`.

### Cambios realizados
- `backend/models/palabras.js`: `enum` de `tiposLexicos` incluye `'ADV'`.
- `backend/seed.js`: AYER, ANTES y MAÑANA pasan a `tiposLexicos: ['ADV']`. El schema del seed también incluye `'ADV'` en el enum.
- `frontend/.../admin_palabras.component.ts`: `TIPOS_LEXICOS` y `TIPOS_LABELS` incluyen `ADV / Adverbio`.
- `frontend/.../comunicacion.component.ts`: `RolToken` incluye `'ADV'`; los tokens ANTES, AYER (×2) y REGULAR pasan de `rol: 'ENM'` a `rol: 'ADV'`.
- `frontend/.../comunicacion.component.css`: nuevo estilo `rol-ADV` (ámbar, `#F59E0B`) y punto de leyenda `.adv`.
- `frontend/.../comunicacion.component.html`: entrada «Adverbio» añadida a la leyenda del schema.

---

## 2. Campo de descripción manual con tooltip en el panel del avatar

### Problema detectado
El campo `explicacion` del modelo `Palabra` existía en el backend pero no tenía ningún uso en el frontend del alumno — la información lingüística del signo no llegaba nunca al usuario durante la reproducción de la animación.

### Decisión adoptada
Se introduce un sistema de **descripción manual por signo**: el administrador puede redactar un texto descriptivo para cada signo y activarlo mediante un checkbox (`usarDescripcion`). Cuando el alumno pulsa el botón de reproducción (play) en cualquiera de las vistas con avatar (`Aprende / Vocabulario`, `Abecedario`), si el signo tiene la descripción activada, aparece un **tooltip emergente** en la esquina inferior izquierda del panel del avatar.

El comportamiento del tooltip sigue estas reglas:
- Aparece **siempre que se pulse play**, siempre que el signo tenga `usarDescripcion: true` y texto en `descripcion`.
- Si ya está visible y se vuelve a pulsar play, **no se recarga** (el servicio emite el mismo valor).
- Si se cierra manualmente y se vuelve a pulsar play, **reaparece**.
- Al **cambiar de signo** (seleccionar otra palabra en la lista), el tooltip se cierra automáticamente, hasta que se pulse play en el nuevo signo.
- El tooltip **no depende de que haya animación Blender enlazada** — funciona aunque el signo no tenga `gltf`/`clipName` asignados todavía, ya que el `show()` se ejecuta antes de `reproducirAnimacion()`.

Se mantiene el campo `explicacion` en el modelo para no romper los datos existentes en MongoDB. En el panel de administración, si un signo tiene `explicacion` pero no `descripcion`, el campo se pre-rellena con el valor de `explicacion` como punto de partida al abrir el modal de edición. La primera vez que se guarde, el texto migrará automáticamente al campo `descripcion`.

### Arquitectura

El sistema replica el patrón del `EnmService` ya existente:

**1. Servicio (`DescripcionService`)**
`Injectable({ providedIn: 'root' })` con un `BehaviorSubject<DescripcionPayload | null>`. API pública:
```typescript
show(texto: string): void   // activa el tooltip con el texto indicado
hide(): void                // oculta el tooltip
desc$: Observable<...>      // observable para el componente
```

**2. Componente (`DescripcionTooltipComponent`)**
Componente standalone con template y estilos inline. Se suscribe al `DescripcionService` y renderiza el tooltip cuando hay payload activo. Incluye botón de cierre que llama a `hide()`. Diseño neutro: fondo oscuro semitransparente con `backdrop-filter: blur`, bordes redondeados, sin referencias visuales de marca. Montado directamente en el `vv-avatar-panel` de cada vista (hijo directo, no dentro del `vv-canvas-wrap`) con `z-index: 50`, garantizando que quede por encima del canvas, los subtítulos y cualquier otro elemento del panel.

**3. Integración en los componentes**

| Componente | `show()` | `hide()` |
|---|---|---|
| `AprenderComponent` | `onPlayClicked()`, antes de `reproducirAnimacion()` | `seleccionarPalabra()` |
| `ComunicacionComponent` | — (aplica ENM overlay, no descripción) | `abrirBloque()` |
| `AbecedarioComponent` | — (letras no tienen descripción) | `seleccionarLetra()` |

### Cambios en el panel de administración
- Se elimina el campo **Nivel** del modal de edición de palabras (no tenía uso funcional en el TFG).
- El campo **Explicación** pasa a llamarse **Descripción manual** e incluye un checkbox «Mostrar al reproducir» (`usarDescripcion`) alineado con la etiqueta.
- Se añade `ADV` a los tipos léxicos disponibles en el modal.
- Se corrige un bug por el que al guardar una edición la **categoría se perdía visualmente**: el controlador `editarPalabra` del backend ahora incluye `.populate('categoria', 'nombre')` en la respuesta, y el select del formulario usa `[compareWith]` para comparar IDs como strings y no perder la selección por diferencia de referencia entre el objeto populado y el `_id` en bruto.

### Cambios realizados
- `backend/models/palabras.js`: campos `descripcion` (String) y `usarDescripcion` (Boolean, default `false`); `ADV` en el enum de `tiposLexicos`.
- `backend/controllers/palabras.js`: `.populate('categoria', 'nombre')` en `editarPalabra`; campos `descripcion` y `usarDescripcion` incluidos en el objeto `update`.
- `backend/seed.js`: campos `descripcion` y `usarDescripcion` en el schema; `ADV` en el enum.
- `frontend/src/app/services/descripcion.service.ts`: nuevo servicio.
- `frontend/src/app/descripcion-tooltip/descripcion-tooltip.component.ts`: nuevo componente.
- `frontend/.../admin_palabras.component.ts`: modal actualizado (descripción + checkbox, sin nivel, `compareCat`, `ADV`).
- `frontend/.../aprende.component.ts/html`: importa tooltip, inyecta servicio, lógica de show/hide.
- `frontend/.../comunicacion.component.ts/html`: importa tooltip, inyecta servicio, `hide()` en `abrirBloque()`.
- `frontend/.../abecedario.component.ts/html`: importa tooltip, inyecta servicio, `hide()` en `seleccionarLetra()`.

---

## 3. Sistema de progreso real en Vocabulario y Abecedario

### Problema detectado
El progreso del usuario en las vistas de Aprende (Vocabulario y Abecedario) era puramente visual y local: no se persistía en base de datos, se perdía al recargar la página, y el componente `PracticaVocabulario` tenía `palabrasEstudiadas = 0` hardcodeado con un comentario indicando que la conexión al sistema real estaba pendiente. El mapa de práctica de vocabulario nunca desbloqueaba ninguna categoría.

### Decisión adoptada
Se implementa un sistema completo de persistencia de progreso mediante una nueva colección MongoDB `progreso_vocabulario`. Cada vez que el usuario pulsa play sobre un signo, se registra en base de datos (operación idempotente con `upsert`). Al cargar cualquiera de las vistas afectadas, se recupera el progreso real y se usa para calcular el estado de cada categoría.

### Arquitectura

**Modelo `ProgresoVocabulario`** (`backend/models/progresoVocabulario.js`)
Esquema: `userId` (ref Usuario), `palabraId` (ref Palabra), `modulo` (enum `vocabulario` | `abecedario`), `fechaVista`. Índice único `{ userId, palabraId }` para garantizar idempotencia.

**Endpoints** (`/api/progreso-vocabulario`)
- `GET /?modulo=vocabulario` — devuelve array de `palabraId` strings vistas por el usuario autenticado.
- `POST /marcar` — registra una palabra como vista. Si ya existe, no falla (`upsert: true` con `$setOnInsert`).

**Endpoint adicional** (`/api/palabras/por-modulo?modulo=abecedario`)
Añadido en `palabras.controller.js` y registrado en `palabras.routes.js` **antes** de la ruta `/:id` para evitar que Express capture `por-modulo` como un ID. Devuelve todas las palabras cuya categoría tenga el módulo indicado, con `_id` incluido. Necesario para que el componente `Abecedario` pueda obtener los `_id` reales de las letras (que hasta ahora se construían como constante local sin `_id`).

**Servicio Angular** (`ProgresoVocabularioService`)
Dos métodos: `obtenerProgreso(modulo?)` y `marcarVista(palabraId, modulo)`. Patrón idéntico al resto de servicios del proyecto.

### Integración en los componentes

**`AprenderComponent`**
- Al iniciar (tras obtener `userId`): carga `palabrasVistas` como `Set<string>` con los IDs del backend.
- En `onPlayClicked()`: si la palabra no está ya en `palabrasVistas`, la añade localmente y llama a `marcarVista()`.
- En el template: clase `vv-word-vista` (verde) y símbolo ✓ para palabras ya reproducidas.

**`AbecedarioComponent`**
- La constante `LETRAS` pasa a `LETRAS_FALLBACK`; al iniciar, las letras se cargan desde `/api/palabras/por-modulo?modulo=abecedario` para obtener sus `_id` reales.
- En `onPlayClicked()`: mismo patrón que Aprende, usando `modulo: 'abecedario'`.
- En el template: clase `vv-letter-played` (verde) y badge ✓ en la celda de letra.

**`PracticaVocabularioComponent`**
- `cargarCategorias()` reescrito: carga en paralelo el progreso del usuario y las categorías, luego calcula `palabrasEstudiadas` contando cuántos `_id` de cada categoría están en el set de vistas.
- El cálculo de `estado` (`completado` / `activo` / `bloqueado`) usa ahora datos reales, desbloqueando el mapa de práctica de manera funcional.

### Cambios realizados
- `backend/models/progresoVocabulario.js`: nuevo modelo.
- `backend/controllers/progresoVocabulario.js`: nuevo controlador.
- `backend/routes/progresoVocabulario.js`: nuevas rutas.
- `backend/index.js`: registro de `/api/progreso-vocabulario`.
- `backend/controllers/palabras.js`: función `obtenerPalabrasPorModulo` y export.
- `backend/routes/palabras.js`: ruta `/por-modulo` registrada antes de `/:id`.
- `frontend/src/app/services/progreso-vocabulario.service.ts`: nuevo servicio.
- `frontend/.../aprende.component.ts/html/css`: progreso real, ✓ verde en palabras vistas.
- `frontend/.../abecedario.component.ts/html/css`: letras con `_id` desde backend, ✓ en celdas reproducidas.
- `frontend/.../practica-vocabulario.component.ts`: `cargarCategorias()` con datos reales.

---

## 4. Completado de categoría con confeti y desbloqueo de práctica

### Problema detectado
El banner «Practica este tema» en la vista de vocabulario de Aprende aparecía siempre visible para todas las categorías, independientemente de si el usuario había reproducido o no todas las palabras. No había ningún indicador de progreso en las tarjetas de categoría ni ningún feedback al completar una.

### Decisión adoptada
El banner de práctica se oculta hasta que el usuario haya reproducido todas las palabras de la categoría. La primera vez que se completa una categoría se dispara una animación de **confeti side-cannons** (cañones desde ambos laterales de la pantalla, tres ráfagas escalonadas) y aparece en el panel derecho una **pill naranja** con el texto «¡Categoría completada!». Las categorías completadas se persisten en `localStorage` por `userId` para que el confeti no se repita en visitas posteriores y el banner permanezca visible.

Se optó por confeti en lugar de un modal para no interrumpir el flujo del usuario — la celebración es visible sin bloquear la interfaz ni requerir ninguna acción de cierre.

### Comportamiento
- Cada vez que se marca una palabra como vista, se comprueba si todas las palabras de la categoría activa están en `palabrasVistas`.
- Si se acaba de completar y no estaba ya en `categoriasCompletadas`: se añade al set, se persiste en `localStorage` (`vv_cats_completadas_{uid}`), y se llama a `lanzarConfeti()`.
- Si ya estaba completada (visita posterior), el banner y la pill aparecen directamente sin confeti.
- Las tarjetas de categoría en la pantalla de listado muestran borde verde + badge ✓ para las completadas, y la barra de progreso se rellena en tiempo real según el porcentaje de palabras vistas.

### Confeti (canvas-confetti)
La librería `canvas-confetti@1.9.3` se carga desde jsDelivr en `src/index.html`. Se declara como global con `declare const confetti: any` en el componente. El método `lanzarConfeti()` dispara tres ráfagas escalonadas (0 ms / 400 ms / 900 ms), dos cañones por ráfaga (ángulo 60°/120°, origen en los bordes de pantalla), con `ticks: 350` para prolongar la caída. Colores: `#E04A1A`, `#F4A940`, `#1C0E0A`, `#F9F6F3`, `#F0997B`.

### Pill «¡Categoría completada!»
Elemento `.vv-cat-completada-pill` centrado encima del divider de práctica. Fondo naranja `#E04A1A`, texto Fraunces blanco, tick SVG a la izquierda. Animación de entrada `pillDrop`: cae desde arriba con bounce (`cubic-bezier(.34,1.56,.64,1)`).

### Cambios realizados
- `frontend/src/index.html`: script de canvas-confetti desde jsDelivr.
- `frontend/.../aprende.component.ts`:
  - `declare const confetti: any` al inicio del fichero.
  - Estado: `categoriasCompletadas: Set<string>` (sin `mostrarCelebracion`).
  - Carga de `categoriasCompletadas` desde localStorage al recibir `userId`.
  - Getter `categoriaActualCompletada`: `true` cuando todas las palabras de la categoría seleccionada están en `palabrasVistas`.
  - Método `comprobarCompletadoCategoria()`: gestiona el set, localStorage y llama a `lanzarConfeti()`.
  - Método `lanzarConfeti()`: tres ráfagas escalonadas de side-cannons.
  - Método `getProgresoCat(cat)`: porcentaje de palabras vistas para la barra de progreso de cada tarjeta.
  - `onPlayClicked()`: el `subscribe` de `marcarVista` llama a `comprobarCompletadoCategoria()` en su `next`.
- `frontend/.../aprende.component.html`:
  - Pill `.vv-cat-completada-pill` con tick SVG encima del divider.
  - Divider y banner de práctica con `*ngIf="categoriaActualCompletada || categoriasCompletadas.has(selectedCategory._id)"`.
  - Tarjetas de categoría: clase `vv-cat-completada`, badge ✓, barra de progreso dinámica.
- `frontend/.../aprende.component.css`:
  - `.vv-cat-completada-pill` + `@keyframes pillDrop`.
  - `.vv-cat-completada`: borde verde, fondo `#f0fdf4`.
  - `.vv-cat-done-badge`: badge ✓ verde inline en el título.
  - Barra de progreso con `transition: width .4s ease`.

---

## 5. Rediseño del mapa de práctica de vocabulario y desbloqueo coordinado

### Problema detectado
El componente `PracticaVocabulario` mostraba las categorías como un mapa zigzag secuencial (estilo Duolingo) que no aprovechaba el espacio de pantalla y cuyo sistema de desbloqueo era independiente del progreso real del usuario en Aprende: `palabrasEstudiadas` estaba hardcodeado a `0` y la condición de desbloqueo nunca se cumplía.

### Decisión adoptada
Se sustituye el mapa zigzag por una **rejilla responsive de nodos** con dos grupos separados (desbloqueadas / bloqueadas), y se conecta el desbloqueo al mismo mecanismo que usa Aprende: el set `categoriasCompletadas` persistido en `localStorage`.

### Layout de nodos
La rejilla usa `grid-template-columns: repeat(4, 1fr)` — máximo 4 nodos por fila — con celdas que se estiran para ocupar todo el alto disponible (`flex: 1` en el grid de desbloqueadas). El tamaño del nodo escala con la pantalla mediante `clamp(56px, 7vw, 100px)`, igual que el icono interior (`clamp(1.4rem, 3vw, 2.4rem)`) y las estrellas. Así la pantalla se aprovecha íntegramente sin scroll en pantallas estándar.

Los dos grupos se separan con un divisor de línea fina con icono de candado y el texto «Pendiente de desbloquear», sin etiquetas adicionales que saturen la interfaz.

### Sistema de desbloqueo coordinado
Al inicializar, `PracticaVocabulario` obtiene el `userId` y lee `localStorage.getItem('vv_cats_completadas_{uid}')`, la misma clave que escribe `AprenderComponent` cuando el usuario completa una categoría. Con ese set, `calcularEstado()` determina:

- Una categoría está **completada** si su `_id` aparece en `categoriasCompletadas`.
- La primera categoría es siempre **activa** (nunca bloqueada).
- Las siguientes son **activas** si la anterior está completada, **bloqueadas** en caso contrario.

Esto garantiza coherencia sin ninguna petición extra al backend: el estado de Práctica refleja exactamente lo que el usuario ha completado en Aprende, en tiempo real tras cualquier navegación.

### Cambios realizados
- `frontend/.../practica-vocabulario.component.ts`: `UsuariosService` inyectado; carga de `categoriasCompletadas` desde localStorage en `ngOnInit`; `calcularEstado()` reescrito con lógica basada en el set; getters `categoriasDesbloqueadas` y `categoriasBloqueadas`; eliminado el array `shifts` del zigzag.
- `frontend/.../practica-vocabulario.component.html`: mapa zigzag reemplazado por dos `vv-node-grid` con separador `vv-lock-divider`.
- `frontend/.../practica-vocabulario.component.css`: eliminados todos los estilos del zigzag (node-row, connector, shift, active-arrow); añadidos estilos del grid con nodos escalables mediante `clamp`.

---

## 6. Buscador en la vista de vocabulario de Aprende

### Problema detectado
La sección de vocabulario de Aprende carecía de cualquier mecanismo de filtrado. Con diez categorías temáticas y hasta cinco signos por categoría, el usuario tenía que recorrer visualmente toda la lista para encontrar un signo concreto o recordar en qué categoría estaba. El footer del panel derecho ocupaba espacio sin aportar información relevante para el aprendizaje.

### Decisión adoptada
Se añade un buscador tipo opción A (campo de texto con línea inferior, sin borde completo) justo encima del título en las dos pantallas del panel de vocabulario. El buscador de la pantalla de categorías filtra tanto por nombre de categoría como por palabras contenidas en ella, de forma que buscar «hola» muestra la categoría «Saludos y despedidas» aunque el usuario no recuerde el nombre de la categoría. El buscador dentro de una categoría filtra únicamente los signos de esa lista. El `searchText` se resetea al entrar en una categoría y al volver a la lista, para no arrastrar la búsqueda entre pantallas.

El footer del panel derecho se elimina en Aprende y Abecedario — la información que contenía (nivel A1, fuente, recuento de categorías y signos) no era relevante para el flujo de aprendizaje y ocupaba espacio permanente en un panel que ya tiene contenido propio.

### Cambios realizados
- `frontend/.../aprende.component.ts`: getter `filteredCategorias` que filtra por `c.nombre` y por `c.palabras[].palabra`; `searchText` reseteado en `onCategoryClick()` y `volverAListaCategorias()`.
- `frontend/.../aprende.component.html`: `vv-search-bar` añadido antes del título en pantalla de categorías (usa `filteredCategorias`) y en pantalla de palabras (usa `filteredWordsInSelectedCategory` ya existente); bloque `vv-footer` eliminado.
- `frontend/.../aprende.component.css`: estilos `.vv-search-bar` (lupa SVG + input sin borde, con `border-bottom`); clases `.vv-footer*` eliminadas.
- `frontend/.../abecedario.component.html`: bloque `vv-footer` eliminado.
- `frontend/.../abecedario.component.css`: clases `.vv-footer*` eliminadas.

---

## 7. Header global y sistema de navegación unificado

### Problema detectado
Cada componente de la aplicación tenía su propio topnav independiente con estilos, tamaños y comportamientos distintos. La transición entre pantallas era visualmente inconsistente — el header de `modos2` era más grande que el del resto. No existía un elemento de identidad de marca común entre secciones.

### Decisión adoptada
Se crea un componente `HeaderComponent` standalone compartido por todas las páginas. El topnav propio de cada componente se elimina. La navegación contextual (breadcrumb + botón volver) se traslada al **panel derecho** de cada página, como primera elemento visible antes del contenido, lo que resulta más natural ya que toda la acción ocurre en ese panel.

### Logo multicolor
El logotipo «VisualVoices» usa los cuatro colores de las secciones de la aplicación, distribuidos en letras fijas (no dinámicas):
- «Visual» → negro `#1C0E0A`
- «V» → azul `#4F9CF9` (Abecedario)
- «oi» → amarillo `#F4A940` (Aprende)
- «c» → verde `#1B7A0A` (Practica)
- «es» → lila `#8B00A8` (Conversamos)

### Breadcrumb en panel derecho
Cada página muestra solo los pasos necesarios para contextualizar la navegación del usuario. El primer elemento es siempre un botón **← Volver** en naranja `#E04A1A` (con flecha via CSS `::before`), seguido de los segmentos de ruta en gris hasta el nivel actual en negro. Ejemplos:

| Página | Breadcrumb |
|---|---|
| Aprende selector | `← Volver › Aprende` |
| Vocabulario categorías | `← Volver › Aprende › Vocabulario` |
| Vocabulario palabras | `← Volver › Vocabulario › [categoría]` |
| Comunicación bloque | `← Volver › Comunicación › [bloque]` |
| Practica Vocabulario | `← Volver › Practica › Vocabulario` |
| Practica Abecedario Modo A | `← Volver › Abecedario › Modo A` |

### Cambios realizados
- `frontend/src/app/header/header.component.ts/html/css`: nuevo componente standalone con logo multicolor, nav y avatar.
- `frontend/.../modos2.component.ts/html/css`: topnav propio eliminado, `app-header` integrado, logo actualizado.
- Topnav propio eliminado y `app-header` + `vv-panel-nav` añadidos en: `aprende`, `abecedario`, `comunicacion`, `practica`, `practica-vocabulario`, `practica-abecedario`, `practica-gramatica`, `practica-abecedario-modo-a`, `practica-abecedario-modo-b`, `conversamos`.
- CSS unificado `.vv-panel-nav` / `.vv-pnav-volver` / `.vv-pnav-sep` / `.vv-pnav-dim` / `.vv-pnav-cur` replicado en todos los componentes afectados.

---

## 8. Ajustes menores de interfaz

### Cambios realizados
- **Chatbot eliminado**: el widget de Dialogflow (MANOlo) y su script se eliminan de `src/index.html`, que queda con un único `<body>` limpio.
- **Barras de progreso en modos2 a 0**: las barras de progreso de las cuatro tarjetas de la pantalla de inicio se fijan a `progress: 0` — la funcionalidad de progreso global no se implementa en el TFG pero el elemento visual se mantiene.
- **Conversamos — texto de tarjeta**: el sublabel «Diálogo libre · Nivel A1» se reemplaza por «Conversaciones simuladas», más descriptivo y sin referencias a niveles no implementados.
- **Conversamos — desbloqueo**: todas las situaciones pasan a `estado: 'disponible'`; el guard que bloqueaba el acceso se elimina.
- **Footer del panel derecho**: eliminado en todos los componentes donde aparecía (`aprende`, `abecedario`, `practica-vocabulario-ejercicio`). La información que contenía (nivel A1, fuente, recuentos) no es relevante para el flujo de uso.

---

## 9. Sistema de ejercicios adaptativo de vocabulario

### Problema detectado
El componente `PracticaVocabularioEjercicioComponent` existía pero no era navegable (el botón «Practicar» no lo alcanzaba), filtraba palabras por `p.gltf` (dejando la lista vacía al no haber animaciones aún), y el número de preguntas estaba hardcodeado a 10 sin ninguna lógica de priorización.

### Decisión adoptada
Se implementa un **motor de ejercicios adaptativo** basado en historial persistido. El sistema mantiene un registro por `(usuario, palabra)` con `vecesAcertada` y `vecesFallada`, y construye la cola de preguntas de cada sesión ordenando las palabras por prioridad decreciente: las que nunca han aparecido en un ejercicio van primero, seguidas de las más falladas, y al final las más acertadas. Palabras con la misma prioridad se ordenan aleatoriamente.

### Arquitectura

**Modelo `ProgresoEjercicio`** (`backend/models/progresoEjercicio.js`)
Esquema: `userId`, `palabraId`, `categoriaId`, `vecesAcertada` (default 0), `vecesFallada` (default 0), `fechaUltimo`. Índice único `{ userId, palabraId }`.

**Endpoints** (`/api/progreso-ejercicio`)
- `GET /?categoriaId=xxx` — devuelve los registros de historial del usuario para esa categoría.
- `POST /registrar` — actualiza `vecesAcertada` o `vecesFallada` con `$inc` + upsert. Llamada al confirmar cada respuesta.

**Motor de priorización** (función `prioridadPalabra`)
```
score = vecesAcertada - vecesFallada × 2
```
- Nunca vista en ejercicios → score = −1000 (máxima prioridad)
- Más fallos → score más negativo → aparece antes
- Más aciertos → score positivo → aparece al final

**Gestión de la sesión**
- `totalPreguntas` se inicializa a `palabras.length`.
- Al fallar una palabra: se reencola al final si no ha aparecido ya 2 veces en la sesión y si `fallosExtra < 3`. Cada reencola incrementa `totalPreguntas` en 1.
- La barra de progreso usa `preguntaNum / totalPreguntas`.
- Al agotar la cola, el ejercicio finaliza y vuelve automáticamente a Vocabulario.

**Modo A vs Modo B**
- Con menos de 4 palabras: solo modo A (identificar la palabra del signo mostrado).
- Con 4 o más: aleatorio 50/50 por pregunta.
- Si la palabra no tiene animación Blender asignada todavía: se muestra un placeholder «Animación pendiente» en el canvas; el ejercicio funciona igualmente.

### Cambios realizados
- `backend/models/progresoEjercicio.js`: nuevo modelo.
- `backend/controllers/progresoEjercicio.js`: nuevo controlador con `obtenerProgreso` y `registrarResultado`.
- `backend/routes/progresoEjercicio.js`: nuevas rutas registradas en `index.js` como `/api/progreso-ejercicio`.
- `frontend/src/app/services/progreso-ejercicio.service.ts`: nuevo servicio Angular.
- `frontend/.../practica-vocabulario-ejercicio.component.ts`: filtro `p.gltf` eliminado; motor de priorización (`construirCola`, `prioridadPalabra`, `siguienteDeCola`, `reencolar`); `ProgresoEjercicioService` inyectado; llamada a `registrar()` en `elegirOpcionA` y `elegirCeldaB`; `siguiente()` termina la sesión al agotar la cola.
- `frontend/.../practica-vocabulario-ejercicio.component.html`: `app-header` + breadcrumb; footer eliminado; placeholder de animación pendiente; barra de progreso dinámica.

---

## 10. Sistema de estrellas basado en rendimiento real en ejercicios

### Problema detectado
Las estrellas mostradas en los nodos de `PracticaVocabulario` se calculaban a partir del porcentaje de palabras reproducidas en Aprende (`palabrasEstudiadas / total`), lo que no tenía ninguna relación con el dominio real del usuario sobre esa categoría. Una categoría podía mostrar 3 estrellas simplemente por haber reproducido todas sus palabras una vez, sin haber hecho ningún ejercicio.

### Decisión adoptada
Las estrellas pasan a calcularse a partir del historial de ejercicios de la categoría: se suma `vecesAcertada` y `vecesFallada` de todos los registros de `progreso_ejercicio` de esa categoría para el usuario, y se calcula el porcentaje de aciertos sobre el total de respuestas dadas.

**Escala:**
- 0 estrellas — sin historial de ejercicios, o menos del 40% de aciertos
- 1 estrella — entre el 40% y el 59% de aciertos
- 2 estrellas — entre el 60% y el 79% de aciertos
- 3 estrellas — 80% o más de aciertos

Mientras el usuario no haya hecho ningún ejercicio de una categoría, las estrellas permanecen en 0, lo que es semánticamente correcto: las estrellas representan dominio demostrado, no exposición.

Este valor de estrellas también se usará en el sistema de ejercicios globales para ponderar la frecuencia de aparición de palabras de cada categoría — las categorías con menos estrellas (peor rendimiento) contribuyen más palabras a la cola.

### Cambios realizados
- `frontend/.../practica-vocabulario.component.ts`:
  - `ProgresoEjercicioService` inyectado.
  - `cargarCategorias()` ampliado: además de palabras y progreso de vocabulario, carga en paralelo los registros de ejercicio de cada categoría con `progresoEjercicioService.obtenerProgreso(cat._id)`.
  - `calcularEstrellas()` reescrito: recibe `RegistroEjercicio[]` en lugar de `(estudiadas, total, estado)`; calcula `aciertos / (aciertos + fallos)` y mapea a 0–3 estrellas según los umbrales definidos.

---

## 11. Modo Global de práctica de vocabulario

### Motivación
Las categorías de vocabulario se practican de forma individual, lo que obliga al usuario a entrar y salir de cada una por separado y no permite trabajar la capacidad de discriminar signos entre categorías distintas — una habilidad importante para el uso real de la LSE en conversación. El Modo Global resuelve esto permitiendo sesiones de ejercicio que combinan palabras de varias categorías en una sola cola adaptativa.

### Posición e identidad visual
El nodo de Modo Global ocupa siempre la primera posición del grid de nodos, antes de las categorías individuales, y está siempre desbloqueado independientemente del progreso del usuario. Se diferencia visualmente de los nodos de categoría mediante un icono SVG de globo terráqueo sobre fondo negro `#1C0E0A`, en contraste con el naranja de los nodos de categoría. Las estrellas debajo del nodo global no tienen función de rendimiento — se muestran vacías para mantener la coherencia visual del grid.

### Panel de configuración
Al seleccionar el nodo Global, el panel derecho muestra una pantalla de configuración antes de comenzar el ejercicio, estructurada en tres partes:

**1. Texto introductorio**
Antes de cualquier control, se muestra una etiqueta «Modo Global» en naranja, un título en Fraunces («Practica sin límites de categoría») y una descripción breve que explica el mecanismo de ponderación: *«Las categorías con peor rendimiento aparecen más en los ejercicios para reforzar lo que más cuesta»*. Esto es pedagógicamente relevante — el usuario debe entender por qué el sistema puede mostrarle más veces ciertas palabras.

**2. Secciones acordeón colapsadas**
Las dos opciones de configuración se presentan en acordeones colapsados por defecto, mostrando únicamente el título y un resumen del estado actual («8 de 8 seleccionadas», «Ambos modos»). El usuario puede expandir cada uno independientemente. Este diseño evita abrumar con opciones antes de que el usuario las necesite, y permite acceder rápidamente al botón Empezar para quien quiere la configuración por defecto sin cambios.

- **Categorías**: checkboxes de todas las categorías desbloqueadas con sus estrellas de rendimiento. Incluye un checkbox «Seleccionar todo» en negrita que actúa sobre todos a la vez. Por defecto todas están marcadas. Las estrellas de cada categoría son visibles aquí para ayudar al usuario a tomar decisiones informadas sobre qué reforzar.

- **Modo de ejercicio**: tres botones exclusivos — Modo A (identificar la palabra del signo reproducido), Modo B (encontrar el avatar que signa la palabra indicada), Ambos (alternancia aleatoria 50/50). Por defecto: Ambos.

**3. Botón «Empezar modo global»**
Mismo estilo que el botón de categorías individuales. Deshabilitado si no hay ninguna categoría seleccionada.

### Motor de ejercicio global

La configuración se pasa al componente `PracticaVocabularioEjercicioComponent` como queryParams: `cats` (IDs separados por coma) y `modo` (A/B/ambos). El componente detecta `categoriaId === 'global'` y ejecuta `cargarGlobal()` en lugar del flujo individual.

**Carga de palabras con ponderación por rendimiento**
Las palabras de cada categoría seleccionada se cargan en paralelo junto con su historial de ejercicios. Para cada categoría se calculan sus estrellas (`calcularEstrellasCat`) y se aplica un multiplicador de aparición en la cola:

| Estrellas | Multiplicador |
|-----------|--------------|
| 0 (sin historial o <40% aciertos) | ×3 |
| 1 (40–59%) | ×2 |
| 2–3 (≥60%) | ×1 |

Esto hace que las categorías peor dominadas contribuyan proporcionalmente más palabras a la sesión, sin excluir las buenas — el objetivo es reforzar lo débil sin dejar de practicar lo consolidado.

**Fusión del historial**
Los registros de `progreso_ejercicio` de todas las categorías seleccionadas se fusionan en un único mapa indexado por `palabraId`, tomando el registro más desfavorable cuando una palabra aparece en múltiples categorías. Esto garantiza que el motor de priorización individual actúe correctamente sobre el historial global.

**Motor de priorización individual sobre la cola ponderada**
Una vez construida la cola (con multiplicadores aplicados), el motor de priorización individual actúa encima: las palabras nunca vistas en ejercicios van primero, las más falladas antes que las más acertadas, con aleatoridad dentro de cada nivel de prioridad. El resultado es una cola que combina ponderación por categoría (macro) con priorización por historial individual (micro).

**Modo de ejercicio forzado**
Si el usuario seleccionó Modo A o Modo B exclusivo, `elegirModoYPregunta()` respeta `modoForzado` en lugar de alternar aleatoriamente. Si seleccionó Ambos, el comportamiento es idéntico al de las categorías individuales.

### Cambios realizados
- `frontend/.../practica-vocabulario.component.ts`: estado `modoGlobalActivo`, `globalCatsSeleccionadas`, `globalModoForzado`, `globalTodo`, `globalCatsAbierto`, `globalModoAbierto`; métodos `seleccionarModoGlobal()`, `toggleGlobalTodo()`, `toggleGlobalCat()`, `empezarGlobal()`.
- `frontend/.../practica-vocabulario.component.html`: nodo Global integrado como primer elemento del grid; panel de configuración con intro, dos acordeones y botón CTA.
- `frontend/.../practica-vocabulario.component.css`: estilos del nodo global (`vv-node-global`), intro (`vv-global-intro`, `vv-global-eyebrow`, `vv-global-title`, `vv-global-desc`), acordeones (`vv-global-accordion`, `vv-global-acc-header`, `vv-global-acc-body`, `vv-global-chevron`).
- `frontend/.../practica-vocabulario-ejercicio.component.ts`: detección de `categoriaId === 'global'`; `cargarGlobal()` con ponderación por estrellas y fusión de historial; `calcularEstrellasCat()`; `modoForzado` aplicado en `elegirModoYPregunta()`.