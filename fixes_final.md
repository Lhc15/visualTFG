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