import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { HeaderComponent } from '../header/header.component';

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
];

@Component({
  selector: 'app-practica-gramatica',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
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

  // ── Chip de desbloqueo ──
  chipVisible = false;
  chipTexto = '';
  private chipTimer: any = null;

  constructor(
    private router: Router,
    private usuariosService: UsuariosService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        this.esAdmin = resp.usuario?.rol === 'ROL_ADMIN';
        const uid = resp.usuario.uid;
        if (this.esAdmin) {
          const todos = new Set(BLOQUES_GRAMATICA.map(b => b.id));
          this.construirBloques(todos, todos);
        } else {
          this.statsService.getProgresoComunicacion().subscribe({
            next: (completados) => {
              const set = new Set(completados.map(c => c.bloqueId));
              this.construirBloques(set, set);
            },
            error: () => this.construirBloques(new Set(), new Set())
          });
          setTimeout(() => this.consumirChipsPendientes(uid), 700);
        }
      },
      error: () => this.construirBloques(new Set(), new Set())
    });
  }

  private consumirChipsPendientes(uid: string): void {
    const key = `vv_gram_chips_pendientes_${uid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const pendientes: string[] = JSON.parse(raw);
    if (!pendientes.length) return;
    localStorage.removeItem(key);
    this.lanzarConfeti();
    this.mostrarChipsEnCola(pendientes);
  }

  private mostrarChipsEnCola(textos: string[], idx = 0): void {
    if (idx >= textos.length) return;
    this.mostrarChip(textos[idx]);
    setTimeout(() => this.mostrarChipsEnCola(textos, idx + 1), 5000);
  }

  private mostrarChip(texto: string): void {
    if (this.chipTimer) clearTimeout(this.chipTimer);
    this.chipTexto = texto;
    this.chipVisible = true;
    this.chipTimer = setTimeout(() => { this.chipVisible = false; }, 4500);
  }

  private lanzarConfeti(): void {
    if (typeof (window as any).confetti === 'undefined') return;
    const confetti = (window as any).confetti;
    const colores = ['#E04A1A', '#F4A940', '#1C0E0A', '#F9F6F3', '#F0997B'];
    const base = { spread: 70, colors: colores, gravity: 1.1, scalar: 1.1, ticks: 350 };
    confetti({ ...base, particleCount: 100, angle: 60, startVelocity: 55, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, particleCount: 100, angle: 120, startVelocity: 55, origin: { x: 1, y: 0.65 } });
    setTimeout(() => {
      confetti({ ...base, particleCount: 60, angle: 70, startVelocity: 45, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 60, angle: 110, startVelocity: 45, origin: { x: 1, y: 0.7 } });
    }, 500);
  }

  private construirBloques(completadosComunicacion: Set<string>, completadosPractica: Set<string>): void {
    this.bloques = BLOQUES_GRAMATICA.map((b, idx) => {
      // El nodo de práctica N se desbloquea cuando el bloque teórico N de Comunicación está completado
      // (el primero —ENM— siempre desbloqueado si Comunicación está desbloqueada para el usuario)
      const desbloqueado = this.esAdmin || completadosComunicacion.has(b.id);
      const estaCompletado = completadosPractica.has(b.id);
      const estado: 'completado' | 'activo' | 'bloqueado' =
        !desbloqueado ? 'bloqueado' :
        estaCompletado ? 'completado' : 'activo';
      const ejerciciosCompletados = estaCompletado ? b.totalEjercicios : 0;
      return {
        ...b,
        estado,
        ejerciciosCompletados,
        estrellas: this.calcularEstrellas(estado)
      };
    });
    this.bloqueActivo = this.bloques.find(b => b.estado === 'activo')
      ?? this.bloques.find(b => b.estado === 'completado')
      ?? this.bloques[0];
    this.cargando = false;
  }

  private calcularEstrellas(estado: string): number {
    return estado === 'completado' ? 3 : 0;
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