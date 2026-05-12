import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EstadoDesbloqueo {
  /** true si todas las palabras de las categorías de vocabulario han sido vistas */
  vocabularioCompleto: boolean;
  /** número de bloques de Comunicación completados (0..N) */
  bloquesCompletados: number;
  /** true si el bloque 1 está completado → desbloquea Practica Gramática */
  bloque1Completado: boolean;
  /** true si TODOS los bloques están completados → desbloquea Conversamos */
  todosComunicacionCompletos: boolean;
}

const TOTAL_BLOQUES_COMUNICACION = 11;

@Injectable({ providedIn: 'root' })
export class DesbloqueoService {
  private vocabUrl    = `${environment.apiUrl}/progreso-vocabulario`;
  private categUrl    = `${environment.apiUrl}/categorias`;
  private comunUrl    = `${environment.apiUrl}/progreso-comunicacion`;

  constructor(private http: HttpClient) {}

  obtenerEstado(): Observable<EstadoDesbloqueo> {
    const vistas$   = this.http
      .get<{ ok: boolean; palabrasVistas: string[] }>(`${this.vocabUrl}?modulo=vocabulario`, { withCredentials: true })
      .pipe(map(r => r.palabrasVistas), catchError(() => of([] as string[])));

    const cats$     = this.http
      .get<any[]>(this.categUrl, { withCredentials: true })
      .pipe(
        map(cats => cats.filter((c: any) => c.modulo === 'vocabulario')),
        catchError(() => of([] as any[]))
      );

    const bloques$  = this.http
      .get<{ ok: boolean; completados: { bloqueId: string; fechaCompletado: string }[] }>(
        this.comunUrl, { withCredentials: true }
      )
      .pipe(map(r => r.completados ?? []), catchError(() => of([] as any[])));

    return combineLatest([vistas$, cats$, bloques$]).pipe(
      map(([vistas, cats, completados]) => {
        const totalPalabras = cats.reduce((acc: number, c: any) => acc + (c.totalPalabras ?? 0), 0);
        const vocabularioCompleto = totalPalabras > 0 && vistas.length >= totalPalabras;

        const bloquesCompletados = completados.length;
        const bloque1Completado  = completados.some((b: any) => b.bloqueId === 'enm');
        const todosComunicacionCompletos = bloquesCompletados >= TOTAL_BLOQUES_COMUNICACION;

        return { vocabularioCompleto, bloquesCompletados, bloque1Completado, todosComunicacionCompletos };
      })
    );
  }
}