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
<!-- Añadir nuevas secciones aquí siguiendo el mismo formato -->
<!-- Palabra clave: [NOMBRE_SECCION] en mayúsculas para Ctrl+F -->
