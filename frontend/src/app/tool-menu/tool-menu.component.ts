import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';   // ①  <-- añade esto

@Component({
  selector   : 'app-tool-menu',
  standalone : true,
  imports    : [CommonModule],                   
  templateUrl: './tool-menu.component.html',
  styleUrls  : ['./tool-menu.component.css']
})
export class ToolMenuComponent {
  /* ------ inputs que controlan su estado visual ------ */
  @Input() isLooping   = false;   // para pintar el icono play/stop
  @Input() showWebcam  = false;   // para saber si la webcam está activa
  @Input() disabled    = false;   // si no hay palabra → deshabilitamos
  @Input() isPlaying = false;      


  /* ------ eventos que el padre atenderá ------ */
  @Output() playClicked      = new EventEmitter<void>();
  @Output() loopToggled      = new EventEmitter<boolean>();
  @Output() webcamToggled    = new EventEmitter<boolean>();
  @Output() velocidadClicked = new EventEmitter<void>();

  /* delegamos la UI en emitir eventos simples */
  onPlay()              { if (!this.disabled) this.playClicked.emit(); }
  onLoop(ev: Event)     { if (!this.disabled) this.loopToggled.emit((ev.target as HTMLInputElement).checked); }
  onWebcam(ev: Event)   { this.webcamToggled.emit((ev.target as HTMLInputElement).checked); }
  onVelocidad()         { if (!this.disabled) this.velocidadClicked.emit(); }
}
