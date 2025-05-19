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

  //cambiarcontraseñadesdeperfil
  updatePassword(uid: string, payload: { currentPassword: string; newPassword: string }) {
    return this.http.put(`${this.apiUrl}/${uid}/password`, payload, { withCredentials: true });


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

  // In usuarios.service.ts
  updateUserLevel(userId: string, newLevel: number): Observable<any> {
    console.log(`Enviando actualización de nivel: ${newLevel} para usuario: ${userId}`);
    
    // Be explicit about what we're sending
    const payload = {
      newLevel: newLevel,
      preserveMaxLevel: true  // We always want to preserve the max level
    };
    
    console.log('Sending payload:', payload);
    
    return this.http.patch(
      `${this.apiUrl}/${userId}/nivel`, 
      payload, 
      { withCredentials: true }
    );
  }
  
  updateUserWordIndex(userId: string, newIndex: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${userId}/indice`, { newIndex }, { withCredentials: true });
  }

  explorarPalabraLibre(userId: string, wordId: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${userId}/explore-word/${wordId}`,
      {},
      { withCredentials: true }
    );
  }
  //obtenemos la categoria mas explorada por el usuario
  getCategoriaMasExplorada(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${userId}/categoria-mas-explorada`, { withCredentials: true });
  }

  obtenerPalabrasAprendidasPorNivel(id: string, nivel: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/palabras-aprendidas/${nivel}`, { withCredentials: true });
  }

  updateUserLastWordLearned(userId: string, lastWord: string): Observable<any> {
    // PATCH /api/usuarios/:id/lastWord  
    return this.http.patch(`${this.apiUrl}/${userId}/lastWord`, 
      { lastWord }, 
      { withCredentials: true }
    );
  }

  updateFirstTime(userId: string, isNew: boolean): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${userId}/first-time`,
      { isnewuser : isNew }, // el body
      { withCredentials: true }
    );
  }
  
  
  requestPasswordReset(email: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, { email });
  }

  resetPasswordWithToken(token: string, nuevaPassword: string) {
  return this.http.post(`${this.apiUrl}/auth/reset-password/${token}`, {
    nuevaPassword,
  });
}


  

}
