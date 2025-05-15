import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Interfaz para los datos de animación que emitimos */
export interface AnimationData {
  animaciones: string[];
  loop: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AnimacionService {
  
  // -- MÉTODO AUX (si todavía no lo usas, lo dejas tal cual)
  changeSpeed(arg0: number) {
    throw new Error('Method not implemented.');
  }
  
  /**
   * BehaviorSubject que emite un objeto con:
   * - animaciones: array de URLs (strings)
   * - loop: boolean (true = reproducir en bucle, false = 1 sola vez)
   */
  private animacionSubject = new BehaviorSubject<AnimationData>({
    animaciones: [],
    loop: false
  });
  
  /** Observable para que otros componentes se suscriban */
  animaciones$ = this.animacionSubject.asObservable();

  private animacionesActivas = false;
  private playAnimaciones = false;
  private animacionManual = false;
  private cambiandoPagina = true;

  /**
   * Si quieres “recordar” lo último que llegó mientras
   * estabas cambiando de página
   */
  private ultimasAnimacionesData: AnimationData = { 
    animaciones: [],
    loop: false
  };

  /**
   * Cargar una lista de animaciones (array de URLs),
   * indicando si es manual (=true) y si va en bucle (=loop)
   */
  cargarAnimaciones(animaciones: string[], manual: boolean = false, loop: boolean = false): void {
    console.log('Intento de cargar animaciones:', {
      manual,
      loop,
      cambiandoPagina: this.cambiandoPagina
    });
    
    // Si estamos cambiando de página, guardamos la info y salimos
    if (this.cambiandoPagina) {
      console.log('Guardando animaciones para después del cambio de página');
      this.ultimasAnimacionesData = { animaciones, loop };
      return;
    }

    // Solo reproducimos si es manual
    if (manual) {
      console.log('Cargando animaciones manualmente');
      this.animacionManual = true;
      this.animacionesActivas = true;
      this.playAnimaciones = true;
      
      // Emitimos el objeto con animaciones + loop
      this.animacionSubject.next({ animaciones, loop });
    } else {
      console.log('Ignorando carga de animaciones - no es manual');
    }
  }
  

  /**
   * Limpiar las animaciones y marcar que cambiamos de página
   */
  limpiarAnimaciones(): void {
    console.log('Limpiando animaciones');
    this.animacionesActivas = false;
    this.playAnimaciones = false;
    this.animacionManual = false;
    this.cambiandoPagina = true;
    
    this.ultimasAnimacionesData = { animaciones: [], loop: false };
    // Emitimos animaciones vacías
    this.animacionSubject.next({ animaciones: [], loop: false });
  }

  /**
   * Indica que finalizamos el cambio de página.
   * Podrías re-emitir las animaciones si así lo quisieras, 
   * pero en este ejemplo NO lo hacemos para no recargar solos.
   */
  finalizarCambioPagina(): void {
    console.log('Finalizando cambio de página');
    this.cambiandoPagina = false;

    // Si quieres re-emitir lo que se guardó antes, hazlo aquí
    // Por defecto este ejemplo no lo hace.
    // this.animacionSubject.next(this.ultimasAnimacionesData);

    // Reseteamos
    this.ultimasAnimacionesData = { animaciones: [], loop: false };
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
