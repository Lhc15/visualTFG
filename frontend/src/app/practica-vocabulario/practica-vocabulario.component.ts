import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import { UsuariosService } from '../services/usuarios.service';

export interface CategoriaNodo {
  id: string;
  nombre: string;
  totalPalabras: number;
  palabrasEstudiadas: number;
  estado: 'completado' | 'activo' | 'bloqueado';
  estrellas: number; // 0-3
  palabras: string[]; // nombres de palabras para preview
  icono: string;     // inicial o emoji placeholder
}

// Iconos por nombre de categoría (fallback a inicial)
const ICONOS: Record<string, string> = {
  'saludos': 'S',
  'colores': 'C',
  'familia': 'F',
  'comida': 'A',
  'números': 'N',
  'animales': 'Z',
  'ropa': 'R',
  'cuerpo': 'B',
  'tiempo': 'T',
  'profesiones': 'P',
};

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

  // Posiciones alternas del zigzag
  readonly shifts = ['shift-r', 'shift-l', 'shift-r', 'shift-l', 'shift-r', 'shift-l'];

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();
  }

  private cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (cats: any[]) => {
        // Filtrar solo las de vocabulario
        const vocab = cats.filter((c: any) =>
          !c.modulo || c.modulo === 'vocabulario'
        );

        // Construir nodos con datos simulados de progreso
        // En una implementación completa esto vendría del backend con las palabras jugadas
        this.categorias = vocab.map((cat: any, idx: number) => {
          const total = cat.totalPalabras ?? Math.floor(Math.random() * 5) + 4;
          const estudiadas = idx === 0 ? total : idx === 1 ? Math.floor(total * 0.5) : 0;
          const estado = this.calcularEstado(idx, estudiadas, total);
          const estrellas = this.calcularEstrellas(estudiadas, total, estado);
          return {
            id: cat._id,
            nombre: cat.nombre,
            totalPalabras: total,
            palabrasEstudiadas: estudiadas,
            estado,
            estrellas,
            palabras: cat.palabrasPreview ?? [],
            icono: ICONOS[cat.nombre?.toLowerCase()] ?? cat.nombre?.[0]?.toUpperCase() ?? '?'
          } as CategoriaNodo;
        });

        // Seleccionar la categoría activa por defecto
        this.categoriaActiva = this.categorias.find(c => c.estado === 'activo')
          ?? this.categorias.find(c => c.estado === 'completado')
          ?? this.categorias[0]
          ?? null;

        this.cargando = false;
      },
      error: () => {
        // Datos de ejemplo si falla la carga
        this.categorias = this.categoriasEjemplo();
        this.categoriaActiva = this.categorias.find(c => c.estado === 'activo') ?? null;
        this.cargando = false;
      }
    });
  }

  private calcularEstado(idx: number, estudiadas: number, total: number): 'completado' | 'activo' | 'bloqueado' {
    if (idx === 0 && estudiadas >= total) return 'completado';
    if (idx === 0) return 'activo';
    // Una categoría se desbloquea si la anterior está al menos iniciada
    const anterior = this.categorias[idx - 1];
    if (!anterior) return 'bloqueado';
    if (anterior.estado === 'completado' || anterior.palabrasEstudiadas > 0) {
      return estudiadas >= total ? 'completado' : 'activo';
    }
    return 'bloqueado';
  }

  private calcularEstrellas(estudiadas: number, total: number, estado: string): number {
    if (estado === 'bloqueado' || total === 0) return 0;
    const pct = estudiadas / total;
    if (pct >= 1) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
  }

  private categoriasEjemplo(): CategoriaNodo[] {
    return [
      { id: '1', nombre: 'Saludos', totalPalabras: 6, palabrasEstudiadas: 6, estado: 'completado', estrellas: 3, palabras: ['hola', 'adios', 'gracias', 'por favor', 'buenos dias', 'buenas noches'], icono: 'S' },
      { id: '2', nombre: 'Colores', totalPalabras: 8, palabrasEstudiadas: 4, estado: 'activo', estrellas: 2, palabras: ['rojo', 'azul', 'verde', 'amarillo', 'blanco', 'negro', 'naranja', 'marron'], icono: 'C' },
      { id: '3', nombre: 'Familia', totalPalabras: 7, palabrasEstudiadas: 0, estado: 'bloqueado', estrellas: 0, palabras: [], icono: 'F' },
      { id: '4', nombre: 'Comida', totalPalabras: 9, palabrasEstudiadas: 0, estado: 'bloqueado', estrellas: 0, palabras: [], icono: 'A' },
      { id: '5', nombre: 'Numeros', totalPalabras: 10, palabrasEstudiadas: 0, estado: 'bloqueado', estrellas: 0, palabras: [], icono: 'N' },
    ];
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