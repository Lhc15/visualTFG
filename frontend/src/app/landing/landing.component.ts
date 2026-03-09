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

  isRegisterVisible: boolean = false;
  private gapAfterHello = 3000;
  private gapBeforeWelcome = 2500;
  private isPlayingHello = true;
  private animationTimeout!: any;

  // ── Efectos visuales ──
  private lseInterval!: any;
  private readonly LSE_CHARS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

  constructor(private animacionService: AnimacionService) {}

  showRegister() { this.isRegisterVisible = true; }
  showLogin()    { this.isRegisterVisible = false; }

  ngAfterViewInit() {
    this.playHelloLoop();
    this.initLseLetters();
    this.initParallax();
  }

  ngOnDestroy() {
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    if (this.lseInterval)      clearInterval(this.lseInterval);
  }

  // ─────────────────────────────────────────
  //  ANIMACIONES DEL AVATAR (sin cambios)
  // ─────────────────────────────────────────

  private async playHelloLoop() {
    this.isPlayingHello = true;
    const url = `${environment.apiUrl}/gltf/animaciones/holaanimation.gltf`;
    await this.canvasRef.loadSkinModel(url);
    const clip = this.canvasRef.availableClips[0];
    if (!clip) return;
    this.canvasRef.playClip(clip, false);
  }

  private async playWelcome() {
    this.isPlayingHello = false;
    const url = `${environment.apiUrl}/gltf/animaciones/bienvenidoanimation.gltf`;
    await this.canvasRef.loadSkinModel(url);
    const clip = this.canvasRef.availableClips[0];
    if (!clip) return;
    this.canvasRef.playClip(clip, false);
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

    const spawn = () => {
      const el = document.createElement('span');
      el.className = 'lse-letter';
      el.textContent = this.LSE_CHARS[Math.floor(Math.random() * this.LSE_CHARS.length)];
      const size = 48 + Math.random() * 120;
      el.style.fontSize = size + 'px';
      el.style.left = (Math.random() * 90) + '%';
      el.style.bottom = '-150px';
      el.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
      const dur = 8 + Math.random() * 10;
      el.style.animationDuration = dur + 's';
      bg.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000);
    };

    // Spawn inicial denso
    for (let i = 0; i < 18; i++) {
      setTimeout(spawn, i * 300);
    }
    // Spawn continuo
    this.lseInterval = setInterval(spawn, 700);
  }

  private initParallax() {
    const avatar = document.getElementById('avatarParallax');
    const left   = document.getElementById('sideLeft');
    if (!avatar || !left) return;

    left.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = left.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width  / 2) / rect.width;
      const dy = (e.clientY - rect.top  - rect.height / 2) / rect.height;
      avatar.style.transform = `translate(${dx * 22}px, ${dy * 14}px)`;
    });

    left.addEventListener('mouseleave', () => {
      avatar.style.transform = 'translate(0,0)';
    });
  }
}