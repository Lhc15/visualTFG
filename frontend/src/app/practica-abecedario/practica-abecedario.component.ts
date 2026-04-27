import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-practica-abecedario',
  standalone: true,
  imports: [CommonModule, CanvasComponent, HeaderComponent],
  templateUrl: './practica-abecedario.component.html',
  styleUrl: './practica-abecedario.component.css'
})
export class PracticaAbecedarioComponent implements AfterViewInit {

  @ViewChild('mainCanvas') mainCanvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.waitForCanvas();
  }

  private waitForCanvas(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.mainCanvasRef?.skinReady) {
      setTimeout(() => this.waitForCanvas(attempts + 1), 100);
      return;
    }
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    if (!this.avatarPanel || !this.mainCanvasRef) return;
    const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
    this.mainCanvasRef.resizeToContainer(w, h);
  }

  irAModo(modo: 'modo-a' | 'modo-b'): void {
    this.router.navigate(['/practica/abecedario', modo]);
  }

  volver(): void {
    this.router.navigate(['/practica']);
  }
}