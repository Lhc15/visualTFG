import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector   : 'app-tool-menu',
  standalone : true,
  imports    : [CommonModule],
  templateUrl: './tool-menu.component.html',
  styleUrls  : ['./tool-menu.component.css']
})
export class ToolMenuComponent {
  @Input() isLooping   = false;
  @Input() showWebcam  = false;
  @Input() disabled    = false;
  @Input() isPlaying   = false;
  @Input() currentPlaybackRate = 1;

  @Output() playClicked   = new EventEmitter<void>();
  @Output() loopToggled   = new EventEmitter<boolean>();
  @Output() webcamToggled = new EventEmitter<boolean>();
  @Output() rateChange    = new EventEmitter<number>();

  velocSliderVisible = false;

  onPlay()            { if (!this.disabled) this.playClicked.emit(); }
  onLoop(ev: Event)   { this.loopToggled.emit((ev.target as HTMLInputElement).checked); }
  onWebcam(ev: Event) { this.webcamToggled.emit((ev.target as HTMLInputElement).checked); }

  onToggleVeloc(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.velocSliderVisible = checked;
  }

  setPlaybackRate(rate: number) {
    this.rateChange.emit(rate);
  }
}
