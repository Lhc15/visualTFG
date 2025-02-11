import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse,HttpResponse  } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import {map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GltfService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Obtener un modelo GLTF por nombre de archivo
  getModelByFilename(filename: string): Observable<Blob> {
    const headers = new HttpHeaders({
      'Accept': 'model/gltf+json, application/octet-stream'
    });
  
    return this.http.get<Blob>(`${this.apiUrl}/gltf/animaciones/${filename}`, {
      headers,
      responseType: 'blob' as 'json', // Asegura que el tipo response sea interpretado como JSON
      withCredentials: true,
      observe: 'response'
    }).pipe(
      tap((response: HttpResponse<Blob>) => {
        console.log('Headers de respuesta:', response.headers);
        console.log('Modelo recibido correctamente');
      }),
      map((response: HttpResponse<Blob>) => response.body!), // Asegúrate de que el body no es null
      catchError(this.handleError)
    );
  }
  

  private handleError(error: HttpErrorResponse) {
    console.error('Error completo:', error);
    let errorMessage = 'Ha ocurrido un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Código de error: ${error.status}, mensaje: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Obtener la primera animación disponible
  getDefaultModel(): Observable<Blob> {
    return this.getModelByFilename('hola.gltf');
  }

  getAllGltfFiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/gltf/all`, { withCredentials: true });
  }
  

}
