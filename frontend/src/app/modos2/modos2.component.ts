import { Component, AfterViewInit, OnInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { HeaderComponent } from '../header/header.component';
import { DesbloqueoService } from '../services/desbloqueo.service';
import { UsuariosService } from '../services/usuarios.service';

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
  imports: [CommonModule, RouterModule, CanvasComponent, HeaderComponent],
  templateUrl: './modos2.component.html',
  styleUrls: ['./modos2.component.css'],
})
export class Modos2Component implements AfterViewInit, OnInit {

  @ViewChildren(CanvasComponent) canvasComponents!: QueryList<CanvasComponent>;
  @ViewChildren('avatarStage') avatarStages!: QueryList<ElementRef<HTMLElement>>;

  modos: ModoCard[] = [
    {
      id: 'abc',
      label: 'Abecedario',
      sublabel: 'A → Z · 27 signos',
      accentColor: '#4F9CF9',
      progress: 0,
      locked: false,
      ctaLabel: 'Explora',
      route: '/abecedario',
    },
    {
      id: 'voc',
      label: 'Aprende',
      sublabel: 'Vocabulario · Comunicación',
      accentColor: '#F4A940',
      progress: 0,
      locked: false,
      ctaLabel: 'Explora',
      route: '/aprende',
    },
    {
      id: 'practica',
      label: 'Practica',
      sublabel: 'Abecedario · Vocabulario · Gramática',
      accentColor: '#125603',
      progress: 0,
      locked: false,
      ctaLabel: 'Practica',
      route: '/practica',
    },
    {
      id: 'conv',
      label: '¿Conversamos?',
      sublabel: 'Conversaciones simuladas',
      accentColor: '#8B00A8',
      progress: 0,
      locked: true,
      ctaLabel: 'Practica',
      route: '/conversamos',
    },
  ];

  // ── Chip de desbloqueo ──
  chipVisible = false;
  chipTexto = '';
  private chipTimer: any = null;

  constructor(
    private router: Router,
    private desbloqueoService: DesbloqueoService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        const esAdmin = resp.usuario?.rol === 'ROL_ADMIN';
        const uid = resp.usuario.uid;
        if (esAdmin) {
          this.desbloquearConversamos();
        } else {
          this.desbloqueoService.obtenerEstado().subscribe({
            next: (estado) => {
              const eraBloquedado = this.modos.find(m => m.id === 'conv')?.locked ?? true;
              if (estado.todosComunicacionCompletos) this.desbloquearConversamos();

              // Chip por localStorage (navegación desde comunicacion en la misma sesión)
              const key = `vv_conv_chip_pendiente_${uid}`;
              const pendiente = localStorage.getItem(key);
              if (pendiente) {
                localStorage.removeItem(key);
                setTimeout(() => {
                  this.lanzarConfeti();
                  this.mostrarChip('🔓 ¿Conversamos? desbloqueado');
                }, 600);
              } else if (estado.todosComunicacionCompletos && eraBloquedado) {
                // Primera vez que modos2 ve que está completo (refresco, nueva sesión, etc.)
                const vistosKey = `vv_conv_chip_visto_${uid}`;
                if (!localStorage.getItem(vistosKey)) {
                  localStorage.setItem(vistosKey, '1');
                  setTimeout(() => {
                    this.lanzarConfeti();
                    this.mostrarChip('🔓 ¿Conversamos? desbloqueado');
                  }, 600);
                }
              }
            }
          });
        }
      }
    });
  }

  private mostrarChip(texto: string): void {
    if (this.chipTimer) clearTimeout(this.chipTimer);
    this.chipTexto = texto;
    this.chipVisible = true;
    this.chipTimer = setTimeout(() => { this.chipVisible = false; }, 4500);
  }

  private lanzarConfeti(): void {
    if (typeof (window as any).confetti === 'undefined') return;
    const confetti = (window as any).confetti;
    const colores = ['#E04A1A', '#F4A940', '#1C0E0A', '#F9F6F3', '#F0997B'];
    const base = { spread: 70, colors: colores, gravity: 1.1, scalar: 1.1, ticks: 350 };
    confetti({ ...base, particleCount: 100, angle: 60, startVelocity: 55, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, particleCount: 100, angle: 120, startVelocity: 55, origin: { x: 1, y: 0.65 } });
    setTimeout(() => {
      confetti({ ...base, particleCount: 60, angle: 70, startVelocity: 45, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 60, angle: 110, startVelocity: 45, origin: { x: 1, y: 0.7 } });
    }, 500);
  }

  private desbloquearConversamos(): void {
    const c = this.modos.find(m => m.id === 'conv');
    if (c) c.locked = false;
  }

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