import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { UsuariosService } from '../services/usuarios.service';
import { PalabrasService } from '../services/palabras.service';
import { ExploredWordsService } from '../services/explored_word.service';
import { HeaderComponent } from '../header/header.component';
import { StatsService } from '../services/stats.service';
import { CategoriasService } from '../services/categorias.service';

const MODES = [
  {
    id: 'guiado',
    icon: 'assets/aprende.png',
    name: 'APRENDE',
    description: 'paso a paso estructuradamente',
    route: '/guiado',
  },
  {
    id: 'libre',
    icon: 'assets/explora.png',
    name: 'EXPLORA',
    description: 'y practica a tu propio ritmo',
    route: '/libre',
  },
  {
    id: 'examen',
    icon: 'assets/retate.png',
    name: 'RÉTATE',
    description: 'poniendo a prueba tus conocimientos',
    route: '/modos',
  },
];

@Component({
  standalone: true,
  selector: 'app-mode-selector',
  templateUrl: './modos.component.html',
  styleUrls: ['./modos.component.css'],
  imports: [CommonModule, CanvasComponent, HeaderComponent],
})
export class ModosComponent implements OnInit, OnDestroy {
  modes = MODES;
  currentAnimationUrls: string[] = [];

  // Modo GUIADO
  isNewUserInGuidedMode = true;
  animatedProgress = 0;
  progressPercent = 0;
  maxWords = 4;
  userLevel = 1;
  nextLevel: number | null = null;
  lastWordLearned: string = 'Adántrate aprendiendo nuevas palabras';

  // Modo LIBRE
  totalWords = 0;
  exploredCount = 0;
  animatedProgressColor = 'custom-purple';
  timeInvested: string = '0 mins';
  favoriteCategory: string = 'Categoría por determinar';

  // Propiedades adicionales para LIBRE
  mostExploredCategoryName: string | null = null;
  mostExploredCategoryCount: number | null = null;
  tiempoLibreMs: number = 0;
  categoriaSugerida: any = null;
  currentStatsId: string | null = null;

  private refreshInterval: any;

  constructor(
    private router: Router,
    private usuariosService: UsuariosService,
    private palabrasService: PalabrasService,
    private exploredWordsService: ExploredWordsService,
    private statsService: StatsService,
    private categoriasService: CategoriasService
  ) {}

