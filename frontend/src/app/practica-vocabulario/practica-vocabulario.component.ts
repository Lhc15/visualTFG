import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import { PalabrasService } from '../services/palabras.service';
import { ProgresoVocabularioService } from '../services/progreso-vocabulario.service';
import { UsuariosService } from '../services/usuarios.service';

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
  imports: [CommonModule],
  templateUrl: './practica-vocabulario.component.html',
  styleUrl: './practica-vocabulario.component.css'
})
export class PracticaVocabularioComponent implements OnInit {

  categorias: CategoriaNodo[] = [];
  categoriaActiva: CategoriaNodo | null = null;
  cargando = true;
  private categoriasCompletadas = new Set<string>();
  private userId = '';

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private palabrasService: PalabrasService,
    private progresoVocabService: ProgresoVocabularioService,
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
    // Cargamos progreso real y categorías en paralelo
    Promise.all([
      this.progresoVocabService.obtenerProgreso('vocabulario').toPromise().then(v => v ?? []).catch(() => [] as string[]),
      this.categoriasService.obtenerCategorias().toPromise().then(c => c ?? []).catch(() => [])
    ]).then(([vistas, cats]) => {
      const vocab = (cats as any[]).filter((c: any) => c.modulo === 'vocabulario');
      const palabrasVistas = new Set<string>(vistas as string[]);

      if (vocab.length === 0) {
        this.cargando = false;
        return;
      }

      const peticiones = vocab.map((cat: any) =>
        this.categoriasService.obtenerPalabrasPorCategoria(cat._id).toPromise()
          .then((palabras: any) => palabras ?? [])
          .catch(() => [])
      );

      Promise.all(peticiones).then((resultados: any[][]) => {
        this.categorias = vocab.map((cat: any, idx: number) => {
          const palabrasDeCat: any[] = resultados[idx] ?? [];
          const total = palabrasDeCat.length;
          // Cuenta cuántas palabras de esta categoría ha reproducido el usuario
          const estudiadas = palabrasDeCat.filter((p: any) => palabrasVistas.has(p._id?.toString())).length;
            const estado = this.calcularEstado(idx, cat._id, estudiadas, total);
            const estrellas = this.calcularEstrellas(estudiadas, total, estado);

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

  private calcularEstrellas(estudiadas: number, total: number, estado: string): number {
    if (estado === 'bloqueado' || total === 0) return 0;
    const pct = total > 0 ? estudiadas / total : 0;
    if (pct >= 1)   return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
  }

  get categoriasDesbloqueadas(): CategoriaNodo[] {
    return this.categorias.filter(c => c.estado !== 'bloqueado');
  }

  get categoriasBloqueadas(): CategoriaNodo[] {
    return this.categorias.filter(c => c.estado === 'bloqueado');
  }

  seleccionarCategoria(cat: CategoriaNodo): void {
    if (cat.estado === 'bloqueado') return;
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