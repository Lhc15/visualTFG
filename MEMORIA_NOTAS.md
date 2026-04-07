# MEMORIA_NOTAS.md
> Notas internas para la redacción de la memoria del TFG.
> Cada sección tiene una palabra clave en mayúsculas para localizar con Ctrl+F.
> No es prosa académica — es el razonamiento en bruto para luego redactar.

---

## [GRAMATICA_LSE] Contenido gramatical de la sección de gramática

### Qué se enseña
La sección de gramática cubre los aspectos básicos de la LSE extraídos del curso SIGNOcampus (Fundación CNSE), nivel básico:

1. **Orden de las frases: S-O-V** (Sujeto - Objeto - Verbo)
   - En LSE el verbo va al final, a diferencia del español (S-V-O)
   - Ejemplo: "Tú compras una puerta" → TÚ PUERTA COMPRAR

2. **Frases interrogativas**
   - Sin partícula (sí/no): mismo orden S-O-V, lo que cambia es la expresión facial (cejas altas, hombros hacia delante)
   - Con partícula (qué, quién, dónde...): la partícula va AL FINAL → TÚ VIVIR DÓNDE
   - La expresión facial varía: cejas juntas + nariz arrugada para preguntas con partícula

3. **Género gramatical**
   - LSE no tiene morfema de género (los signos no cambian forma)
   - Para especificar sexo se añade HOMBRE o MUJER después del sustantivo
   - Excepción: MADRE y PADRE tienen signo propio diferente
   - Ejemplo: AMIGO + HOMBRE = amigo varón

4. **Expresión no manual (ENM)**
   - Todo lo que acompaña al signo con el cuerpo: cara, mirada, postura
   - Tan importante como el signo en sí
   - Contacto visual: mirar al interlocutor llama su atención
   - Afirmación con cabeza: quien escucha asiente para indicar que sigue la conversación
   - Posición del cuerpo: inclinado hacia delante en preguntas

5. **Presentaciones**
   - Siempre: signo personal primero, luego nombre deletreado
   - Ejemplo del PDF: YO PRESENTAR-yo-a-ti · MI SIGNO "BARBA" · LLAMARSE P-E-D-R-O

### Fuente
Apuntes propios de clase + PDF de conversaciones del curso SIGNOcampus básico.

---

## [VOCABULARIO_MOTOR] Clasificación del vocabulario para el motor de práctica

### Vocabulario clasificado por tipo (41 signos totales)

| Tipo | Signos |
|------|--------|
| S (pronombre/sujeto) | YO, TÚ, ÉL/ELLA, NOSOTROS |
| O (objeto/sustantivo) | ABUELO, HIJO, HERMANO, MADRE, PADRE, HOMBRE, MUJER, COMPAÑERO, AMIGO, PUERTA, CASA, HABITACIÓN |
| V (verbo) | COMPRAR, COMER, VIVIR, DORMIR, LLAMARSE, PRESENTAR, APELLIDARSE, SER(SOLTERO) |
| ADJ (adjetivo) | ALTO, SOLTERO/A, BIEN, REGULAR |
| INT (partícula interrogativa) | QUÉ, QUIÉN, DÓNDE, CUÁNTOS/AS, CÓMO |
| FX (fórmula fija) | HOLA, BUENOS DÍAS, ADIÓS, HASTA MAÑANA, ENCANTADO/A, SÍ, NO, POR FAVOR REPETIR |

### Patrones de frase que genera el motor
- **Afirmativa**: S + O + V → TÚ CASA VIVIR
- **Interrogativa sin partícula**: S + V + [ENM cejas altas] → TÚ COMER
- **Interrogativa con partícula**: S + V + INT + [ENM cejas juntas] → TÚ VIVIR DÓNDE

### Nota
Las FX no entran en el motor de combinaciones aleatorias. Son para el módulo de vocabulario libre y para las situaciones del ¿Conversamos?

---

## [ARQUITECTURA_MOTOR] Decisión de arquitectura — cómo modelar el rol gramatical en la BD

### Contexto
El sistema ya tenía un modelo `Palabra` con: `palabra`, `explicacion`, `categoria` (ref a Categoría temática), `gltf`, `clipName`, `nivel`, `orden`.

La categoría temática ("Familia", "Saludos"...) y el tipo gramatical ("verbo", "sustantivo"...) son dos clasificaciones **ortogonales** — no son lo mismo y no deben mezclarse.

### Opciones descartadas y por qué

| Opción | Motivo de descarte |
|--------|-------------------|
| Usar el campo `categoria` para el rol gramatical | Mezcla dos conceptos distintos |
| Colección nueva `RolGramatical` | Sobrediseño para valores fijos |
| Hardcodear los roles en el frontend | No gestionable desde el panel admin |
| Un campo `rolGramatical: String` (valor único) | No permite que una palabra tenga varios roles |

### Solución adoptada
Añadir dos campos opcionales al modelo `Palabra`:

```javascript
tiposLexicos: [String]  // array — ["ADJ", "FX"], ["V"], ["O", "V"]...
enMotor:      Boolean   // ¿está lista esta palabra para el generador de frases?
```

