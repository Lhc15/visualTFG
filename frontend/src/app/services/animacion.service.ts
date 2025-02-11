import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnimacionService {
  private animacionSubject = new BehaviorSubject<string[]>([]);
  animaciones$ = this.animacionSubject.asObservable();
  private animacionesActivas = false;
  private playAnimaciones = false;
  private animacionManual = false;
  private cambiandoPagina = true;
  private ultimasAnimaciones: string[] = [];

  cargarAnimaciones(animaciones: string[], manual: boolean = false): void {
    console.log('Intento de cargar animaciones:', { manual, cambiandoPagina: this.cambiandoPagina });
    
    // Si estamos cambiando de página, guardar las animaciones para después
    if (this.cambiandoPagina) {
      console.log('Guardando animaciones para después del cambio de página');
      this.ultimasAnimaciones = animaciones;
      return;
    }

    if (manual) {
      console.log('Cargando animaciones manualmente');
      this.animacionManual = true;
      this.animacionesActivas = true;
      this.playAnimaciones = true;
      this.animacionSubject.next(animaciones);
    } else {
      console.log('Ignorando carga de animaciones - no es manual');
    }
  }

  limpiarAnimaciones(): void {
    console.log('Limpiando animaciones');
    this.animacionesActivas = false;
    this.playAnimaciones = false;
    this.animacionManual = false;
    this.cambiandoPagina = true;
    this.ultimasAnimaciones = [];
    this.animacionSubject.next([]);
  }

  finalizarCambioPagina(): void {
    console.log('Finalizando cambio de página');
    this.cambiandoPagina = false;
    
    // No recargar animaciones automáticamente después del cambio de página
    this.ultimasAnimaciones = [];
  }

  hayAnimacionesActivas(): boolean {
    return this.animacionesActivas && !this.cambiandoPagina;
  }

  permitirReproduccion(): boolean {
    const permitir = this.playAnimaciones && this.animacionManual && !this.cambiandoPagina;
    console.log('Verificando reproducción:', {
      playAnimaciones: this.playAnimaciones,
      manual: this.animacionManual,
      cambiandoPagina: this.cambiandoPagina,
      permitir
    });
    return permitir;
  }
}
