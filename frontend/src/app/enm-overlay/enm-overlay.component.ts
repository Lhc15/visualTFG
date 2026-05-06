import {
  Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EnmService } from '../services/enm.service';
import { EnmPack } from '../services/enm.types';
import { getEnmPack } from '../services/enm-packs.data';

const INITIAL_W = 220;
const INITIAL_H = 300;
const INITIAL_X = 24;
const INITIAL_Y = 120;
const MIN_W = 160;
const MIN_H = 160;

@Component({
  selector: 'app-enm-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './enm-overlay.component.html',
  styleUrls: ['./enm-overlay.component.css']
})
export class EnmOverlayComponent implements OnInit, OnDestroy {

  pack: EnmPack | null = null;
  minimizado = false;

  pos  = { x: INITIAL_X, y: INITIAL_Y };
  size = { w: INITIAL_W, h: INITIAL_H };

  // Controles de vídeo
  @ViewChild('enmVideo') videoRef?: ElementRef<HTMLVideoElement>;
  videoPausado = false;
  videoProgreso = 0; // 0–100
  private rafId: number | null = null;

  // Drag
  private dragging = false;
  private dragStart = { mx: 0, my: 0, ox: 0, oy: 0 };

  // Resize
  private resizing = false;
  private resizeStart = { mx: 0, my: 0, ow: 0, oh: 0 };

  private sub!: Subscription;

  constructor(
    private enmService: EnmService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.sub = this.enmService.enm$.subscribe(id => {
      this.pack = id ? (getEnmPack(id) ?? null) : null;
      if (this.pack) {
        this.minimizado = false;
        this.pos  = { x: INITIAL_X, y: INITIAL_Y };
        this.size = { w: INITIAL_W, h: INITIAL_H };
        this.videoPausado = false;
        this.videoProgreso = 0;
        this.pararRaf();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.pararRaf();
  }

  // ── CONTROLES DE VÍDEO ─────────────────────────────────────────────

  onVideoListo(): void {
    this.iniciarRaf();
  }

  togglePlay(): void {
    const v = this.videoRef?.nativeElement;
    if (!v) return;
    if (v.paused) {
      v.play();
      this.videoPausado = false;
      this.iniciarRaf();
    } else {
      v.pause();
      this.videoPausado = true;
    }
  }

  reiniciar(): void {
    const v = this.videoRef?.nativeElement;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    this.videoPausado = false;
    this.iniciarRaf();
  }

  onBarraClick(e: MouseEvent): void {
    const v = this.videoRef?.nativeElement;
    if (!v || !v.duration) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  }

  private iniciarRaf(): void {
    this.pararRaf();
    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        const v = this.videoRef?.nativeElement;
        if (v && v.duration) {
          const p = (v.currentTime / v.duration) * 100;
          this.ngZone.run(() => { this.videoProgreso = p; });
        }
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  private pararRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  // ── MINIMIZAR / CERRAR ─────────────────────────────────────────────

  toggleMinimizar(): void {
    this.minimizado = !this.minimizado;
  }

  cerrar(): void {
    this.enmService.hide();
  }

  // ── DRAG ───────────────────────────────────────────────────────────

  onDragStart(e: MouseEvent): void {
    // No iniciar drag si se hizo clic en un botón
    if ((e.target as HTMLElement).closest('.enm-btn')) return;
    this.dragging = true;
    this.dragStart = { mx: e.clientX, my: e.clientY, ox: this.pos.x, oy: this.pos.y };
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.dragging) {
      const dx = e.clientX - this.dragStart.mx;
      const dy = e.clientY - this.dragStart.my;
      // Limitar X al panel izquierdo (la mitad izquierda de la ventana)
      const maxX = window.innerWidth / 2 - this.size.w;
      this.pos.x = Math.max(0, Math.min(maxX, this.dragStart.ox + dx));
      this.pos.y = Math.max(0, Math.min(window.innerHeight - 60, this.dragStart.oy + dy));
    }

    if (this.resizing) {
      const dw = e.clientX - this.resizeStart.mx;
      const dh = e.clientY - this.resizeStart.my;
      const maxW = window.innerWidth / 2 - this.pos.x;
      this.size.w = Math.max(MIN_W, Math.min(maxW, this.resizeStart.ow + dw));
      this.size.h = Math.max(MIN_H, this.resizeStart.oh + dh);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.dragging = false;
    this.resizing = false;
  }

  // ── RESIZE ─────────────────────────────────────────────────────────

  onResizeStart(e: MouseEvent): void {
    this.resizing = true;
    this.resizeStart = { mx: e.clientX, my: e.clientY, ow: this.size.w, oh: this.size.h };
    e.preventDefault();
    e.stopPropagation();
  }
}