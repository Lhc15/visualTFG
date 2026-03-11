import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ExamenService } from '../services/examen.service';
import { UsuariosService } from '../services/usuarios.service';
import { AnimacionService } from '../services/animacion.service';

import { HeaderComponent } from '../header/header.component';
import { CanvasComponent } from '../canvas/canvas.component';

import { FormsModule } from '@angular/forms';

import { environment } from '../../environments/environment';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';   // ← import

@Component({
  selector: 'app-modo-examen',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    CanvasComponent,
    FormsModule,
    ToolMenuComponent
  ],
  templateUrl: './modo-examen.component.html',
  styleUrls: ['./modo-examen.component.css']
})
export class ModoExamenComponent implements OnInit, OnDestroy {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;

  questionId!: string;
  opciones: any[] = [];
  animaciones: any[] = [];
  resultado: string = '';
  cargandoPregunta: boolean = false;
  respuestaCorrectaId: string | null = null;

  //para las preguntas del examen
  readonly maxQuestions = 5;
  questionCount = 0;
  correctCount = 0;
  incorrectCount = 0;
  examFinished = false;
  sessionId!: string;    // Nueva: identificador de la “sesión de examen”

  answeredThisQuestion = false;      
  readyToShowResults = false;
     
  resultsHistory: boolean[] = [];         // <-- Para almacenar aciertos/fallos

  selectedTool: string | null = null;

  
  isPlaying = false;       // para reflejar “una sola reproducción”
  isLooping = false;       // igual que antes

  showWebcam: boolean = false;
  // Eliminamos selectedOptionId y usamos optionStatus para almacenar el estado de cada opción:
  optionStatus: { [key: string]: 'correct' | 'incorrect' } = {};

  velocSliderVisible: boolean = false;
  currentPlaybackRate: number = 1;
  lastSelectedRadio: string | null = null;



  constructor(
    private examenService: ExamenService,
    private usuariosService: UsuariosService,
    private animacionService: AnimacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startExamSession();
  }

  public startExamSession() {
    // Llamada a un nuevo endpoint para iniciar sesión
    this.examenService.startSession().subscribe(resp => {
      this.sessionId = resp.sessionId;
      this.resetExam();
      this.cargarNuevaPregunta();
    });
  }

  //para resetear examen
  private resetExam() {
    this.questionCount = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.examFinished = false;
    this.answeredThisQuestion = false;
    this.readyToShowResults    = false;
    this.resultsHistory         = [];
    this.optionStatus           = {};
  }

  ngOnDestroy(): void {
    // Si necesitas hacer limpieza cuando se destruya el componente
  }

  // ==========================================================
  // EXAMEN: Cargar una nueva pregunta
  // ==========================================================
  cargarNuevaPregunta(): void {
    this.cargandoPregunta = true;
    this.resultado = '';
    this.optionStatus = {};
    this.respuestaCorrectaId = null;
    this.answeredThisQuestion = false;
    this.readyToShowResults = false;

    // deselecciona radios, resetea bucle...
    const radios = document.querySelectorAll('input[name="value-radio"]') as NodeListOf<HTMLInputElement>;
    radios.forEach(r => r.checked = false);
    this.isLooping = false;
    this.isPlaying = false;

    this.examenService.generarPregunta()
      .subscribe({
        next: async (resp) => {
          this.questionId  = resp.questionId;
          this.animaciones = resp.animaciones;
          this.opciones    = resp.opciones;
          this.cargandoPregunta = false;

          // ─── AUTO-PLAY DE LA ANIMACIÓN ───────────────────────────
          if (this.animaciones.length > 0 && this.canvasRef) {
            const { filename, clipName } = this.animaciones[0];
            const url = `${environment.apiUrl}/gltf/animaciones/${filename}`;

            // 1) cargamos modelo si hace falta
            await this.canvasRef.loadSkinModel(url);

            // 2) reproducimos el clip una sola vez
            this.canvasRef.playClip(clipName, false);

            // 3) actualizamos flags para que el botón Play refleje que ya está reproduciendo
            this.isPlaying  = true;
            this.isLooping  = false;
          }
        },
        error: (err) => {
          console.error('Error al generar pregunta:', err);
          this.cargandoPregunta = false;
        }
      });
  }

