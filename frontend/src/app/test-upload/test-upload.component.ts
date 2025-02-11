import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common'; // Importar CommonModule

@Component({
  selector: 'app-test-upload',
  standalone: true,
  templateUrl: './test-upload.component.html',
  styleUrls: ['./test-upload.component.css'],
  imports: [CommonModule],
})
export class TestUploadComponent {
  selectedFiles: File[] = [];
  uploadedFiles: string[] = []; // Archivos ya subidos

  constructor(private http: HttpClient) {}

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;

    // Añadir nuevos archivos sin duplicados
    Array.from(files).forEach((file) => {
      if (
        !this.selectedFiles.some((f) => f.name === file.name) &&
        (file.type === 'model/gltf+json' || file.name.endsWith('.gltf'))
      ) {
        this.selectedFiles.push(file);
      }
    });

    // Limpia el input para que pueda seleccionar los mismos archivos si quiere
    event.target.value = '';
  }

  uploadFiles(event: Event) {
    event.preventDefault();

    if (this.selectedFiles.length > 0) {
      const formData = new FormData();
      this.selectedFiles.forEach((file) => formData.append('files', file));

      const uploadUrl = `${environment.apiUrl}/gltf/upload`;

      this.http.post(uploadUrl, formData, {
        withCredentials: true,
        observe: 'response',
      }).subscribe({
        next: (response) => {
          console.log('Archivos subidos:', response);
          alert('Archivos subidos correctamente');

          // Marca los archivos como subidos
          this.selectedFiles.forEach((file) => {
            if (!this.uploadedFiles.includes(file.name)) {
              this.uploadedFiles.push(file.name);
            }
          });

          // Limpia la lista de archivos seleccionados
          this.selectedFiles = [];
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error completo:', error);
          alert(`Error al subir los archivos: Código ${error.status}`);
        },
      });
    } else {
      alert('Por favor selecciona al menos un archivo.');
    }
  }
}