### Por qué array y no string único
Una misma seña puede tener múltiples roles según el contexto. Ejemplo real:
- BIEN → ADJ en "yo estoy bien" / FX en "bien, hasta luego"
- HOMBRE → O (sustantivo) / clasificador de género junto a otro sustantivo

Con array, desde el panel admin se marcan los checkboxes que aplican a cada signo. El motor filtra con `.includes()`.

### Por qué el campo `enMotor`
Separa la clasificación semántica del estado operativo. Puedes tener un signo clasificado como V pero con `enMotor: false` porque aún no tiene animación Blender lista. Así el generador no lo usa hasta que esté completo.

### Escalabilidad futura
Si en el futuro se necesita modelar que una palabra tiene comportamiento gramatical diferente según contexto (no solo tipo léxico canónico), se puede añadir una colección `Usos` que relacione `Palabra` + `tipoLexico` + `contexto`. El campo `tiposLexicos` actual pasaría a ser el valor por defecto, sin romper nada.

### Referencia a cómo lo hacen los grandes
Los corpus lingüísticos serios (Spread the Sign, SignBank) separan tres capas:
- Lexema (el signo en sí)
- Entrada léxica (el signo en un contexto concreto)
- Uso en frase (rol sintáctico en esa frase específica)

Para una plataforma de aprendizaje (Duolingo, Babbel, SignSchool), el término medio es: tipo léxico base + flag operativo. Que es exactamente lo que adoptamos.

### Cambios necesarios en el código
- `backend/models/palabras.js` → añadir `tiposLexicos` y `enMotor`
- `backend/controllers/palabras.js` → incluirlos en crear/editar
- Panel admin Angular → checkboxes de tipo léxico + toggle enMotor
- Nuevo componente `practica-gramatica` con el motor generador de frases

---

## [ARQUITECTURA_GENERAL] Rediseño completo de la arquitectura — nuevo enfoque

### Contexto y motivación
La versión anterior de Visual Voices tenía 4 secciones (Abecedario, Vocabulario, Gramática, ¿Conversamos?) donde Gramática no existía, Vocabulario era el backend real heredado del proyecto anterior, y el resto era frontend simulado. El nuevo enfoque reorganiza la app en torno a una distinción clara entre **aprender** (contenido teórico) y **practicar** (ejercicios gamificados).

### Estructura anterior vs. nueva

| Anterior | Nueva | Cambio |
|----------|-------|--------|
| Abecedario (teoría + ejercicios mezclados) | Abecedario (solo teoría) | Separación |
| Vocabulario (teoría, BD real) | Aprende (vocab + gramática teórica) | Fusión y ampliación |
| Gramática (no existía) | Practica (subapp gamificada) | Nuevo |
| ¿Conversamos? (simulado) | ¿Conversamos? (sin cambios de momento) | Mantenido |

### Las 4 secciones nuevas

**1. Abecedario** (`/abecedario`)
- Solo teoría: los 27 signos del alfabeto LSE con avatar
- Sin cambios estructurales de fondo respecto a la versión anterior

**2. Aprende** (`/aprende`)
- Índice con dos subsecciones:
  - `/aprende/vocabulario` → vocabulario organizado por categorías temáticas (reemplaza `/libre`)
  - `/aprende/gramatica` → gramática teórica (bloque S-O-V, interrogativas, género, ENM)
- Contenido mayormente estático con avatar ilustrando los conceptos

**3. Practica** (`/practica`)
- Subapp gamificada con 3 submodos independientes:
  - `/practica/abecedario` → el avatar firma una letra, el usuario adivina
  - `/practica/vocabulario` → el avatar firma una palabra, el usuario selecciona entre opciones
  - `/practica/gramatica` → motor S-O-V genera frases aleatorias para ordenar/identificar
- Cada sesión se registra en BD con aciertos, fallos y tiempo

**4. ¿Conversamos?** (`/conversamos`)
- Sin cambios por ahora, frontend simulado
- Se retoma en una fase posterior del proyecto

---

## [BACKEND_REDISENO] Rediseño del backend — modelos eliminados, modificados y nuevos

### Modelos eliminados
Estos modelos pertenecían a modos que ya no existen en el nuevo enfoque:
- `Stats` → sustituido por `PracticaSession`
- `ExamenSession` → modo examen eliminado
- `VersusSession` → modo versus eliminado
- `CategorySession` / `CategoryEntry` / `wordnEntry` → sustituidos por `PracticaEntry`

### Modelos modificados

**`Palabra`** — se añaden dos campos:
```javascript
tiposLexicos: { type: [String], default: [] }
enMotor: { type: Boolean, default: false }
```

**`Categoria`** — se añade un campo:
```javascript
modulo: { type: String, enum: ['abecedario', 'vocabulario', 'gramatica'] }
```

### Modelos nuevos

**`PracticaSession`**:
```javascript
{
  userId:      ObjectId ref Usuario
  tipo:        String enum ['abecedario', 'vocabulario', 'gramatica']
  startedAt:   Date
  finishedAt:  Date
  total:       Number
  correctas:   Number
  incorrectas: Number
}
```

