import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DescripcionService } from '../services/descripcion.service';

@Component({
  selector: 'app-descripcion-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="desc-tooltip" *ngIf="texto">
      <button class="desc-close" (click)="cerrar()" aria-label="Cerrar">✕</button>
      <p class="desc-texto">{{ texto }}</p>
    </div>
  `,
  styles: [`
    .desc-tooltip {
      position: absolute;
      bottom: 24px;
      left: 24px;
      right: 24px;
      max-width: 280px;
      background: rgba(20, 20, 20, 0.82);
      backdrop-filter: blur(6px);
      color: #F9F6F3;
      border-radius: 10px;
      padding: 10px 32px 10px 14px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.83rem;
      line-height: 1.5;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 50;
      animation: descIn 0.2s ease;
    }
    @keyframes descIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .desc-close {
      position: absolute;
      top: 7px;
      right: 9px;
      background: none;
      border: none;
      color: #F9F6F3;
      opacity: 0.5;
      font-size: 0.7rem;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }
    .desc-close:hover { opacity: 1; }
    .desc-texto { margin: 0; }
  `]
})
export class DescripcionTooltipComponent implements OnInit, OnDestroy {
  texto: string | null = null;
  private sub!: Subscription;

  constructor(
    private descripcionService: DescripcionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub = this.descripcionService.desc$.subscribe(payload => {
      this.texto = payload?.texto ?? null;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cerrar(): void {
    this.descripcionService.hide();
  }
}