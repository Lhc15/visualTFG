import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import { PalabrasService } from '../services/palabras.service';
import { ProgresoVocabularioService } from '../services/progreso-vocabulario.service';
import { ProgresoEjercicioService, RegistroEjercicio } from '../services/progreso-ejercicio.service';
import { UsuariosService } from '../services/usuarios.service';
import { HeaderComponent } from '../header/header.component';

export interface CategoriaNodo {
  id: string;
  nombre: string;
  totalPalabras: number;
  palabrasEstudiadas: number;
  estado: 'completado' | 'activo' | 'bloqueado';
  estrellas: number;
  palabras: string[];
  icono: string;
}

@Component({
  selector: 'app-practica-vocabulario',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './practica-vocabulario.component.html',
  styleUrl: './practica-vocabulario.component.css'
})
export class PracticaVocabularioComponent implements OnInit {

  categorias: CategoriaNodo[] = [];
  categoriaActiva: CategoriaNodo | null = null;
  cargando = true;

  // ── Modo Global ────────────────────────────────────────────
  modoGlobalActivo = false; // true cuando el nodo global está seleccionado
  globalCatsSeleccionadas = new Set<string>(); // IDs de categorías seleccionadas
  globalModoForzado: 'A' | 'B' | 'ambos' = 'ambos';
  globalTodo = true;
  globalCatsAbierto = false;
  globalModoAbierto = false; // checkbox "seleccionar todo"
  private categoriasCompletadas = new Set<string>();
  private userId = '';

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private palabrasService: PalabrasService,
    private progresoVocabService: ProgresoVocabularioService,
    private progresoEjercicioService: ProgresoEjercicioService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        this.userId = resp.usuario.uid;
        const guardadas = localStorage.getItem(`vv_cats_completadas_${this.userId}`);
        if (guardadas) this.categoriasCompletadas = new Set(JSON.parse(guardadas));
        this.cargarCategorias();
      },
      error: () => { this.cargarCategorias(); }
    });
  }

  private cargarCategorias(): void {
    // Cargamos categorías, progreso vocabulario y progreso ejercicios en paralelo
    Promise.all([
      this.progresoVocabService.obtenerProgreso('vocabulario').toPromise().then(v => v ?? []).catch(() => [] as string[]),
      this.categoriasService.obtenerCategorias().toPromise().then(c => c ?? []).catch(() => [])
    ]).then(([vistas, cats]) => {
      const vocab = (cats as any[]).filter((c: any) => c.modulo === 'vocabulario');
      const palabrasVistas = new Set<string>(vistas as string[]);

      if (vocab.length === 0) { this.cargando = false; return; }

      // Cargar palabras de cada categoría + historial de ejercicios de cada categoría
      const peticionesPalabras = vocab.map((cat: any) =>
        this.categoriasService.obtenerPalabrasPorCategoria(cat._id).toPromise()
          .then((p: any) => p ?? []).catch(() => [])
      );
      const peticionesEjercicio = vocab.map((cat: any) =>
        this.progresoEjercicioService.obtenerProgreso(cat._id).toPromise()
          .then((r: any) => r ?? []).catch(() => [] as RegistroEjercicio[])
      );

      Promise.all([Promise.all(peticionesPalabras), Promise.all(peticionesEjercicio)])
        .then(([resultadosPalabras, resultadosEjercicio]: [any[][], RegistroEjercicio[][]]) => {
        this.categorias = vocab.map((cat: any, idx: number) => {
          const palabrasDeCat: any[] = resultadosPalabras[idx] ?? [];
          const registros: RegistroEjercicio[] = resultadosEjercicio[idx] ?? [];
          const total = palabrasDeCat.length;
          const estudiadas = palabrasDeCat.filter((p: any) => palabrasVistas.has(p._id?.toString())).length;
          const estado = this.calcularEstado(idx, cat._id, estudiadas, total);
          const estrellas = this.calcularEstrellas(registros);

          return {
            id: cat._id,
            nombre: cat.nombre,
            totalPalabras: total,
            palabrasEstudiadas: estudiadas,
            estado,
            estrellas,
            palabras: palabrasDeCat.map((p: any) => p.palabra ?? ''),
            icono: cat.nombre?.[0]?.toUpperCase() ?? '?'
          } as CategoriaNodo;
        });

        this.categoriaActiva = this.categorias.find(c => c.estado === 'activo')
          ?? this.categorias.find(c => c.estado === 'completado')
          ?? this.categorias[0]
          ?? null;

        this.cargando = false;
      });
    }).catch(() => { this.cargando = false; });
  }

  private calcularEstado(idx: number, catId: string, estudiadas: number, total: number): 'completado' | 'activo' | 'bloqueado' {
    // Una categoría está completada si el usuario la completó en Aprende
    const estaCompletada = this.categoriasCompletadas.has(catId);
    if (estaCompletada) return 'completado';
    // La primera siempre activa
    if (idx === 0) return 'activo';
    // Las siguientes: activas si la anterior está completada
    const anterior = this.categorias[idx - 1];
    if (!anterior) return 'bloqueado';
    return anterior.estado === 'completado' ? 'activo' : 'bloqueado';
  }

  // Estrellas basadas en media de aciertos en ejercicios:
  // 0 = sin historial o <40% · 1 = 40–59% · 2 = 60–79% · 3 = ≥80%
  private calcularEstrellas(registros: RegistroEjercicio[]): number {
    if (!registros || registros.length === 0) return 0;
    const total = registros.reduce((s, r) => s + r.vecesAcertada + r.vecesFallada, 0);
    if (total === 0) return 0;
    const aciertos = registros.reduce((s, r) => s + r.vecesAcertada, 0);
    const pct = aciertos / total;
    if (pct >= 0.8) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  }

  get categoriasDesbloqueadas(): CategoriaNodo[] {
    return this.categorias.filter(c => c.estado !== 'bloqueado');
  }

  get categoriasBloqueadas(): CategoriaNodo[] {
    return this.categorias.filter(c => c.estado === 'bloqueado');
  }

  seleccionarModoGlobal(): void {
    this.categoriaActiva = null;
    this.modoGlobalActivo = true;
    // Por defecto seleccionar todas las desbloqueadas
    this.globalCatsSeleccionadas = new Set(this.categoriasDesbloqueadas.map(c => c.id));
    this.globalTodo = true;
  }

  toggleGlobalTodo(): void {
    this.globalTodo = !this.globalTodo;
    if (this.globalTodo) {
      this.globalCatsSeleccionadas = new Set(this.categoriasDesbloqueadas.map(c => c.id));
    } else {
      this.globalCatsSeleccionadas.clear();
    }
  }

  toggleGlobalCat(id: string): void {
    if (this.globalCatsSeleccionadas.has(id)) {
      this.globalCatsSeleccionadas.delete(id);
    } else {
      this.globalCatsSeleccionadas.add(id);
    }
    this.globalTodo = this.globalCatsSeleccionadas.size === this.categoriasDesbloqueadas.length;
  }

  empezarGlobal(): void {
    if (this.globalCatsSeleccionadas.size === 0) return;
    const cats = [...this.globalCatsSeleccionadas].join(',');
    this.router.navigate(['/practica/vocabulario/global'], {
      queryParams: { cats, modo: this.globalModoForzado }
    });
  }

  seleccionarCategoria(cat: CategoriaNodo): void {
    if (cat.estado === 'bloqueado') return;
    this.modoGlobalActivo = false;
    this.categoriaActiva = cat;
  }

  irAPracticar(): void {
    if (!this.categoriaActiva || this.categoriaActiva.estado === 'bloqueado') return;
    this.router.navigate(['/practica/vocabulario', this.categoriaActiva.id]);
  }

  get progresoPct(): number {
    if (!this.categoriaActiva || this.categoriaActiva.totalPalabras === 0) return 0;
    return Math.round((this.categoriaActiva.palabrasEstudiadas / this.categoriaActiva.totalPalabras) * 100);
  }

  get palabrasPreview(): { nombre: string; estado: 'aprendida' | 'vista' | 'bloqueada' }[] {
    if (!this.categoriaActiva) return [];
    return this.categoriaActiva.palabras.map((p, i) => ({
      nombre: p,
      estado: i < this.categoriaActiva!.palabrasEstudiadas
        ? 'aprendida'
        : i < this.categoriaActiva!.palabrasEstudiadas + 2
          ? 'vista'
          : 'bloqueada'
    }));
  }

  trackById(_: number, cat: CategoriaNodo): string { return cat.id; }

  volver(): void { this.router.navigate(['/practica']); }
}