**`PracticaEntry`**:
```javascript
{
  userId:          ObjectId ref Usuario
  sessionId:       ObjectId ref PracticaSession
  palabraId:       ObjectId ref Palabra
  tipo:            String enum ['abecedario', 'vocabulario', 'gramatica']
  acierto:         Boolean
  tiempoMs:        Number
  createdAt:       Date
  fraseGenerada:   [String]
  estructuraUsada: String
}
```

### Rutas nuevas necesarias
```
POST  /api/practica/session
PATCH /api/practica/session/:id
POST  /api/practica/entry
GET   /api/practica/stats/:userId
GET   /api/palabras/motor
```

---

## [ORDEN_IMPLEMENTACION] Plan de implementación por fases

```
Fase 1 — Backend base
  1a. Modificar modelo Palabra (+ tiposLexicos, enMotor)
  1b. Modificar modelo Categoria (+ modulo)
  1c. Crear modelos PracticaSession y PracticaEntry
  1d. Crear controladores y rutas de practica
  1e. Eliminar modelos/rutas obsoletos

Fase 2 — Admin panel
  2a. Añadir checkboxes tiposLexicos al editor de palabras
  2b. Añadir toggle enMotor al editor de palabras
  2c. Añadir selector modulo al editor de categorías
  2d. Etiquetar palabras existentes en BD real

Fase 3 — Aprende
  3a. Componente /aprende (índice con 2 cards)
  3b. Componente /aprende/vocabulario
  3c. Componente /aprende/gramatica

Fase 4 — Practica
  4a. Componente /practica (selector de 3 submodos)
  4b. Componente /practica/abecedario
  4c. Componente /practica/vocabulario
  4d. Componente /practica/gramatica (motor S-O-V)

Fase 5 — Cierre
  5a. Adaptar /perfil a las nuevas estadísticas
  5b. Actualizar modos2 con las 4 cards nuevas
  5c. Eliminar componentes obsoletos
```

---

## [DESBLOQUEO_CONTENIDO] Sistema de desbloqueo y priorización de contenido

### Estado: parcialmente definido

### Concepto base
El sistema de desbloqueo se basa en el uso de la barra de herramientas (tool-menu): **dar al play de una palabra o letra es lo que la marca como "vista"**, y ese evento es el que desbloquea su práctica correspondiente.

### Dos capas distintas

**Capa 1 — Desbloqueo**: ¿puede el usuario acceder a practicar este contenido?
**Capa 2 — Priorización**: dentro de lo desbloqueado, ¿qué aparece primero en los ejercicios?

### Capa 1 — Reglas de desbloqueo por módulo

| Módulo | Qué desbloquea | Granularidad |
|--------|---------------|--------------|
| Practica/abecedario | Haber dado al play a esa letra en Abecedario | Letra a letra |
| Practica/vocabulario | Haber dado al play a esa palabra en Aprende/vocabulario | Palabra a palabra |
| Practica/gramática | Haber completado el bloque correspondiente en Comunicación | Por bloque |

### Capa 2 — Priorización (spaced repetition simplificado)
- **Nunca vista en práctica** → máxima prioridad
- **Número de veces mostrada** → a más exposiciones, menos prioridad relativa
- **Ratio de aciertos/fallos** → más fallos = más prioridad
- **Tiempo desde última aparición** → si hace mucho que no sale, sube prioridad

---

## [CONTENIDO_ESTATICO] Decisión sobre el contenido de la sección Comunicación

Para la memoria del TFG esto es perfectamente válido y defendible — el contenido de comunicación es curricular y estable, no necesita gestión dinámica. Es una decisión de diseño consciente, no una limitación.

---

## [BD_SETUP] Puesta en marcha de la base de datos — ordenador 2

### Decisión: BD nueva en vez de migrar la de Graphicare
Se optó por una base de datos limpia llamada `visualvoices`. Razones:
- Los datos del equipo original no son relevantes para la nueva arquitectura
- El esquema de `Palabra` cambió (+ `tiposLexicos`, `enMotor`, `gltf`, `clipName`)
- El esquema de `Categoria` cambió (+ `modulo`)
- Partir de cero evita datos corruptos o inconsistentes

### Script seed.js
Ejecutar con `node seed.js` desde `backend/`. Es idempotente.

Inserta:
- 1 usuario admin (`admin@visualvoices.com` / `Admin1234!`, `ROL_ADMIN`)
- 11 categorías organizadas por módulo
- 41 palabras del vocabulario con `tiposLexicos` clasificados
- 27 letras del abecedario dactilológico (A–Z + CH)
- Todas las palabras con `enMotor: false` y sin `gltf`/`clipName`

### Variables de entorno (.env)
```
PORT=3000
DBCONNECTION=mongodb://localhost:27017/visualvoices
JWTSECRET=<cadena aleatoria larga>
NODE_ENV=development
```

---

## [PRACTICA_VOCAB_BD] Conexión real del camino de práctica/vocabulario con la BD

### Problema que había
1. Filtro incorrecto: `!c.modulo || c.modulo === 'vocabulario'` incluía categorías sin módulo.
2. Conteo de palabras simulado con `Math.random()`.

### Solución en el backend
`backend/controllers/categorias.js` enriquece cada categoría con `totalPalabras` via agregación MongoDB:
```js
const conteos = await Palabra.aggregate([
    { $group: { _id: '$categoria', total: { $sum: 1 } } }
]);
```

