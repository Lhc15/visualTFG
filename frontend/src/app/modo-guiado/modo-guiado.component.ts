import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CardComponent } from '../card/card.component';
import { PalabrasService } from '../services/palabras.service'; // Importa el servicio
import { CanvasComponent } from '../canvas/canvas.component';
import { AnimacionService } from '../services/animacion.service'; // Importa el servicio
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-modo-guiado',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent, CardComponent,CanvasComponent],
  templateUrl: './modo-guiado.component.html',
  styleUrls: ['./modo-guiado.component.css'],
})
export class ModoGuiadoComponent implements OnInit {
  words: any[] = []; // Lista dinámica de palabras
  currentIndex = 0; // Índice actual de la palabra
  maxWords = 5; // Limitar las palabras mostradas (opcional)

  constructor(private palabrasService: PalabrasService,private animacionService: AnimacionService) {}

  ngOnInit(): void {
    this.cargarPalabras(); // Cargar las palabras al iniciar
  }

  // Método para cargar palabras desde el servicio
  cargarPalabras(): void {
    this.palabrasService.obtenerPalabras().subscribe({
      next: (data) => {
        this.words = data.slice(0, this.maxWords);
        console.log('Palabras cargadas con sus animaciones:', 
          this.words.map(word => ({
            palabra: word.palabra,
            tieneAnimaciones: word.animaciones?.length > 0,
            animaciones: word.animaciones
          }))
        );
      },
      error: (error) => {
        console.error('Error al cargar las palabras:', error);
      },
    });
  }

  // Propiedad para obtener la palabra actual
// Propiedad para obtener la palabra actual
  get currentWord() {
    return this.words[this.currentIndex]?.palabra || 'Cargando...';
  }

  get currentExplanation() {
    return this.words[this.currentIndex]?.explicacion || 'Sin explicación disponible';
  }

  // Evento para el clic del botón de palabra
  handleWordClick() {
    const currentWord = this.words[this.currentIndex];
    console.log('Palabra clickeada:', currentWord); // Solo un log para depuración
    
    if (currentWord && currentWord.animaciones && currentWord.animaciones.length > 0) {
      const animacionesUrls = currentWord.animaciones.map(
        (animacion: any) => `${environment.apiUrl}/gltf/animaciones/${animacion.filename}`
      );
      console.log('Cargando animaciones:', animacionesUrls); // Log para depuración
      this.animacionService.cargarAnimaciones(animacionesUrls, true); // Marcamos como manual = true
    } else {
      console.warn('No hay animaciones disponibles para esta palabra');
    }
  }

  // Evento para repetir la acción
  handleRepeatClick() {
    this.handleWordClick();
    console.log(`Repetir acción para: ${this.currentWord}`);
  }

  // Cambiar a la palabra anterior
  prevWord() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  // Cambiar a la siguiente palabra
  nextWord() {
    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
    }
  }
}