  // ==========================================================
  // EXAMEN: Seleccionar opción
  // ==========================================================
  seleccionarOpcion(opcionId: string): void {
    this.examenService.verificarRespuesta(
      this.sessionId,       // <-- slot para el sessionId
      this.questionId,
      opcionId
    ).subscribe({
      next: (resp) => {
        const wasCorrect = resp.esCorrecta;
        // 1) Marcar feedback inmediato
        this.optionStatus[opcionId] = wasCorrect ? 'correct' : 'incorrect';
        this.resultado = wasCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta';

        // 2) Actualizar contador
        this.questionCount++;
        this.resultsHistory.push(wasCorrect);     
        if (wasCorrect) this.correctCount++; else this.incorrectCount++;

        // 3) Mostrar respuesta correcta si fallas
        if (!wasCorrect && resp.respuestaCorrecta) {
          this.respuestaCorrectaId = resp.respuestaCorrecta;
          setTimeout(() => {
            this.optionStatus[this.respuestaCorrectaId!] = 'correct';
          }, 1500);
        }

        // 4) Fin de la pregunta actual
        this.answeredThisQuestion = true;        // <-- desbloquea el botón

        // 5) ¿Hemos llegado al máximo?
        if (this.questionCount >= this.maxQuestions) {
          // Fin de examen: mostramos resumen
          this.readyToShowResults = true;
        }
      }
    });
  }
  


  // ==========================================================
  // MENÚ DE BOTONES (radio buttons) => play / loop / stop / webcam / veloc
  // ==========================================================
  
  
  
  // ==========================================================
  // WEBCAM
  // ==========================================================
  toggleWebcam(): void {
    if (!this.showWebcam) {
      this.startWebcam();
    } else {
      this.stopWebcam();
    }
    this.showWebcam = !this.showWebcam;
  }

  startWebcam(): void {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        const video: HTMLVideoElement = this.videoElement.nativeElement;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => console.error('Error webcam:', err));
  }

  stopWebcam(): void {
    const video: HTMLVideoElement = this.videoElement.nativeElement;
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
  }

  // ==========================================================
  // NAVEGACIÓN
  // ==========================================================
  navigateTo(destination: string): void {
    if (destination === 'perfil') {
      this.router.navigate(['/perfil']);
    } else if (destination === 'ajustes') {
      this.router.navigate(['/ajustes']);
    }
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================
  logout(): void {
    this.usuariosService.logout().subscribe({
      next: (resp) => {
        console.log('Logout ok:', resp);
        this.router.navigate(['/landing']);
      },
      error: (err) => {
        console.error('Error logout:', err);
        alert('Error al cerrar sesión');
      }
    });
  }

  volverAModos(): void {
    this.router.navigate(['/modos2']);
  }
  private reproducirAnimacion(loop: boolean): void {
    const animacionesUrls = this.animaciones.map(a =>
      `${environment.apiUrl}/gltf/animaciones/${a.filename}`
    );
  
    this.animacionService.cargarAnimaciones(animacionesUrls, true, loop);
  }
  

  onToggleLoop(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
  
    if (checked) {
      this.isLooping = true;
      this.reproducirAnimacion(true);  // con bucle
    } else {
      this.isLooping = false;
      this.canvasRef?.stopLoop(true);  // parar animación
    }
  }

  // nuevo método para “Mostrar resultados”
  mostrarResultados(): void {
    this.examFinished = true;
  }

  onAnimationEnded() {
    console.log('ModoLibreComponent: recibí animationEnded, isPlaying:', this.isPlaying);
    this.isPlaying = false;
    console.log('ModoLibreComponent: isPlaying ahora:', this.isPlaying);  
  }

  /** Play una sola vez la animación actual */
  async onPlayClicked() {
    if (!this.animaciones.length) return;
    const { filename, clipName } = this.animaciones[0];
    const url = `${environment.apiUrl}/gltf/animaciones/${filename}`;

    // 1) Cargar el modelo si no está ya
    await this.canvasRef.loadSkinModel(url);

    // 2) Reproducir el clip que venga en la pregunta
    this.canvasRef.playClip(clipName, false);

    this.isPlaying = true;
    this.isLooping = false;
  }

  /** Bucle en skin engine */
  async handleLoop(checked: boolean) {
    if (!this.animaciones.length) return;
    const { filename, clipName } = this.animaciones[0];
    const url = `${environment.apiUrl}/gltf/animaciones/${filename}`;

    // 1) Asegurarnos de tener el modelo correcto
    await this.canvasRef.loadSkinModel(url);

    // 2) Reproducir en bucle (o parar)
    if (checked) {
      this.canvasRef.playClip(clipName, true);
      this.isPlaying = false;
    } else {
      this.canvasRef.stopClip();
      this.isPlaying = false;
    }

    this.isLooping = checked;
  }

   setPlaybackRate(rate: number) {
    this.currentPlaybackRate = rate;
    this.canvasRef?.setPlaybackRate(rate);
  }
  
}