### Solución en el frontend
- Filtro estricto: `c.modulo === 'vocabulario'`
- Eliminado todo `Math.random()` y datos hardcodeados
- Datos reales de `obtenerPalabrasPorCategoria`

### Orden de las categorías
Se muestran en orden de inserción en MongoDB, coherente con el orden en Aprende. Si en el futuro se necesita control explícito del orden: añadir campo `orden: Number` al modelo `Categoria`.

---

## [CONTENIDO_GRAMATICAL_COMPLETO] Corpus gramatical completo de la sección Comunicación

### Fuente
Todo el contenido teórico procede de dos fuentes del mismo origen institucional:

1. **Curso básico SIGNOcampus** (Fundación CNSE) — nivel A1/A2. Material de las unidades de gramática del portal lsefamilias de la Fundación CNSE.
2. **Curso de gramática LSE para familias** (Fundación CNSE / Huawei) — segundo nivel, mismo sistema pedagógico.

Ambas fuentes son del mismo organismo (CNSE — Confederación Estatal de Personas Sordas) y comparten terminología, ejemplos e intérpretes. El contenido se recopiló manualmente mediante capturas de pantalla y PDFs de transcripción de los diálogos modelo. Posteriormente fue revisado, consolidado y verificado antes de incorporarlo a la app. Está pendiente de una revisión final por parte de la intérprete de LSE colaboradora del proyecto.

### Estructura del corpus — 11 bloques

El corpus se organizó en 11 bloques temáticos que reflejan el orden pedagógico del curso de referencia, pasando de los aspectos más básicos de la comunicación (ENM, contacto visual) a los más específicos de la gramática (verbos, tiempos, negación, énfasis).

#### Bloque 1 — ENM: Expresión No Manual
La expresión no manual (ENM) es todo aquello que acompaña al signo manual: expresión facial, mirada, postura corporal y movimiento de cabeza. Es tan constitutiva del signo como la configuración de la mano.

Subcontenidos:
- **Contacto visual**: imprescindible antes y durante toda comunicación. Desviar la mirada equivale a terminar la conversación. El receptor asiente suavemente con la cabeza para indicar que sigue el mensaje (equivalente al "ajá" oral).
- **Posición del cuerpo**: la postura corporal es un marcador gramatical. Inclinarse hacia delante con cabeza y hombros activa la modalidad interrogativa en preguntas sin partícula.
- **Llamar la atención**: antes de empezar a signar hay que asegurarse de que la persona sorda esté mirando. Métodos válidos: agitar la mano en su campo visual, tocar suavemente el hombro o el brazo, golpear la mesa o el suelo para generar vibración. Gritar o elevar la voz no tiene ningún efecto.

#### Bloque 2 — Orden SOV
El orden canónico de la frase en LSE es **Sujeto + Objeto + Verbo**, diferente al español (Sujeto + Verbo + Objeto). El verbo siempre cierra la frase.

- Ejemplo: "Tú compras una puerta" → TÚ PUERTA COMPRAR
- No existen artículos ni preposiciones en LSE: la frase TÚ PUERTA COMPRAR equivale a "tú compras una puerta" completa.
- El orden SOV se mantiene también en frases con lugar: NOSOTROS CAMPING IR ("Nos vamos al camping").

#### Bloque 3 — Preguntas
Dos tipos con reglas distintas:

**Sin partícula interrogativa (preguntas de sí/no)**
- Misma estructura SOV que la afirmación. Lo único que cambia es la ENM.
- Marcadores no manuales: cejas levantadas + cabeza y hombros inclinados ligeramente hacia delante.
- Ejemplo: TÚ TRABAJAR con cejas altas = "¿Vas a trabajar?". TÚ TRABAJAR con expresión neutra = "Tú vas a trabajar".
- Sin la expresión facial correcta, la frase es una afirmación, no una pregunta.

**Con partícula interrogativa (qué, quién, dónde, cómo, cuántos...)**
- La partícula interrogativa va SIEMPRE al final de la frase, no al principio.
- Estructura: Sujeto + Verbo + Partícula.
- Marcadores no manuales distintos: cejas fruncidas + nariz ligeramente arrugada + inclinación hacia delante.
- Ejemplo: "¿Dónde vives?" → TÚ VIVIR DÓNDE.
- Algunas preguntas omiten la partícula porque la expresión facial ya la sustituye: "¿Qué haces?" → solo HACER con expresión de pregunta; "¿Cuántos años tienes?" → TÚ AÑO con expresión.

#### Bloque 4 — Género gramatical
LSE no tiene morfema de género. Los signos no cambian de forma según el sexo del referente.

- Para especificar sexo cuando sea necesario: sustantivo + HOMBRE o sustantivo + MUJER (después del sustantivo, no antes).
- Excepción: MADRE y PADRE tienen cada uno su propio signo diferenciado, sin necesidad de clasificador.
- Mismo principio para animales: GALLINA y GALLO tienen signo propio; en otros casos se añade HOMBRE/MUJER si la distinción es relevante.

#### Bloque 5 — Presentaciones
Protocolo de presentación en LSE:

