import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';

export interface BloquGramatica {
  id: string;
  nombre: string;
  subtitulo: string;
  icono: string;
  conceptos: string[];
  ejemplo: string;
  estado: 'completado' | 'activo' | 'bloqueado';
  estrellas: number;
  ejerciciosCompletados: number;
  totalEjercicios: number;
}

// IDs deben coincidir exactamente con los ids de comunicacion.component.ts
// y con los subBloques ids para los que tienen subíndice
const BLOQUES_GRAMATICA: Omit<BloquGramatica, 'estado' | 'estrellas' | 'ejerciciosCompletados'>[] = [
  {
    id: 'enm',
    nombre: 'ENM',
    subtitulo: 'Expresión No Manual',
    icono: 'E',
    totalEjercicios: 6,
    conceptos: [
      'Contacto visual imprescindible para comunicarse',
      'Postura corporal como marcador gramatical',
      'Cómo llamar la atención antes de signar',
    ],
    ejemplo: 'Cejas + postura + contacto visual'
  },
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
    subtitulo: 'Marcadores de sexo en LSE',
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
    id: 'presentaciones',
    nombre: 'Presentaciones',
    subtitulo: 'Presentarse en LSE',
    icono: 'P',
    totalEjercicios: 6,
    conceptos: [
      'Signo personal primero',
      'Luego nombre deletreado letra a letra',
      'YO PRESENTAR · MI SIGNO · LLAMARSE',
    ],
    ejemplo: 'YO · MI SIGNO · LLAMARSE A-N-A'
  },
  {
    id: 'verbos',
    nombre: 'Los verbos',
    subtitulo: 'Cómo funcionan en LSE',
    icono: 'V',
    totalEjercicios: 8,
    conceptos: [
      'Sin signos para SER, ESTAR ni HACER',
      'El verbo siempre cierra la frase',
      'Verbos direccionales: el movimiento indica quién',
    ],
    ejemplo: 'YO PIZZA COMER'
  },
  {
    id: 'tiempos',
    nombre: 'Tiempos verbales',
    subtitulo: 'Pasado, presente y futuro',
    icono: 'T',
    totalEjercicios: 6,
    conceptos: [
      'Sin conjugación — mismo signo para todos los tiempos',
      'Marcador temporal siempre al principio',
      'Varios marcadores: general → concreto',
    ],
    ejemplo: 'ANTES YO FUMAR MUCHO'
  },
  {
    id: 'negacion',
    nombre: 'La negación',
    subtitulo: 'Cómo negar en LSE',
    icono: 'N',
    totalEjercicios: 6,
    conceptos: [
      'NO va después del verbo, nunca antes',
      'Movimiento de cabeza de lado a lado',
      'Algunos verbos incorporan la negación',
    ],
    ejemplo: 'NOSOTROS CHOCOLATE COMPRAR NO'
  },
  {
    id: 'plural',
    nombre: 'Singular y plural',
    subtitulo: 'Cómo se indica el número',
    icono: '+',
    totalEjercicios: 4,
    conceptos: [
      'El contexto indica si es singular o plural',
      'Números y cuantificadores lo hacen explícito',
      'Algunos signos se repiten con desplazamiento (++)',
    ],
    ejemplo: 'TÚ HIJO TRES'
  },
  {
    id: 'adverbios',
    nombre: 'Los adverbios',
    subtitulo: 'Cómo y dónde se colocan',
    icono: 'A',
    totalEjercicios: 6,
    conceptos: [
      'Después del verbo o adjetivo al que acompañan',
      'Tiempo y lugar: al inicio si afectan toda la frase',
      'Al final si solo afectan a una parte',
    ],
    ejemplo: 'TÚ ESCRIBIR REGULAR'
  },
  {
    id: 'intensidad',
    nombre: 'Intensidad y énfasis',
    subtitulo: 'Graduar el significado',
    icono: '!',
    totalEjercicios: 6,
    conceptos: [
      'Expresión facial + amplitud del movimiento',
      'Énfasis positivo: dientes apretados',
      'Énfasis negativo: carrillos inflados',
    ],
    ejemplo: 'ÉL COMER-MUCHÍSIMO'
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
  esAdmin = false;
  cargando = true;

  readonly shifts = ['shift-r','shift-l','shift-r','shift-l','shift-r',
                     'shift-r','shift-l','shift-r','shift-l','shift-r','shift-l'];

  constructor(
    private router: Router,
    private usuariosService: UsuariosService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        this.esAdmin = resp.usuario?.rol === 'ROL_ADMIN';
        if (this.esAdmin) {
          this.construirBloques(new Set(BLOQUES_GRAMATICA.map(b => b.id)));
        } else {
          this.statsService.getProgresoComunicacion().subscribe({
            next: (completados) => {
              this.construirBloques(new Set(completados.map(c => c.bloqueId)));
            },
            error: () => this.construirBloques(new Set())
          });
        }
      },
      error: () => this.construirBloques(new Set())
    });
  }

  private construirBloques(completados: Set<string>): void {
    this.bloques = BLOQUES_GRAMATICA.map((b, idx) => {
      const desbloqueado = this.esAdmin || idx === 0 || completados.has(BLOQUES_GRAMATICA[idx - 1].id);
      const estaCompletado = completados.has(b.id);
      const estado: 'completado' | 'activo' | 'bloqueado' =
        !desbloqueado ? 'bloqueado' :
        estaCompletado ? 'completado' : 'activo';
      const ejerciciosCompletados = estaCompletado ? b.totalEjercicios : 0;
      return {
        ...b,
        estado,
        ejerciciosCompletados,
        estrellas: this.calcularEstrellas(ejerciciosCompletados, b.totalEjercicios, estado)
      };
    });
    this.bloqueActivo = this.bloques.find(b => b.estado === 'activo')
      ?? this.bloques.find(b => b.estado === 'completado')
      ?? this.bloques[0];
    this.cargando = false;
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

  irATeoria(): void {
    this.router.navigate(['/aprende/comunicacion']);
  }

  volver(): void { this.router.navigate(['/practica']); }
}