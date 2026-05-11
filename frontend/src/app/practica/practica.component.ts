import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { HeaderComponent } from '../header/header.component';
import { DesbloqueoService } from '../services/desbloqueo.service';
import { UsuariosService } from '../services/usuarios.service';

interface SeccionPractica {
  id: string; nombre: string; subtitulo: string; deco: string; progreso: number;
  novedad?: string; locked?: boolean;
}

@Component({
  selector: 'app-practica',
  standalone: true,
  imports: [CommonModule, CanvasComponent, HeaderComponent],
  templateUrl: './practica.component.html',
  styleUrls: ['./practica.component.css']
})
export class PracticaComponent implements AfterViewInit, OnInit {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('canvasWrap') canvasWrap!: ElementRef<HTMLElement>;

  secciones: SeccionPractica[] = [
    { id: 'abecedario',  nombre: 'Abecedario',  subtitulo: '27 letras · LSE básico',  deco: 'A', progreso: 68 },
    { id: 'vocabulario', nombre: 'Vocabulario', subtitulo: 'Categorías temáticas',     deco: 'V', progreso: 30 },
    { id: 'gramatica',   nombre: 'Gramática',   subtitulo: 'SOV · Preguntas · ENM',   deco: 'G', progreso: 10, locked: true }
  ];

  novedades: any[] = [];

  activoId: string | null = null;
  statsExpandido = false;

  constructor(
    private router: Router,
    private desbloqueoService: DesbloqueoService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        const esAdmin = resp.usuario?.rol === 'ROL_ADMIN';
        if (esAdmin) {
          this.desbloquearGramatica();
        } else {
          this.desbloqueoService.obtenerEstado().subscribe({
            next: (estado) => {
              if (estado.bloque1Completado) this.desbloquearGramatica();
            }
          });
        }
      }
    });
  }

  private desbloquearGramatica(): void {
    const g = this.secciones.find(s => s.id === 'gramatica');
    if (g) g.locked = false;
  }

  toggleStats(): void { this.statsExpandido = !this.statsExpandido; }

  ngAfterViewInit(): void { this.waitForSkinAndResize(); }

  private waitForSkinAndResize(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.canvasRef?.skinReady) {
      setTimeout(() => this.waitForSkinAndResize(attempts + 1), 100); return;
    }
    if (!this.canvasWrap) return;
    const { clientWidth: w, clientHeight: h } = this.canvasWrap.nativeElement;
    this.canvasRef.resizeToContainer(w, h);
  }

  activar(id: string):  void { this.activoId = id; }
  desactivar():         void { this.activoId = null; }
  irA(s: SeccionPractica): void { if (!s.locked) this.router.navigate(['/practica', s.id]); }
  volver():             void { this.router.navigate(['/modos2']); }
}