- Estructura: YO + PRESENTAR (verbo direccional yo-a-ti) + MI SIGNO "[signo personal]" + LLAMARSE + [nombre deletreado].
- El signo personal siempre va antes que el nombre deletreado. Siempre.
- El nombre y el apellido se deletrean con el abecedario dactilológico, letra a letra.
- Respuesta a una presentación: ENCANTADO/A.
- El signo personal lo asigna la comunidad sorda a partir de un rasgo físico o de personalidad visible. No lo elige uno mismo.
- Si no se tiene signo personal todavía: se presenta directamente con LLAMARSE + deletreo.

#### Bloque 6 — Los verbos
Tres sublecciones:

**Sin SER, ESTAR ni HACER (tiempo atmosférico)**
- Estos tres verbos no tienen signo en LSE. Se omiten completamente.
- La posición del adjetivo, adverbio o lugar en la frase sustituye al verbo: TU HIJO GUAPO = "Tu hijo es guapo". YO CERCA = "Estoy cerca". FRÍO = "Hace frío".
- HABER y TENER sí tienen signo, pero pueden omitirse cuando la frase ya contiene un cuantificador: TÚ HIJO TRES = "Tienes tres hijos".

**Posición del verbo**
- El verbo siempre cierra la frase (coherente con SOV).
- Con dos verbos: el verbo modal o de sentimiento va al final, después del verbo principal. "Debes ir al médico" → TÚ MÉDICO IR DEBER. "Me apetece ver la película" → YO PELÍCULA VER APETECER.
- Excepción con QUERER intenso: el verbo va antes del objeto con expresión facial específica (boca cerrada, labios hacia fuera): YO QUERER VACACIONES.

**Verbos direccionales**
- Un subgrupo de verbos puede modificar su trayectoria espacial para indicar sujeto y receptor sin pronombres adicionales.
- El movimiento empieza desde el espacio del sujeto y termina en el espacio del receptor.
- Verbos direccionales más frecuentes: aconsejar, avisar, ayudar, burlarse, contar, contestar, cuidar, dar, decir, elegir, enseñar, entender, llamar, perseguir, pillar, preguntar, presentar, regalar, regañar, ver.
- Excepción: INVITAR va en dirección inversa (del receptor hacia el sujeto).

#### Bloque 7 — Tiempos verbales
LSE no conjuga los verbos. El mismo signo vale para cualquier tiempo.

- El tiempo se indica con un marcador temporal al principio de la frase, antes del sujeto: ANTES FUMAR MUCHO ("Antes fumaba mucho"). PRÓXIMO VERANO YO PLAYA IR ("El próximo verano iré a la playa").
- Con más de un marcador temporal: primero el más general, luego el más concreto: PASADO SEMANA NOSOTROS PASEAR ("La semana pasada paseamos").

#### Bloque 8 — La negación
El signo NO se coloca siempre después del verbo o de la palabra que niega, nunca antes.

- Estructura: Sujeto + Objeto + Verbo + NO.
- Además del signo, es obligatorio mover la cabeza de lado a lado simultáneamente.
- Ejemplos: NOSOTROS CHOCOLATE COMPRAR NO. YO ALTO NO. TU PIZZA COMER MÁS NO.
- Verbos con negación incorporada: no apetecer, no conocer, no entender, no gustar, no haber, no poder, no querer, no saber.
- "No pasa nada" tiene su propio signo único en LSE.

#### Bloque 9 — Singular y plural
LSE no tiene morfema de número.

- El contexto y los cuantificadores aclaran el número: TÚ HIJO TRES = "Tienes tres hijos".
- Algunos signos pueden repetirse con desplazamiento para indicar explícitamente el plural (notación ++): NIÑO++, SILLA++.
- No todos los signos admiten la repetición.

#### Bloque 10 — Los adverbios
- **Adverbios de modo y cantidad**: van justo después del verbo o adjetivo al que acompañan. TÚ ESCRIBIR REGULAR. ÉL COMER BIEN BASTANTE.
- **Adverbios de tiempo y lugar**: al principio si afectan a toda la oración (AYER YO TELEVISIÓN VER); al final si solo afectan a un elemento (YO TRABAJAR EMPEZAR PRONTO).

#### Bloque 11 — Intensidad y énfasis
La intensidad se gradúa con expresión facial y amplitud/repetición del movimiento, no con palabras adicionales.

- **Énfasis positivo** (guapísimo, riquísimo): apretar los dientes + cerrar un poco los ojos.
- **Énfasis negativo** (muy aburrido, mucho calor): inflar los carrillos + pequeño soplido.
- **Menos intensidad** (un poco grande): arquear los labios + inclinar la cabeza.
- **Intensidad máxima** en algunos signos: sacar un poco la lengua.
- La intensidad se incorpora al propio signo: COMER-MUCHÍSIMO es un signo único.

### Nota metodológica sobre la verificación del contenido
Antes de incorporar el contenido a la app se realizó una auditoría interna de todos los ejemplos LSE contra el material fuente para detectar errores de persona, errores de orden, y roles gramaticales incorrectos en los esquemas visuales de tokens. Se corrigieron varios errores detectados en la primera versión, incluyendo el ejemplo "YO PIZZA" que en el material original es "TU PIZZA", y los tokens con rol 'O' (objeto) que en realidad eran predicados adjetivales o adverbios.

