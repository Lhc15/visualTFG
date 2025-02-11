import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  // Obtener todos los usuarios
  getUsuarios(): Observable<any> {
    return this.http.get(this.apiUrl, { withCredentials: true });
  }

  // Obtener un usuario por ID
  getUsuario(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // Crear un nuevo usuario
  createUsuario(usuario: any): Observable<any> {
    return this.http.post(this.apiUrl, usuario, { withCredentials: true });
  }

  // Actualizar un usuario por ID
  updateUsuario(id: string, usuario: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, usuario, { withCredentials: true });
  }

  // Eliminar un usuario por ID
  deleteUsuario(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // Registro de un nuevo usuario
  register(user: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/usuarios`, user, { withCredentials: true });
  }

  // Iniciar sesión de usuario
  login(user: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/login`, user, { withCredentials: true });
  }

  // Cerrar sesión
  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/login/logout`, {}, { withCredentials: true });
  }

  // Obtener usuario autenticado
  getAuthenticatedUser(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/login/usuario`, { withCredentials: true });
  }
}