  ngOnInit(): void {
    // Obtener datos del usuario
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        const user = resp.usuario;

        // --- Modo GUIADO ---
        this.isNewUserInGuidedMode =
          user.currentWordIndex === undefined || user.currentWordIndex < 0;
        if (this.isNewUserInGuidedMode) {
          this.animateProgress();
        } else {
          this.progressPercent = Math.floor(
            ((user.currentWordIndex + 1) / this.maxWords) * 100
          );
        }
        // Usar user.nivel o user.currentLevel (o 1 por defecto)
        this.userLevel = user.nivel || user.currentLevel || 1;
        this.nextLevel = user.nextLevel || null;
        this.lastWordLearned = user.lastWordLearned || 'Error';

        // Calcular tiempo invertido (por ejemplo, para guiado)
        this.timeInvested = this.calculateTimeSpent(user.startTime);

        // --- Modo LIBRE ---
        const initialExploredCount = user.exploredFreeWords
          ? user.exploredFreeWords.length
          : 0;
        this.exploredWordsService.setExploredCount(initialExploredCount);
        this.exploredWordsService.exploredCount$.subscribe((count) => {
          this.exploredCount = count;
          console.log('Modos - exploredCount actualizado a', count);
        });

        // Obtener la categoría más explorada
        this.usuariosService.getCategoriaMasExplorada(user.uid).subscribe({
          next: (respCat) => {
            if (respCat.ok && respCat.categoriaMasExplorada) {
              this.mostExploredCategoryName =
                respCat.categoriaMasExplorada.nombre;
              this.mostExploredCategoryCount =
                respCat.categoriaMasExplorada.count;
              console.log(
                'Categoría más explorada:',
                this.mostExploredCategoryName,
                'con',
                this.mostExploredCategoryCount,
                'palabras'
              );
            } else {
              console.log('Ninguna categoría explorada aún');
            }
          },
          error: (err) => {
            console.error('Error obteniendo la categoría más explorada:', err);
          },
        });

        // Iniciar la actualización periódica del tiempo total en modo libre
        this.startRefreshTiempoLibre(user.uid);
      },
      error: (err) => {
        console.error('Error obteniendo usuario:', err);
        this.exploredWordsService.exploredCount$.subscribe((count) => {
          this.exploredCount = count;
          console.log('Modos - exploredCount actualizado a', count);
        });
      },
    });

    // Cargar el total de palabras
    this.palabrasService.obtenerPalabras().subscribe({
      next: (allPalabras) => {
        this.totalWords = allPalabras.length;
      },
      error: (err) => {
        console.error('Error obteniendo total de palabras:', err);
      },
    });

    // Obtener categoría sugerida para el modo libre
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => {
        if (data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          this.categoriaSugerida = data[randomIndex];
          console.log('Categoría sugerida:', this.categoriaSugerida.nombre);
        }
      },
      error: (err) => {
        console.error('Error al obtener categorías para sugerencia:', err);
      },
    });
  }

  getProgressColor(progress: number): string {
    if (progress < 40) {
      return 'bg-danger';
    } else if (progress < 70) {
      return 'bg-warning';
    } else {
      return 'bg-success';
    }
  }

  animateProgress() {
    const stages = [
      { percent: 0, color: 'bg-transparent' },
      { percent: 33, color: 'bg-danger' },
      { percent: 66, color: 'bg-warning' },
      { percent: 100, color: 'bg-success' },
      { percent: 66, color: 'bg-warning' },
      { percent: 33, color: 'bg-danger' },
      { percent: 0, color: 'bg-transparent' },
    ];
    let index = 0;
    const updateProgress = () => {
      this.animatedProgress = stages[index].percent;
      this.animatedProgressColor = stages[index].color;
      index = (index + 1) % stages.length;
      setTimeout(updateProgress, 1000);
    };
    updateProgress();
  }

  calculateTimeSpent(startTime: number): string {
    if (!startTime) return '0 mins';
    const currentTime = Date.now();
    const diffInMillis = currentTime - startTime;
    const diffInMinutes = Math.floor(diffInMillis / 60000);
    return `${diffInMinutes} mins`;
  }

  startRefreshTiempoLibre(userId: string): void {
    this.refreshTiempoLibre(userId);
    this.refreshInterval = setInterval(() => {
      console.log('Refrescando tiempo total en modo libre...');
      this.refreshTiempoLibre(userId);
    }, 60000);
  }

  refreshTiempoLibre(userId: string): void {
    this.statsService.getTiempoTotalLibre(userId).subscribe({
      next: (resp) => {
        if (resp.ok) {
          this.tiempoLibreMs = resp.totalDurationMs;
          console.log(
            'Actualización - Tiempo total Modo Libre (ms):',
            this.tiempoLibreMs
          );
        } else {
          console.log('Respuesta ok false en getTiempoTotalLibre:', resp.msg);
        }
      },
      error: (err) => {
        console.error('Error al obtener tiempo total libre:', err);
      },
    });
  }

  navigateToMode(route: string) {
    this.router.navigate([route]);
  }

  navigateTo(destination: string) {
    if (destination === 'admin') {
      this.router.navigate(['/admin']);
    } else if (destination === 'perfil') {
      this.router.navigate(['/perfil']);
    }
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe({
        next: (resp) => {
          console.log(
            'Sesión de modo libre cerrada. Duración (ms):',
            resp.durationMs
          );
        },
        error: (err) =>
          console.error('Error al cerrar la sesión de modo libre:', err),
      });
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  logout(): void {
    console.log('[DEBUG] Cerrando sesión desde Modo Libre...');
    this.usuariosService.logout().subscribe({
      next: (response) => {
        console.log('[DEBUG] Respuesta del logout:', response);
        // Aquí puedes limpiar datos locales si lo necesitas
        // Por ejemplo, this.usuario = null; si lo tuvieras
        this.router.navigate(['/landing']);
      },
      error: (error) => {
        console.error('[ERROR] Error al cerrar sesión:', error);
        alert('Error al cerrar sesión.');
      },
    });
  }
}