---

## [ARQUITECTURA_COMUNICACION] Arquitectura del componente Comunicación

### Motivación del diseño
La sección de gramática teórica se implementó como un componente Angular autónomo (`/aprende/comunicacion`) independiente de la sección de vocabulario. Esta separación refleja la diferencia conceptual entre aprender signos aislados (vocabulario) y entender las reglas que los combinan (gramática/comunicación).

### Sistema de navegación en tres niveles
```
Índice de bloques
  └── Subíndice de lecciones (solo en bloques con sublecciones: ENM, Preguntas, Verbos)
        └── Secuencia de diapositivas
```

Los estados posibles de la vista: `'indice'` | `'subindice'` | `'portada'` | `'bloque'`.

### Modelo de datos del contenido
El contenido es completamente estático, definido como un array de objetos TypeScript en el propio componente. Esta decisión fue deliberada: el contenido gramatical es curricular y estable, no requiere gestión dinámica desde el panel admin, y la alternativa (BD + endpoints) añadiría complejidad sin beneficio real para el alcance del TFG.

Cada bloque (`Bloque`) tiene la siguiente forma:
```typescript
interface Bloque {
  id: string;           // coincide con bloqueId en ProgresoComun
  numero: number;
  titulo: string;
  subtitulo: string;
  subBloques?: SubBloque[];
  diapositivas?: Diapositiva[];
}
```

Cada diapositiva soporta dos layouts:
- `layout-a`: avatar a la izquierda + contenido teórico a la derecha
- `layout-b`: imagen ilustrativa a la izquierda + listas de reglas a la derecha

### Sistema de tokens de frase LSE
El componente incluye un visualizador de frases LSE basado en tokens con código de colores por rol gramatical:

| Rol | Color | Significado |
|-----|-------|-------------|
| S | Naranja-rojo `#E04A1A` | Sujeto / pronombre |
| O | Ámbar `#F4A940` | Objeto / sustantivo |
| V | Verde `#4CAF50` | Verbo |
| INT | Índigo `#6366F1` | Partícula interrogativa |
| ENM | Violeta `#8B5CF6` | Marcador no manual / adverbio temporal / predicado adjetival |

El rol ENM se usa también para predicados adjetivales (adjetivos que ocupan la posición del verbo omitido) y para adverbios, dado que en LSE estas categorías comparten la posición final de la frase con los marcadores no manuales propiamente dichos.

Los tokens son interactivos: al reproducir el esquema de frase con el avatar, cada token se ilumina secuencialmente (clase `.active`) para indicar el signo que el avatar está realizando en ese momento.

### Pantalla de portada de transición
Al llegar a la última diapositiva de un bloque/lección y pulsar "Siguiente", aparece una pantalla de portada con etiqueta, título, subtítulo y botón "Empezar".

**Diferenciación visual** entre los dos tipos de portada:
- **Portada de bloque**: fondo `rgba(253, 232, 223, 0.55)` (naranja muy suave semitransparente), número decorativo gigante en naranja tenue, botón naranja sólido.
- **Portada de lección**: fondo blanco con franja naranja lateral izquierda (`border-left: 4px solid #E04A1A`), botón suave `#FDE8DF` que se vuelve naranja sólido al hover.

**Animación de entrada**: los cuatro elementos entran escalonados con `slide-up + fade-in` a 0.05s, 0.12s, 0.20s y 0.28s de retraso. Para garantizar que la animación se relanza cada vez, se usa un contador `portadaKey` que se incrementa con cada nueva portada, forzando la recreación completa del nodo DOM.

---

## [PROGRESO_COMUNICACION] Sistema de progreso y desbloqueo en la sección Comunicación

### Decisión de arquitectura
Se descartó añadir el progreso al modelo `Usuario` (ya sobrecargado) y se optó por una **colección separada**, siguiendo el patrón establecido por `PracticaEntry` y `PracticaSession`.

### Modelo ProgresoComun
```javascript
// backend/models/progresoComun.js
// Colección: progreso_comunicacion
{
  userId:          ObjectId ref Usuario
  bloqueId:        String
  fechaCompletado: Date
}
// Índice único: { userId, bloqueId } — upsert idempotente con findOneAndUpdate
```

### Endpoints
```
GET  /api/progreso-comunicacion           → array de { bloqueId, fechaCompletado } del usuario autenticado
POST /api/progreso-comunicacion/completar → body: { bloqueId }
```

Ambos requieren JWT válido. La identidad del usuario se extrae del token (`req.uid`), no del body, para evitar que un usuario marque el progreso de otro.

### Reglas de desbloqueo
- **Bloque 1** (`enm`): siempre desbloqueado para todos los usuarios.
- **Bloque N** (N > 1): desbloqueado si el bloque N-1 está en `bloquesCompletados`.
- **Admins** (`ROL_ADMIN`): todos los bloques desbloqueados siempre, sin consultar la BD.

### Trigger del desbloqueo — Opción B
El guardado ocurre cuando el usuario pulsa "Siguiente bloque" o "Siguiente lección" desde la última diapositiva. Este es el punto más significativo: el usuario ha llegado al final del contenido y ha tomado la decisión activa de continuar.

