import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, OnDestroy } from '@angular/core';
import { LoginComponent } from '../login/login.component';
import { RegistroComponent } from '../registro/registro.component';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { AnimacionService } from '../services/animacion.service';
import { environment } from '../../environments/environment';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, LoginComponent, RegistroComponent, CanvasComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: CanvasComponent;
  @ViewChild('sideLeft') sideLeftRef!: ElementRef<HTMLElement>;

  isRegisterVisible: boolean = false;
  private gapAfterHello = 3000;
  private gapBeforeWelcome = 2500;
  private isPlayingHello = true;
  private animationTimeout!: any;

  // ── Efectos visuales ──
  private lseInterval!: any;
  private readonly LSE_CHARS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  private resizeListener!: () => void;

  constructor(private animacionService: AnimacionService) {}

  showRegister() { this.isRegisterVisible = true; }
  showLogin()    { this.isRegisterVisible = false; }

  ngAfterViewInit() {
    this.playHelloLoop();
    this.initLseLetters();
    this.initParallax();
    this.waitForSkinAndResize();
  }

  ngOnDestroy() {
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    if (this.lseInterval)      clearInterval(this.lseInterval);
    if (this.resizeListener)   window.removeEventListener('resize', this.resizeListener);
  }

  // ─────────────────────────────────────────
  //  ANIMACIONES DEL AVATAR
  // ─────────────────────────────────────────

  private async playHelloLoop() {
    this.isPlayingHello = true;
    const url = `${environment.apiUrl}/gltf/animaciones/holaanimation.gltf`;
    try {
      await this.canvasRef.loadSkinModel(url);
      const clip = this.canvasRef.availableClips[0];
      if (!clip) { this.fallbackNeutralPose(); return; }
      this.canvasRef.playClip(clip, false);
    } catch {
      this.fallbackNeutralPose();
    }
  }

  private async playWelcome() {
    this.isPlayingHello = false;
    const url = `${environment.apiUrl}/gltf/animaciones/bienvenidoanimation.gltf`;
    try {
      await this.canvasRef.loadSkinModel(url);
      const clip = this.canvasRef.availableClips[0];
      if (!clip) { this.fallbackNeutralPose(); return; }
      this.canvasRef.playClip(clip, false);
    } catch {
      this.fallbackNeutralPose();
    }
  }

  /** Carga la pose neutral local — no depende del backend */
  private async fallbackNeutralPose() {
    try {
      await this.canvasRef.loadSkinModel('/assets/hola_0.gltf');
    } catch { /* si ni el asset local carga, no hacemos nada */ }
  }

  onHelloEnded() {
    if (this.animationTimeout) clearTimeout(this.animationTimeout);

    if (this.isPlayingHello) {
      this.animationTimeout = setTimeout(() => {
        this.playWelcome();
      }, this.gapBeforeWelcome);
    } else {
      this.animationTimeout = setTimeout(() => {
        this.playHelloLoop();
      }, this.gapAfterHello);
    }
  }

  // ─────────────────────────────────────────
  //  EFECTOS VISUALES
  // ─────────────────────────────────────────

  private initLseLetters() {
    const bg = document.getElementById('lseBg');
    if (!bg) return;

    const spawn = (prePositioned = false) => {
      const el = document.createElement('span');
      el.className = 'lse-letter';
      el.textContent = this.LSE_CHARS[Math.floor(Math.random() * this.LSE_CHARS.length)];
      const size = 48 + Math.random() * 120;
      el.style.fontSize = size + 'px';
      el.style.left = (Math.random() * 90) + '%';
      el.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
      const dur = 8 + Math.random() * 10;
      el.style.animationDuration = dur + 's';

      if (prePositioned) {
        // Ya visible en pantalla: position aleatoria en Y, delay negativo para simular mid-flight
        const progress = 0.1 + Math.random() * 0.8;
        el.style.bottom = (progress * 110) + 'vh';
        el.style.animationDelay = -(progress * dur) + 's';
      } else {
        el.style.bottom = '-150px';
        el.style.animationDelay = '0s';
      }

      bg.appendChild(el);
      const lifetime = (dur + Math.abs(parseFloat(el.style.animationDelay))) * 1000 + 500;
      setTimeout(() => el.remove(), lifetime);
    };

    // Letras ya flotando al cargar distribuidas por toda la pantalla
    for (let i = 0; i < 45; i++) spawn(true);

    // Spawn continuo desde abajo
    this.lseInterval = setInterval(() => spawn(false), 400);
  }

  private initParallax() {
    this.centerCanvas();
    this.resizeListener = () => this.centerCanvas();
    window.addEventListener('resize', this.resizeListener);
  }

  private waitForSkinAndResize(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.canvasRef?.skinReady) {
      setTimeout(() => this.waitForSkinAndResize(attempts + 1), 100);
      return;
    }
    const el = document.getElementById('sideLeft');
    if (!el) return;
    this.canvasRef.resizeToContainer(el.clientWidth, el.clientHeight);
  }

  private centerCanvas() {
    // max-width removed, canvas fills panel naturally
  }
}