import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private statsUrl = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  startLevel(userId: string, level: number, mode: string = 'guiado'): Observable<any> {
    return this.http.post(`${this.statsUrl}/start-level`, { userId, level, mode }, { withCredentials: true });
  }
  
  

  endLevel(statsId: string): Observable<any> {
    return this.http.patch(`${this.statsUrl}/end-level/${statsId}`, {}, { withCredentials: true });
  }

  // stats.service.ts
  startMode(userId: string, mode: string, level?: number): Observable<any> {
    return this.http.post(`${this.statsUrl}/start-mode`, { userId, mode, level }, { withCredentials: true });
  }

  endMode(statsId: string): Observable<any> {
    return this.http.patch(`${this.statsUrl}/end-mode/${statsId}`, {}, { withCredentials: true });
  }

  getTiempoTotalLibre(userId: string): Observable<any> {
    return this.http.get(`${this.statsUrl}/libre-total/${userId}`, { withCredentials: true });
  }

  getSesionesDiarias(): Observable<any> {
    return this.http.get(`${this.statsUrl}/sesiones-diarias`, { withCredentials: true });
  }

  getProporcionUsuarios(): Observable<any> {
    return this.http.get(`${this.statsUrl}/proporcion-usuarios`, { withCredentials: true });
  }

  // Añadir al archivo stats.service.ts
  getHorasPico(): Observable<any> {
    return this.http.get(`${this.statsUrl}/horas-pico`, { withCredentials: true });
  }

  getScoreDistribution(): Observable<{ _id: number, count: number }[]> {
    return this.http.get<{ ok: boolean, data: { _id: number, count: number }[] }>(
      `${this.statsUrl}/scores-distribution`,
      { withCredentials: true }
    ).pipe(
      map(resp => resp.data)
    );
  }

  getTopFailedWords(): Observable<{ palabra: string, fails: number }[]> {
    return this.http
      .get<{ ok: boolean, data: { palabra: string, fails: number }[] }>(
        `${this.statsUrl}/top-failed-words`,
        { withCredentials: true }
      )
      .pipe(map(resp => resp.data));
  }

  getPerformanceEvolution(): Observable<{ _id: string, avgCorrectRate: number }[]> {
    return this.http.get<{ ok: boolean, data: { _id: string, avgCorrectRate: number }[] }>(
      `${this.statsUrl}/performance-evolution`,
      { withCredentials: true }
    ).pipe(
      map(resp => resp.data)
    );
  }


  recordCategoryEntry(categoryId: string): Observable<any> {
    return this.http.post(
      `${this.statsUrl}/category-entry`,
      { categoryId },
      { withCredentials: true }
    );
  }

  getPopularCategories(limit: number = 5): Observable<{ categoria: string, count: number }[]> {
    return this.http.get<{ ok: boolean, data: { categoria: string, count: number }[] }>(
      `${this.statsUrl}/popular-categories?limit=${limit}`,
      { withCredentials: true }
    ).pipe(map(resp => resp.data));
  }

  recordWordEntry(palabraId: string): Observable<any> {
    return this.http.post(
      `${this.statsUrl}/word-entry`,
      { palabraId },
      { withCredentials: true }
    );
  }
  
  getPopularWords(limit: number = 10): Observable<{ palabra: string, count: number }[]> {
    return this.http.get<{ ok: boolean, data: { palabra: string, count: number }[] }>(
      `${this.statsUrl}/popular-words?limit=${limit}`,
      { withCredentials: true }
    ).pipe(map(resp => resp.data));
  }

  startCategorySession(categoryId: string): Observable<{sessionId: string}> {
    return this.http.post<{sessionId: string}>(
      `${this.statsUrl}/start-category`,
      { categoryId },
      { withCredentials: true }
    );
  }
  endCategorySession(sessionId: string): Observable<{durationMs: number}> {
    return this.http.patch<{durationMs: number}>(
      `${this.statsUrl}/end-category/${sessionId}`,
      {},
      { withCredentials: true }
    );
  }
  getTimeByCategory(): Observable<{category: string, avgMin: number}[]> {
    return this.http.get<{ ok: boolean, data: {category:string,avgMin:number}[] }>(
      `${this.statsUrl}/time-by-category`,
      { withCredentials: true }
    ).pipe(map(r => r.data));
  }

  getVersusDaily(): Observable<{ _id: string, partidas: number }[]> {
    return this.http
      .get<{ ok: boolean, data: { _id: string, partidas: number }[] }>(
        `${this.statsUrl}/versus-daily`,
        { withCredentials: true }
      )
      .pipe(map(resp => resp.data));
  }

  getMyExamStats(): Observable<{ correctas: number; incorrectas: number }> {
    return this.http
      .get<{ ok: boolean; data: { correctas: number; incorrectas: number } }>(
        `${this.statsUrl}/my-exam`,
        { withCredentials: true }
      )
      .pipe(map(r => r.data));
  }

  getLoginStats(): Observable<{ totalDays: number; currentStreak: number; maxStreak: number }> {
    return this.http.get<{ ok: boolean, data: { totalDays: number; currentStreak: number; maxStreak: number } }>(
      `${this.statsUrl}/login-stats`, { withCredentials: true }
    ).pipe(map(r => r.data));
  }
  
  getTopLearnedWords(): Observable<{ palabra: string, count: number }[]> {
    return this.http
      .get<{ ok: boolean, data: { palabra: string, count: number }[] }>(
        `${this.statsUrl}/top-learned-words`,
        { withCredentials: true }
      )
      .pipe(map(resp => resp.data));
  }
  
  getTopVersusPlayers(): Observable<{ player: string, wins: number }[]> {
    return this.http
      .get<{ ok: boolean; data: { player: string; wins: number }[] }>(
        `${this.statsUrl}/top-versus-players`,
        { withCredentials: true }
      )
      .pipe(map(resp => resp.data));
  }

  endVersus(payload: {
    player1Id: string;
    player1Name: string;
    player2Id: string;
    player2Name: string;
    winnerId:   string;
    winnerName: string;
  }): Observable<any> {
    return this.http.post(
      `${this.statsUrl}/end-versus`,
      payload,
      { withCredentials: true }
    );
  }

  getCompletedLevels(): Observable<number> {
    return this.http
      .get<{ ok: boolean, completedLevels: number }>(
        `${this.statsUrl}/levels-completed`,
        { withCredentials: true }
      )
      .pipe(map(resp => resp.completedLevels));
  }

  // ── Progreso de Comunicación ─────────────────────────────
  getProgresoComunicacion(): Observable<{ bloqueId: string, fechaCompletado: string }[]> {
    return this.http
      .get<{ ok: boolean, completados: { bloqueId: string, fechaCompletado: string }[] }>(
        `${environment.apiUrl}/progreso-comunicacion`,
        { withCredentials: true }
      )
      .pipe(map(r => r.completados));
  }

  completarBloqueComun(bloqueId: string): Observable<{ ok: boolean, bloqueId: string }> {
    return this.http.post<{ ok: boolean, bloqueId: string }>(
      `${environment.apiUrl}/progreso-comunicacion/completar`,
      { bloqueId },
      { withCredentials: true }
    );
  }

}