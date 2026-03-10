import { Component, AfterViewInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';

export interface ModoCard {
  id: string;
  label: string;
  sublabel: string;
  accentColor: string;
  progress: number;
  locked: boolean;
  ctaLabel: string;
  route: string;
}

@Component({
  selector: 'app-modos2',
  standalone: true,
  imports: [CommonModule, RouterModule, CanvasComponent],
  templateUrl: './modos2.component.html',
  styleUrls: ['./modos2.component.css'],
})
export class Modos2Component implements AfterViewInit {

  @ViewChildren(CanvasComponent) canvasComponents!: QueryList<CanvasComponent>;
  @ViewChildren('avatarStage') avatarStages!: QueryList<ElementRef<HTMLElement>>;

  modos: ModoCard[] = [
    {
      id: 'abc',
      label: 'Abecedario',
      sublabel: 'A → Z · 27 signos',
      accentColor: '#4F9CF9',
      progress: 68,
      locked: false,
      ctaLabel: 'Continuar',
      route: '/abecedario',
    },
    {
      id: 'conv',
      label: '¿Conversamos?',
      sublabel: 'Diálogo libre · Nivel A1',
      accentColor: '#E04A1A',
      progress: 32,
      locked: false,
      ctaLabel: 'Empezar',
      route: '/conversamos',
    },
    {
      id: 'voc',
      label: 'Vocabulario',
      sublabel: 'Temas · Objetos · Verbos',
      accentColor: '#22C55E',
      progress: 15,
      locked: false,
      ctaLabel: 'Explorar',
      route: '/libre',
    },
    {
      id: 'gram',
      label: 'Gramática',
      sublabel: 'Completa vocabulario para desbloquear',
      accentColor: '#A855F7',
      progress: 0,
      locked: true,
      ctaLabel: 'Bloqueado',
      route: '',
    },
  ];

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    // Solo ajustar tamaño del renderer al contenedor
    setTimeout(() => this.resizeDimensionsOnly(), 200);
    const observer = new ResizeObserver(() => this.resizeDimensionsOnly());
    this.avatarStages.forEach(stage => observer.observe(stage.nativeElement));
  }

  private resizeAllCanvases(): void {
    this.resizeDimensionsOnly();
  }

  private resizeDimensionsOnly(): void {
    this.canvasComponents.forEach((canvasComp, i) => {
      const stage = this.avatarStages.get(i);
      if (!stage) return;
      const { clientWidth: w, clientHeight: h } = stage.nativeElement;
      if (!w || !h) return;
      const comp = canvasComp as any;
      if (comp.renderer && comp.camera) {
        comp.renderer.setSize(w, h);
        comp.camera.aspect = w / h;
        comp.camera.updateProjectionMatrix();
        if (comp.controls) comp.controls.update();
      }
    });
  }

  navigate(modo: ModoCard): void {
    if (!modo.locked && modo.route) {
      this.router.navigate([modo.route]);
    }
  }
}