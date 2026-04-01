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
      id: 'voc',
      label: 'Aprende',
      sublabel: 'Vocabulario · Comunicación',
      accentColor: '#F4A940',
      progress: 15,
      locked: false,
      ctaLabel: 'Explorar',
      route: '/aprende',
    },
    {
      id: 'practica',
      label: 'Practica',
      sublabel: 'Abecedario · Vocabulario · Gramática',
      accentColor: '#125603',
      progress: 0,
      locked: false,
      ctaLabel: 'Empezar',
      route: '/practica',
    },
    {
      id: 'conv',
      label: '¿Conversamos?',
      sublabel: 'Diálogo libre · Nivel A1',
      accentColor: '#8B00A8',
      progress: 32,
      locked: false,
      ctaLabel: 'Empezar',
      route: '/conversamos',
    },
  ];

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.canvasComponents.changes.subscribe(() => this.waitForSkinAndResize());
    setTimeout(() => this.waitForSkinAndResize(), 0);
    const observer = new ResizeObserver(() => this.resizeDimensionsOnly());
    this.avatarStages.forEach(stage => observer.observe(stage.nativeElement));
  }

  private waitForSkinAndResize(attempts = 0): void {
    if (attempts > 50) return;
    const allReady = this.canvasComponents.length > 0 &&
      this.canvasComponents.toArray().every(c => c.skinReady);
    if (!allReady) {
      setTimeout(() => this.waitForSkinAndResize(attempts + 1), 100);
      return;
    }
    this.resizeDimensionsOnly();
  }

  private resizeDimensionsOnly(): void {
    this.canvasComponents.forEach((canvasComp, i) => {
      const stage = this.avatarStages.get(i);
      if (!stage) return;
      const { clientWidth: w, clientHeight: h } = stage.nativeElement;
      canvasComp.resizeToContainer(w, h);
    });
  }

  navigate(modo: ModoCard): void {
    if (!modo.locked && modo.route) {
      this.router.navigate([modo.route]);
    }
  }
}