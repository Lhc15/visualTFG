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
// Valores posibles: "S", "O", "V", "ADJ", "INT", "FX"
// Array porque una palabra puede tener varios roles (ej. BIEN → ["ADJ", "FX"])

enMotor: { type: Boolean, default: false }
// Flag operativo: true solo cuando la animación Blender está lista
// Permite clasificar la palabra sin que entre en el generador hasta estar completa
```

**`Categoria`** — se añade un campo:
```javascript
modulo: { type: String, enum: ['abecedario', 'vocabulario', 'gramatica'] }
// Permite separar qué categorías pertenecen a cada sección de la app
```

### Modelos nuevos

**`PracticaSession`** — una sesión de práctica completa:
```javascript
{
  userId:      ObjectId ref Usuario   // quién la hizo
  tipo:        String enum ['abecedario', 'vocabulario', 'gramatica']
  startedAt:   Date
  finishedAt:  Date
  total:       Number                 // preguntas totales
  correctas:   Number
  incorrectas: Number
}
```

**`PracticaEntry`** — un intento individual dentro de una sesión:
```javascript
{
  userId:         ObjectId ref Usuario
  sessionId:      ObjectId ref PracticaSession
  palabraId:      ObjectId ref Palabra   // null si es gramática (frase generada)
  tipo:           String enum ['abecedario', 'vocabulario', 'gramatica']
  acierto:        Boolean
  tiempoMs:       Number
  createdAt:      Date
  // Solo para gramática:
  fraseGenerada:  [String]   // ej. ["TU", "CASA", "VIVIR"]
  estructuraUsada: String    // "SOV" | "SOV-INT" | "SV-ENM"
}
```

### Rutas nuevas necesarias
```
POST  /api/practica/session         → crear sesión al empezar
PATCH /api/practica/session/:id     → cerrar sesión (finishedAt + totales)
POST  /api/practica/entry           → guardar cada intento individual
GET   /api/practica/stats/:userId   → estadísticas para la página de perfil
GET   /api/palabras/motor           → palabras con enMotor: true (para el generador)
```

---

## [ORDEN_IMPLEMENTACION] Plan de implementación por fases

El orden está dictado por dependencias: la práctica define qué necesita el backend, y el backend tiene que estar antes que el frontend que lo consume.

```
Fase 1 — Backend base
  1a. Modificar modelo Palabra (+ tiposLexicos, enMotor)
  1b. Modificar modelo Categoria (+ modulo)
  1c. Crear modelos PracticaSession y PracticaEntry
  1d. Crear controladores y rutas de practica
  1e. Eliminar modelos/rutas obsoletos (Stats, ExamenSession, VersusSession...)

Fase 2 — Admin panel
  2a. Añadir checkboxes tiposLexicos al editor de palabras
  2b. Añadir toggle enMotor al editor de palabras
  2c. Añadir selector modulo al editor de categorías
  2d. Etiquetar palabras existentes en BD real

Fase 3 — Aprende
  3a. Componente /aprende (índice con 2 cards)
  3b. Componente /aprende/vocabulario (reemplaza modo-libre)
  3c. Componente /aprende/gramatica (contenido teórico estático)

Fase 4 — Practica
  4a. Componente /practica (selector de 3 submodos)
  4b. Componente /practica/abecedario
  4c. Componente /practica/vocabulario
  4d. Componente /practica/gramatica (motor S-O-V)

Fase 5 — Cierre
  5a. Adaptar /perfil a las nuevas estadísticas (PracticaSession)
  5b. Actualizar modos2 con las 4 cards nuevas
  5c. Eliminar componentes obsoletos (modo-libre, modo-guiado, modo-examen, modo-versus)
```

### Decisiones de diseño pendientes
- Mecánica exacta de Practica/gramática: ¿el usuario ve la frase en español y la ordena en LSE, o al revés? (pendiente de decidir)
- ¿Conversamos? con backend real: se retoma en fase posterior, no bloquea nada

---
<!-- Añadir nuevas secciones aquí siguiendo el mismo formato -->
<!-- Palabra clave: [NOMBRE_SECCION] en mayúsculas para Ctrl+F -->
