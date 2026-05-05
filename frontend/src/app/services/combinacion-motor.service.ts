import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CombinacionMotor {
  _id: string;
  sujetoId:  { _id: string; palabra: string; tiposLexicos: string[] };
  verboId:   { _id: string; palabra: string; tiposLexicos: string[] };
  objetoId:  { _id: string; palabra: string; tiposLexicos: string[] } | null;
  interrId:  { _id: string; palabra: string; tiposLexicos: string[] } | null;
  plantilla: 'afirmativa' | 'pregunta-sn' | 'pregunta-wh';
  enm: string | null;
  valida: boolean | null;
  revisada: boolean;
  notas: string;
}

export interface ListarResponse {
  ok: boolean;
  combinaciones: CombinacionMotor[];
  total: number;
  sinRevisar: number;
  page: number;
  limit: number;
}

export interface StatsResponse {
  ok: boolean;
  total: number;
  sinRevisar: number;
  validas: number;
  invalidas: number;
}

export interface EjercicioMotor {
  _id: string;
  tipo: 'fichas';
  bloqueId: string;
  plantilla: string;
  pregunta: string;
  fichas: { texto: string; rol: string; palabraId: string }[];
  ordenCorrecto: string[];
  conEnm: boolean;
  enmCorrecto: string | null;
  enmAbreAvatar: string | null;
  distractores: any[];
}

@Injectable({ providedIn: 'root' })
export class CombinacionMotorService {
  private base = `${environment.apiUrl}/combinaciones-motor`;

  constructor(private http: HttpClient) {}

  regenerar(): Observable<any> {
    return this.http.post(`${this.base}/regenerar`, {}, { withCredentials: true });
  }

  stats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/stats`, { withCredentials: true });
  }

  listar(filtro = 'todas', page = 1, limit = 50): Observable<ListarResponse> {
    const params = new HttpParams()
      .set('filtro', filtro)
      .set('page',   String(page))
      .set('limit',  String(limit));
    return this.http.get<ListarResponse>(this.base, { params, withCredentials: true });
  }

  actualizar(id: string, cambios: { valida?: boolean | null; revisada?: boolean; notas?: string }): Observable<any> {
    return this.http.patch(`${this.base}/${id}`, cambios, { withCredentials: true });
  }

  generarEjercicios(bloqueId: string): Observable<{ ok: boolean; bloqueId: string; ejercicios: EjercicioMotor[] }> {
    return this.http.get<any>(`${this.base}/ejercicios/${bloqueId}`, { withCredentials: true });
  }
}