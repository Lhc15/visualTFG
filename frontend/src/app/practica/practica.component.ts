import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { HeaderComponent } from '../header/header.component';

interface SeccionPractica {
  id: string; nombre: string; subtitulo: string; deco: string; progreso: number;
  novedad?: string;
}

@Component({
  selector: 'app-practica',
  standalone: true,
  imports: [CommonModule, CanvasComponent, HeaderComponent],
  templateUrl: './practica.component.html',
  styleUrls: ['./practica.component.css']
})
export class PracticaComponent implements AfterViewInit {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('canvasWrap') canvasWrap!: ElementRef<HTMLElement>;

  secciones: SeccionPractica[] = [
    { id: 'abecedario',  nombre: 'Abecedario',  subtitulo: '27 letras · LSE básico',  deco: 'A', progreso: 68, novedad: 'Desbloqueada la letra Ñ — completa el abecedario' },
    { id: 'vocabulario', nombre: 'Vocabulario', subtitulo: 'Categorías temáticas',     deco: 'V', progreso: 30 },
    { id: 'gramatica',   nombre: 'Gramática',   subtitulo: 'SOV · Preguntas · ENM',   deco: 'G', progreso: 10 }
  ];

  novedades = [
    { texto: 'Desbloqueada',    negrita: 'Familia' },
    { texto: 'Nueva categoría', negrita: 'Comida'  },
    { texto: 'Racha de',        negrita: '5 días'  }
  ];

  activoId: string | null = null;
  statsExpandido = false;

  constructor(private router: Router) {}

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
  irA(id: string):      void { this.router.navigate(['/practica', id]); }
  volver():             void { this.router.navigate(['/modos2']); }
}