Se descartaron:
- Trigger en la primera diapositiva del siguiente bloque (demasiado anticipado).
- Trigger automático al llegar a la última diapositiva sin acción del usuario (no confirma lectura activa).

Si la llamada al backend falla, el sistema continúa de forma degradada: añade el `bloqueId` al conjunto local `bloquesCompletados` y muestra la portada igualmente.

### Flujo completo
```
Usuario en última diapositiva del Bloque X
  → Pulsa "Siguiente bloque"
  → POST /api/progreso-comunicacion/completar  { bloqueId: 'X' }
  → Backend guarda/actualiza en progreso_comunicacion
  → Frontend añade 'X' a bloquesCompletados local
  → Se muestra portada del Bloque X+1
  → Usuario pulsa "Empezar"
  → Se abre la primera diapositiva del Bloque X+1

En /practica/gramatica:
  → GET /api/progreso-comunicacion al cargar
  → Bloque X: 'completado'
  → Bloque X+1: 'activo'
  → Bloques X+2...: 'bloqueados'
```

### Integración en practica-gramatica
- Al iniciar, detecta si el usuario es admin (todo desbloqueado) o normal (consulta BD).
- Construye el estado de cada bloque a partir del conjunto de `bloqueId`s completados.
- Los 11 bloques tienen los mismos `id`s en `comunicacion.component.ts` y en `practica-gramatica.component.ts`, garantizando coherencia entre las dos secciones.

### Notas sobre el progreso de los subbloques
Los bloques con sublecciones (ENM, Preguntas, Verbos) guardan el progreso a nivel de sublección individual. El `bloqueId` que se guarda al completar una sublección es el `id` de la sublección (p.ej. `'enm-contacto'`, `'enm-cuerpo'`). El bloque padre se marca como completado al completar la última sublección y avanzar al bloque siguiente.

---

## [CONVENCION_NOMBRES_BACKEND] Convención de nombres en el backend

Los archivos del backend siguen la convención de nombre simple sin sufijo de tipo:
- `backend/models/progresoComun.js` (no `progresoComun.model.js`)
- `backend/controllers/progresoComun.js` (no `progresoComun.controller.js`)
- `backend/routes/progresoComun.js` (no `progresoComun.routes.js`)

La ubicación dentro de la carpeta (`models/`, `controllers/`, `routes/`) ya indica el tipo. Esta convención es la misma que siguen todos los archivos preexistentes.

---

## [STATS_SERVICE_AMPLIADO] Ampliación del StatsService

El servicio `StatsService` centraliza todas las llamadas HTTP relacionadas con estadísticas y progreso. Con la incorporación del sistema de progreso de comunicación se añadieron dos métodos:

```typescript
// Obtiene los bloques de comunicación completados por el usuario autenticado
getProgresoComunicacion(): Observable<{ bloqueId: string, fechaCompletado: string }[]>

// Marca un bloque de comunicación como completado
completarBloqueComun(bloqueId: string): Observable<{ ok: boolean, bloqueId: string }>
```

Ambos usan `environment.apiUrl` directamente (no `this.statsUrl`) ya que apuntan a `/api/progreso-comunicacion` y no a `/api/stats`. Patrón consistente con otros endpoints fuera de `/stats` en el mismo servicio.

---
<!-- Añadir nuevas secciones aquí siguiendo el mismo formato -->
<!-- Palabra clave: [NOMBRE_SECCION] en mayúsculas para Ctrl+F -->
---

## [ENM_OVERLAY] Sistema de ayuda visual para Expresiones No Manuales — componente EnmOverlay

### Problema que resuelve
El avatar 3D de Visual Voices no tiene expresión facial animada. Las ENM (Expresiones No Manuales) son gramaticalmente constitutivas en LSE — sin la expresión facial correcta, una frase afirmativa y una pregunta son indistinguibles aunque los signos sean idénticos. Toda la sección de gramática (bloque 3 — Preguntas, bloque 1 — ENM) enfatiza este hecho, pero el propio avatar no podía ilustrarlo. Existía una contradicción directa entre el mensaje pedagógico ("la expresión facial es obligatoria") y el medio (un avatar sin cara expresiva).

### Solución adoptada
Se creó un sistema de ayuda visual complementaria basado en imágenes fotorrealistas generadas con IA (flujo de trabajo Gemini) que representan las ENM específicas de cada tipo gramatical. Estas imágenes están pensadas para ser sustituidas en el futuro por vídeos animados también generados con IA. El sistema está diseñado desde el principio para soportar ambos formatos (imagen estática y vídeo/GIF) sin cambios de arquitectura.

La ayuda visual se presenta como una **ventana flotante draggable y resizable** (`EnmOverlayComponent`) que aparece automáticamente sobre el panel izquierdo (zona del avatar) cuando la lección o ejercicio activo implica una ENM relevante.

### Arquitectura del sistema

El sistema se compone de cuatro piezas:

