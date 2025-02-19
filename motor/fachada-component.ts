// canvas.component.ts
import { Component, ElementRef, AfterViewInit, ViewChild, Input, OnDestroy } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ThreeFacadeService } from '../services/fachada.ts';
import { AnimacionService } from '../services/animacion.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [HttpClientModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css'],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('webglCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() animationUrls: string[] = [];

  private animacionSubscription: Subscription;

  constructor(
    private threeFacade: ThreeFacadeService,
    private animacionService: AnimacionService
  ) {
    // Suscribirse a las animaciones
    this.animacionSubscription = this.animacionService.animaciones$.subscribe((urls: string[]) => {
      if (urls.length > 0) {
        const permitido = this.animacionService.permitirReproduccion();
        console.log('Estado de reproducción:', permitido);
        
        if (permitido) {
          console.log('URLs de las animaciones recibidas:', urls);
          // Se espera un momento antes de cargar las animaciones
          setTimeout(() => {
            if (this.animacionService.permitirReproduccion()) {
              this.threeFacade.cargarAnimacionesDinamicas(urls);
            }
          }, 100);
        } else {
          console.log('Ignorando animaciones - reproducción no permitida');
          this.threeFacade.limpiarCanvas();
        }
      } else {
        this.threeFacade.limpiarCanvas();
      }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.threeFacade.initialize(canvas);
  }

  ngOnDestroy(): void {
    if (this.animacionSubscription) {
      this.animacionSubscription.unsubscribe();
    }
    this.threeFacade.limpiarCanvas();
  }
}
