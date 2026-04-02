import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';

export interface BloquGramatica {
  id: string;
  nombre: string;
  subtitulo: string;
  icono: string;
  conceptos: string[];         // lista de conceptos que cubre
  ejemplo: string;             // ejemplo de frase LSE
  estado: 'completado' | 'activo' | 'bloqueado';
  estrellas: number;           // 0-3
  ejerciciosCompletados: number;
  totalEjercicios: number;
}

// Los 5 bloques gramaticales del curso SIGNOcampus básico
const BLOQUES_GRAMATICA: Omit<BloquGramatica, 'estado' | 'estrellas' | 'ejerciciosCompletados'>[] = [
  {
    id: 'sov',
    nombre: 'Orden S·O·V',
    subtitulo: 'Sujeto · Objeto · Verbo',
    icono: 'S',
    totalEjercicios: 10,
    conceptos: [
      'El verbo va siempre al final',
      'Sujeto primero, objeto después',
      'Diferente al español (S-V-O)',
    ],
    ejemplo: 'TÚ PUERTA COMPRAR'
  },
  {
    id: 'preguntas',
    nombre: 'Preguntas',
    subtitulo: 'Interrogativas en LSE',
    icono: '?',
    totalEjercicios: 8,
    conceptos: [
      'Sí/No: mismo orden S-O-V, cejas altas',
      'Con partícula: la partícula va al final',
      'Cejas juntas para preguntas con partícula',
    ],
    ejemplo: 'TÚ VIVIR DÓNDE'
  },
  {
    id: 'genero',
    nombre: 'Género',
    subtitulo: 'Marcadores de sexo',
    icono: 'G',
    totalEjercicios: 6,
    conceptos: [
      'LSE no tiene morfema de género',
      'HOMBRE o MUJER se añaden al sustantivo',
      'MADRE y PADRE tienen signo propio',
    ],
    ejemplo: 'AMIGO + HOMBRE'
  },
  {
    id: 'enm',
    nombre: 'ENM',
    subtitulo: 'Expresión No Manual',
    icono: 'E',
    totalEjercicios: 6,
    conceptos: [
      'Cara, mirada y postura corporal',
      'Tan importante como el signo manual',
      'Contacto visual con el interlocutor',
    ],
    ejemplo: 'Cejas + postura corporal'
  },
  {
    id: 'presentaciones',
    nombre: 'Presentaciones',
    subtitulo: 'Presentarse en LSE',
    icono: 'P',
    totalEjercicios: 6,
    conceptos: [
      'Signo personal primero',
      'Luego nombre deletreado letra a letra',
      'YO PRESENTAR · LLAMARSE + nombre',
    ],
    ejemplo: 'YO · MI SIGNO · LLAMARSE'
  },
];

@Component({
  selector: 'app-practica-gramatica',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './practica-gramatica.component.html',
  styleUrl: './practica-gramatica.component.css'
})
export class PracticaGramaticaComponent implements OnInit {

  bloques: BloquGramatica[] = [];
  bloqueActivo: BloquGramatica | null = null;

  readonly shifts = ['shift-r', 'shift-l', 'shift-r', 'shift-l', 'shift-r'];

  constructor(
    private router: Router,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.cargarBloques();
  }

  private cargarBloques(): void {
    // Construir bloques con progreso simulado
    // En implementación real, el backend devolvería los PracticaEntry de gramática del usuario
    this.bloques = BLOQUES_GRAMATICA.map((b, idx) => {
      const ejerciciosCompletados = idx === 0 ? b.totalEjercicios : idx === 1 ? 4 : 0;
      const estado = this.calcularEstado(idx, ejerciciosCompletados, b.totalEjercicios);
      return {
        ...b,
        ejerciciosCompletados,
        estado,
        estrellas: this.calcularEstrellas(ejerciciosCompletados, b.totalEjercicios, estado)
      };
    });

    this.bloqueActivo = this.bloques.find(b => b.estado === 'activo')
      ?? this.bloques.find(b => b.estado === 'completado')
      ?? this.bloques[0];
  }

  private calcularEstado(idx: number, completados: number, total: number): 'completado' | 'activo' | 'bloqueado' {
    if (idx === 0) return completados >= total ? 'completado' : 'activo';
    const anterior = this.bloques[idx - 1];
    if (!anterior) return 'bloqueado';
    if (anterior.estado === 'completado' || anterior.ejerciciosCompletados > 0) {
      return completados >= total ? 'completado' : 'activo';
    }
    return 'bloqueado';
  }

  private calcularEstrellas(completados: number, total: number, estado: string): number {
    if (estado === 'bloqueado' || total === 0) return 0;
    const pct = completados / total;
    if (pct >= 1) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
  }

  seleccionarBloque(bloque: BloquGramatica): void {
    if (bloque.estado === 'bloqueado') return;
    this.bloqueActivo = bloque;
  }

  irAPracticar(): void {
    if (!this.bloqueActivo || this.bloqueActivo.estado === 'bloqueado') return;
    this.router.navigate(['/practica/gramatica', this.bloqueActivo.id]);
  }

  get progresoPct(): number {
    if (!this.bloqueActivo || this.bloqueActivo.totalEjercicios === 0) return 0;
    return Math.round((this.bloqueActivo.ejerciciosCompletados / this.bloqueActivo.totalEjercicios) * 100);
  }

  trackById(_: number, b: BloquGramatica): string { return b.id; }

  volver(): void { this.router.navigate(['/practica']); }
}