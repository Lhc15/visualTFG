import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DescripcionPayload {
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class DescripcionService {
  private _desc$ = new BehaviorSubject<DescripcionPayload | null>(null);
  readonly desc$ = this._desc$.asObservable();

  show(texto: string): void {
    this._desc$.next({ texto });
  }

  hide(): void {
    this._desc$.next(null);
  }
}