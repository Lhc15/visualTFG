import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';

@Component({
  selector: 'app-practica-abecedario',
  standalone: true,
  imports: [CommonModule, CanvasComponent],
  templateUrl: './practica-abecedario.component.html',
  styleUrl: './practica-abecedario.component.css'
})
export class PracticaAbecedarioComponent implements AfterViewInit {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('canvasWrap') canvasWrap!: ElementRef<HTMLElement>;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.waitForCanvas();
  }

  private waitForCanvas(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.canvasRef?.skinReady) {
      setTimeout(() => this.waitForCanvas(attempts + 1), 100);
      return;
    }
    if (!this.canvasWrap) return;
    const { clientWidth: w, clientHeight: h } = this.canvasWrap.nativeElement;
    this.canvasRef.resizeToContainer(w, h);
  }

  irAModo(modo: 'modo-a' | 'modo-b'): void {
    this.router.navigate(['/practica/abecedario', modo]);
  }

  volver(): void {
    this.router.navigate(['/practica']);
  }
}