**1. Catálogo de packs (`enm-packs.data.ts`)**
Un array de objetos `EnmPack` que centraliza toda la información de cada tipo de ENM:
```typescript
interface EnmPack {
  id: EnmPackId;       // identificador único del tipo gramatical
  label: string;       // nombre visible en la cabecera de la ventana
  descripcion: string; // texto pedagógico mostrado bajo la imagen
  imagen?: string;     // ruta al asset de imagen estática
  video?: string;      // ruta al asset de vídeo (prioridad sobre imagen)
}
```
El campo `video` tiene prioridad sobre `imagen` cuando ambos están presentes — permite la transición gradual de imagen estática a vídeo animado recurso a recurso, sin tocar ningún otro archivo.

**2. Servicio singleton (`EnmService`)**
Un `Injectable({ providedIn: 'root' })` con un `BehaviorSubject<EnmPackId | null>`. La API pública es mínima:
```typescript
show(id: EnmPackId): void  // activa el overlay con el pack indicado
hide(): void               // oculta el overlay
enm$: Observable<EnmPackId | null>  // observable para el componente
```
El servicio es la única fuente de verdad sobre qué ENM está activa. Cualquier componente de la app (lecciones, ejercicios, conversaciones) puede activar o desactivar el overlay con una sola llamada, sin acoplamiento directo.

**3. Componente overlay (`EnmOverlayComponent`)**
Montado una única vez en `app.component.html`, escucha el `EnmService` y se renderiza solo cuando hay un pack activo. Implementa:
- **Drag**: `mousedown` en la cabecera inicia el arrastre; `mousemove` y `mouseup` a nivel de `document`. El movimiento está **restringido a la mitad izquierda de la pantalla** (`maxX = window.innerWidth / 2 - size.w`) para garantizar que el overlay nunca invade el panel de contenido ni tapa el texto de la lección.
- **Resize**: handle de esquina inferior derecha, con tamaño mínimo de 160×160px y máximo vinculado al límite de la mitad izquierda.
- **Minimizar**: colapsa el overlay a la cabecera sola, conservando posición y tamaño para cuando se expanda de nuevo.
- **Cerrar**: llama a `enmService.hide()`, que limpia el observable y destruye el contenido renderizado.

**4. Campo `enm` en la interfaz `Diapositiva`**
Se añadió un campo opcional `enm?: EnmPackId` a la interfaz de diapositiva del componente `Comunicacion`. Al navegar entre diapositivas (`siguiente()`, `anterior()`, `abrirSubBloque()`, `abrirBloque()`), el método privado `syncEnm()` comprueba si la diapositiva activa tiene ENM asociada y llama a `show()` o `hide()` en consecuencia:
```typescript
private syncEnm(): void {
  const enm = this.diapositiva?.enm;
  if (enm) { this.enmService.show(enm); }
  else { this.enmService.hide(); }
}
```
El overlay desaparece automáticamente al:
- Navegar a una diapositiva sin campo `enm`
- Pulsar "Siguiente bloque" o "Siguiente lección" (pantalla de portada de transición)
- Volver al índice o al subíndice
- Cambiar de ruta (gestionado en `app.component.ts` al detectar `NavigationEnd`)
- Destruirse el componente `Comunicacion` (`ngOnDestroy`)

### Gestión de assets
Los recursos visuales se almacenan en `frontend/public/enm/`. Angular 19 sirve el directorio `public/` como raíz de assets (configuración `angular.json`: `"input": "public", "output": "/assets"`), por lo que las rutas en el catálogo son relativas: `assets/enm/nombre-archivo.png`.

Separar los assets de ENM en una subcarpeta propia facilita su gestión futura: cuando un recurso de imagen sea sustituido por un vídeo animado, solo hay que añadir el archivo a `public/enm/` y actualizar el campo `video` del pack correspondiente en `enm-packs.data.ts`.

### Extensibilidad a otros componentes
El sistema está diseñado para usarse en cualquier parte de la app sin coste adicional. Para activar el overlay en un ejercicio de práctica de gramática, por ejemplo, basta con inyectar `EnmService` en ese componente y llamar a `show('pregunta-sin-particula')` cuando el ejercicio implique ese tipo gramatical. No hay que modificar el overlay ni el catálogo.

Los `EnmPackId` disponibles actualmente son:
- `'pregunta-sin-particula'` — cejas levantadas, inclinación hacia delante
- `'pregunta-con-particula'` — cejas fruncidas, nariz ligeramente arrugada
- `'negacion'` — cabeza de lado a lado
- `'afirmacion'` — cabeza asintiendo

Añadir un nuevo pack requiere únicamente: añadir el `id` al tipo `EnmPackId`, añadir el objeto al array `ENM_PACKS`, y colocar el asset en `public/enm/`.

### Decisiones de diseño descartadas

| Opción descartada | Motivo |
|---|---|
| Integrar la imagen directamente en el layout de la diapositiva | No funciona en ejercicios; requiere duplicar la lógica en cada componente |
| Añadir expresión facial al avatar 3D vía Blender | Fuera del alcance del TFG y del sistema de skin actual (WebAssembly) |
| Modal centrado en pantalla | Tapa el avatar, que es el elemento principal de la interacción |
| Panel fijo en una posición predeterminada | Reduce la flexibilidad; el usuario puede necesitar ver zonas concretas del avatar |
| Overlay sin restricción de zona | Podría invadir el panel de contenido y competir visualmente con el texto de la lección |