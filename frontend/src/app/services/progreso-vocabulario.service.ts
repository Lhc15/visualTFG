import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProgresoVocabularioService {
  private baseUrl = `${environment.apiUrl}/progreso-vocabulario`;

  constructor(private http: HttpClient) {}

  /** Devuelve el array de palabraId (strings) que el usuario ya ha reproducido */
  obtenerProgreso(modulo?: 'vocabulario' | 'abecedario'): Observable<string[]> {
    const params = modulo ? `?modulo=${modulo}` : '';
    return this.http
      .get<{ ok: boolean; palabrasVistas: string[] }>(`${this.baseUrl}${params}`, { withCredentials: true })
      .pipe(map(r => r.palabrasVistas));
  }

  /** Marca una palabra como vista. Idempotente. */
  marcarVista(palabraId: string, modulo: 'vocabulario' | 'abecedario'): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/marcar`,
      { palabraId, modulo },
      { withCredentials: true }
    );
  }
}