import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RegistroEjercicio {
  palabraId: string;
  vecesAcertada: number;
  vecesFallada: number;
}

@Injectable({ providedIn: 'root' })
export class ProgresoEjercicioService {
  private baseUrl = `${environment.apiUrl}/progreso-ejercicio`;

  constructor(private http: HttpClient) {}

  /** Devuelve el historial de ejercicios del usuario para una categoría */
  obtenerProgreso(categoriaId: string): Observable<RegistroEjercicio[]> {
    return this.http
      .get<{ ok: boolean; registros: RegistroEjercicio[] }>(
        `${this.baseUrl}?categoriaId=${categoriaId}`,
        { withCredentials: true }
      )
      .pipe(map(r => r.registros));
  }

  /** Registra el resultado de una pregunta */
  registrar(palabraId: string, categoriaId: string, acertada: boolean): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/registrar`,
      { palabraId, categoriaId, acertada },
      { withCredentials: true }
    );
  }
}