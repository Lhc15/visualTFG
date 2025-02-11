import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private baseUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  obtenerCategorias(): Observable<any> {
    return this.http.get(`${this.baseUrl}`, { withCredentials: true });
  }

  crearCategoria(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}`, data, { withCredentials: true });
  }

  obtenerPalabrasPorCategoria(categoriaId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/palabras/categoria?categoria=${categoriaId}`, { withCredentials: true });
  }

  editarCategoria(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data, { withCredentials: true });
  }
  
  eliminarCategoria(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { withCredentials: true });
  }
  
}
