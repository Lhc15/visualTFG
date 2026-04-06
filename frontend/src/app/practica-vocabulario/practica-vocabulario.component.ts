import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import { PalabrasService } from '../services/palabras.service';

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

  readonly shifts = ['shift-r', 'shift-l', 'shift-r', 'shift-l', 'shift-r', 'shift-l',
                     'shift-r', 'shift-l', 'shift-r', 'shift-l', 'shift-r', 'shift-l'];

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private palabrasService: PalabrasService
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();
  }

  private cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (cats: any[]) => {
        // Filtrar SOLO las de modulo vocabulario — las que crea el admin con ese modulo
        // Sin reordenar: se respeta el orden de insercion en MongoDB,
        // que es el mismo que usa Aprende, garantizando coherencia entre secciones.
        const vocab = cats.filter((c: any) => c.modulo === 'vocabulario');

        if (vocab.length === 0) {
          this.cargando = false;
          return;
        }

        // Cargar palabras de cada categoria para obtener los nombres reales
        // Usamos forkJoin para esperar todas las peticiones
        const peticiones = vocab.map((cat: any) =>
          this.categoriasService.obtenerPalabrasPorCategoria(cat._id).toPromise()
            .then((palabras: any[]) => palabras ?? [])
            .catch(() => [])
        );

        Promise.all(peticiones).then((resultados: any[][]) => {
          this.categorias = vocab.map((cat: any, idx: number) => {
            const palabrasDeCat: any[] = resultados[idx] ?? [];
            const total = palabrasDeCat.length;
            // Por ahora palabrasEstudiadas = 0, se conectará al sistema
            // de desbloqueo cuando esté implementado (PracticaEntry)
            const estudiadas = 0;
            const estado = this.calcularEstado(idx, estudiadas, total);
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

          // La primera categoria siempre activa (desbloqueo real viene después)
          if (this.categorias.length > 0 && this.categorias[0].estado === 'bloqueado') {
            this.categorias[0] = { ...this.categorias[0], estado: 'activo' };
          }

          this.categoriaActiva = this.categorias.find(c => c.estado === 'activo')
            ?? this.categorias.find(c => c.estado === 'completado')
            ?? this.categorias[0]
            ?? null;

          this.cargando = false;
        });
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  private calcularEstado(idx: number, estudiadas: number, total: number): 'completado' | 'activo' | 'bloqueado' {
    if (idx === 0) return estudiadas >= total && total > 0 ? 'completado' : 'activo';
    const anterior = this.categorias[idx - 1];
    if (!anterior) return 'bloqueado';
    if (anterior.estado === 'completado' || anterior.palabrasEstudiadas > 0) {
      return estudiadas >= total && total > 0 ? 'completado' : 'activo';
    }
    return 'bloqueado';
  }

  private calcularEstrellas(estudiadas: number, total: number, estado: string): number {
    if (estado === 'bloqueado' || total === 0) return 0;
    const pct = total > 0 ? estudiadas / total : 0;
    if (pct >= 1)   return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
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