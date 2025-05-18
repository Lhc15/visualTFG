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

@Component({
  selector: 'app-modo-examen',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    CanvasComponent,
    FormsModule,
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


  isLooping = false;

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
    this.optionStatus = {}; // Reiniciamos el estado de las opciones
    this.respuestaCorrectaId = null; // Resetear la respuesta correcta
    this.answeredThisQuestion = false;   

    // Deseleccionar todos los radio buttons
    const radios = document.querySelectorAll('input[name="value-radio"]') as NodeListOf<HTMLInputElement>;
    radios.forEach(r => r.checked = false);
    this.isLooping = false; // Asegura que se detiene cualquier loop anterior


    this.examenService.generarPregunta().subscribe({
      next: (resp) => {
        // Resp => { questionId, animaciones, opciones }
        this.questionId = resp.questionId;
        this.animaciones = resp.animaciones;
        this.opciones = resp.opciones;
        this.cargandoPregunta = false;

        if (this.canvasRef) {
          this.canvasRef.stopLoop(false);
          const animacionesUrls = this.animaciones.map(a =>
            `${environment.apiUrl}/gltf/animaciones/${a.filename}`
          );
          this.animacionService.cargarAnimaciones(animacionesUrls, true, false);
          if (this.canvasRef?.animationEnded) {
            this.canvasRef.animationEnded.subscribe(() => {
              // Deseleccionar todos los radio buttons
              const radios = document.querySelectorAll('input[name="value-radio"]') as NodeListOf<HTMLInputElement>;
              radios.forEach(r => r.checked = false);
          
              // Además, si estás en modo bucle, detenemos también
              this.isLooping = false;
            });
          }
          
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
 onRadioChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = input.value;

  this.selectedTool = value;

  if (value === 'play') {
    this.reproducirAnimacion(false);
  }

 
}


  //veloc
  setPlaybackRate(rate: number): void {
  this.currentPlaybackRate = rate;
  if (this.canvasRef) {
    this.canvasRef.setPlaybackRate(rate);
  }
}
onToggleVeloc(event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;

  if (!this.animaciones || this.animaciones.length === 0) {
    alert('Primero espera a que se cargue una pregunta.');
    (event.target as HTMLInputElement).checked = false;
    return;
  }

  this.velocSliderVisible = checked;

  if (checked) {
    this.selectedTool = 'veloc';
    this.lastSelectedRadio = 'veloc';
  } else {
    this.selectedTool = null;
    this.lastSelectedRadio = null;
  }
}


  
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
    this.router.navigate(['/modos']);
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

  
  
}
