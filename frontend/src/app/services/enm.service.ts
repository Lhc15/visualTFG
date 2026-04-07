import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EnmPackId } from './enm.types';

@Injectable({ providedIn: 'root' })
export class EnmService {
  private _enm$ = new BehaviorSubject<EnmPackId | null>(null);
  readonly enm$ = this._enm$.asObservable();

  show(id: EnmPackId): void {
    this._enm$.next(id);
  }

  hide(): void {
    this._enm$.next(null);
  }
}