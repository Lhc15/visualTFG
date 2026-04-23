import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DescripcionService } from '../services/descripcion.service';

@Component({
  selector: 'app-descripcion-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="desc-tooltip" *ngIf="texto" [@slideIn]>
      <button class="desc-close" (click)="cerrar()" aria-label="Cerrar">✕</button>
      <p class="desc-texto">{{ texto }}</p>
    </div>
  `,
  styles: [`
    .desc-tooltip {
      position: absolute;
      bottom: 16px;
      left: 16px;
      max-width: 240px;
      background: rgba(28, 14, 10, 0.88);
      color: #F9F6F3;
      border-left: 3px solid #E04A1A;
      border-radius: 8px;
      padding: 10px 36px 10px 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.82rem;
      line-height: 1.45;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      z-index: 20;
      animation: descIn 0.22s ease;
    }
    @keyframes descIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .desc-close {
      position: absolute;
      top: 6px;
      right: 8px;
      background: none;
      border: none;
      color: #F9F6F3;
      opacity: 0.6;
      font-size: 0.75rem;
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