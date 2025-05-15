import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PalabrasService } from '../services/palabras.service';
import { ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoriasService } from '../services/categorias.service'; // Importa el servicio de categorías
import { GltfService } from '../services/gltf.service'; // <-- Importa el servicio

@Component({
  selector: 'app-admin-palabras',
  standalone: true,
  imports: [CommonModule,FormsModule],
  encapsulation: ViewEncapsulation.None,
    styleUrls: [
      './admin.component.scss'
    ],
  template: `
  <!-- Notificaciones de éxito y error -->
  <div class="container mt-3">
    <div *ngIf="mensajeExito" class="alert alert-success" role="alert">
      {{ mensajeExito }}
    </div>
    <div *ngIf="mensajeError" class="alert alert-danger" role="alert">
      {{ mensajeError }}
    </div>
  </div>

  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h2>Gestión de Palabras</h2>
      <button class="btn btn-success" (click)="toggleModal()">
        <i class="fas fa-plus"></i> Agregar Palabra
      </button>    
  </div>
    <div class="card-body">
      <!-- Tabla de palabras -->
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Palabra</th>
            <th>Categoria</th>
            <th>Explicación</th>
            <th>Nivel</th>
            <th>Orden</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let palabra of palabras">
            <td>{{ palabra.palabra }}</td>
            <td>{{ palabra.categoria?.nombre || 'Sin categoría' }}</td>
            <td>{{ palabra.explicacion || 'Sin explicación' }}</td>
            <td>{{ palabra.nivel || 1 }}</td>
            <td>{{ palabra.orden || 0 }}</td>  
            <td>
              <button class="btn btn-primary btn-sm me-2" (click)="editarPalabra(palabra)"> <i class="fas fa-edit"></i> Editar</button>
              <button class="btn btn-danger btn-sm" (click)="borrarPalabra(palabra._id)"> <i class="fas fa-trash-alt"></i> Eliminar</button>
              <button class="btn btn-info btn-sm" (click)="abrirAnimacionesModal(palabra)"> <i class="fas fa-link"></i> Enlazar Animaciones</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal -->
  <div *ngIf="showModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
    <div class="modal-content">
      <h3>{{ isEditing ? 'Editar Palabra' : 'Agregar Nueva Palabra' }}</h3>
      <form (ngSubmit)="submitForm()">
        <div class="form-group">
          <label for="palabra">Palabra</label>
          <input type="text" id="palabra" [(ngModel)]="nuevaPalabra.palabra" name="palabra" required />
        </div>
        <div class="form-group">
          <label for="explicacion">Explicación</label>
          <textarea
            id="explicacion"
            [(ngModel)]="nuevaPalabra.explicacion"
            name="explicacion"
            rows="3"
            placeholder="Añade una explicación para esta palabra (opcional)"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="categoria">Categoría</label>
          <select id="categoria" [(ngModel)]="nuevaPalabra.categoria" name="categoria">
            <option [ngValue]="null">Sin categoría</option>
            <option *ngFor="let categoria of categorias" [ngValue]="categoria._id">{{ categoria.nombre }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="nivel">Nivel</label>
          <input
            type="number"
            id="nivel"
            [(ngModel)]="nuevaPalabra.nivel"
            name="nivel"
            placeholder="Ej: 1, 2, 3..."
          />
        </div>

        <div class="form-group">
          <label for="orden">Orden</label>
          <input
            type="number"
            id="orden"
            [(ngModel)]="nuevaPalabra.orden"
            name="orden"
            placeholder="Ej: 1, 2, 3..."
          />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="toggleModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">{{ isEditing ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </form>
    </div>
  </div>

  <div 
  *ngIf="showAnimacionesModal" 
  class="modal-backdrop" 
  (click)="cerrarAnimacionesModal()"
  >
  <div class="modal-content" (click)="$event.stopPropagation()">
      <h3>Enlazar Animaciones a "{{ palabraSeleccionada?.palabra }}"</h3>

      <label for="prefijoSelect">Selecciona un prefijo</label>
      <select id="prefijoSelect" #prefijoSelect>
        <option *ngFor="let p of prefijos" [value]="p">{{ p }}</option>
      </select>

      <div class="form-actions mt-3">
        <button 
          class="btn btn-primary"
          (click)="asignarAnimacionesAPalabra()"
        >
          Guardar animaciones
        </button>
        <button class="btn btn-secondary" (click)="cerrarAnimacionesModal()">
          Cancelar
        </button>
      </div>
    </div>
  </div>

  `,
})

export class AdminPalabrasComponent implements OnInit {
  palabras: any[] = [];
  categorias: any[] = [];
  //mesajes exito o error
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  //animaciones
  nuevoGltf     = '';   // nombre del archivo .glb/.gltf
  nuevoClipName = '';   // nombre del clip dentro del modelo
  // Control del modal de palabra
  showModal = false;
  isEditing = false;
  nuevaPalabra = { palabra: '', categoria: null, explicacion: '', nivel: 1, orden: 0 };
  palabraId: string | null = null; 

  // -- NUEVAS PROPIEDADES PARA ANIMACIONES --
  showAnimacionesModal = false;        // Modal distinto para "enlazar animaciones"
  allGltfFiles: any[] = [];            // Aquí guardamos todos los GLTF files
  agrupaciones: { [prefijo: string]: any[] } = {}; 
  prefijos: string[] = [];            // Para mostrar en un <select> si quieres

  // Guardamos la palabra que está recibiendo las animaciones
  palabraSeleccionada: any = null;

  constructor(
    private palabrasService: PalabrasService, 
    private categoriasService: CategoriasService,
    private gltfService: GltfService
  ) {}

  ngOnInit() {
    this.obtenerPalabras();
    this.obtenerCategorias();
    this.cargarAllAnimaciones(); // Llamamos desde el inicio para tener la info
  }

  // Llamar al backend para conseguir todos los GLTF files
  cargarAllAnimaciones() {
    this.gltfService.getAllGltfFiles().subscribe({
      next: (files) => {
        console.log('Archivos GLTF recibidos:', files);
        this.allGltfFiles = files;
        this.agruparPorPrefijo();
      },
      error: (err) => {
        console.error('Error al cargar animaciones:', err);
      }
    });
  }

  // Función para agrupar por prefijo. Depende de cómo quieras "partir" el filename.
  agruparPorPrefijo() {
    // Reiniciamos las variables
    this.agrupaciones = {};
    this.prefijos = [];

    for (const file of this.allGltfFiles) {
      // Suponiendo que el prefijo es todo antes del primer '_'
      // Si tu convención es distinta, ajústala (por ejemplo, quitar la extensión .gltf)
      const filename = file.filename || '';
      const filenameSinExtension = filename.replace('.gltf', '');
      const [prefijo] = filenameSinExtension.split('_'); 
      
      if (!this.agrupaciones[prefijo]) {
        this.agrupaciones[prefijo] = [];
      }
      this.agrupaciones[prefijo].push(file);
    }

    // Con los keys del objeto armamos la lista de prefijos
    this.prefijos = Object.keys(this.agrupaciones);
  }

  obtenerPalabras() {
    this.palabrasService.obtenerPalabras().subscribe({
      next: (data) => {
        console.log('Palabras recibidas:', data);
        this.palabras = Array.isArray(data) ? data : data.palabras || [];
      },
      error: (err) => {
        console.error('Error al obtener palabras:', err);
      },
    });
  }

  obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => {
        console.log('Categorías recibidas:', data);
        this.categorias = Array.isArray(data) ? data : data.categorias || [];
      },
      error: (err) => {
        console.error('Error al obtener categorías:', err);
      },
    });
  }

  toggleModal() {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.isEditing = false; // Restablece el estado
      this.nuevaPalabra = { palabra: '', categoria: null, explicacion: '', nivel: 1, orden: 0 }; // Resetea el formulario
      this.palabraId = null;
    }
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-backdrop') {
      this.toggleModal();
    }
  }

  submitForm() {
    if (this.isEditing) {
        // Editar palabra existente
            this.palabrasService.editarPalabra(this.palabraId!, this.nuevaPalabra).subscribe({
            next: (data) => {
                console.log('Palabra actualizada:', data);
                const index = this.palabras.findIndex(p => p._id === this.palabraId);
                if (index !== -1) {
                    this.palabras[index] = data.palabra; // Actualiza la palabra en la lista
                }
                this.toggleModal();
            },
            error: (err) => {
                console.error('Error actualizando palabra:', err);
            },
        });
    } else {
        // Crear nueva palabra
        this.palabrasService.crearPalabra(this.nuevaPalabra).subscribe({
            next: (data) => {
                console.log('Palabra creada:', data);
                this.palabras.push(data.palabra); // Agrega la nueva palabra a la lista
                this.toggleModal();
            },
            error: (err) => {
                console.error('Error creando palabra:', err);
            },
        });
      }
  }

  editarPalabra(palabra: any) {
    this.isEditing = true; // Cambia a modo edición
    this.palabraId = palabra._id; // Almacena el ID de la palabra a editar
    this.nuevaPalabra = { palabra: palabra.palabra, categoria: palabra.categoria?._id || null, explicacion: palabra.explicacion || '', nivel: palabra.nivel || 1, orden: palabra.orden || 1 }; // Carga los datos en el formulario
    this.toggleModal(); // Abre el modal
  }

  borrarPalabra(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta palabra?')) {
      this.palabrasService.borrarPalabra(id).subscribe({
        next: () => {
          console.log('Palabra eliminada:', id);
          this.palabras = this.palabras.filter((p) => p._id !== id);
        },
        error: (err) => {
          console.error('Error eliminando palabra:', err);
        },
      });
    }
  }

  abrirAnimacionesModal(p: any) {            // p === palabra seleccionada
    this.palabraSeleccionada = p;
    this.nuevoGltf     = p.gltf     || '';
    this.nuevoClipName = p.clipName || '';
    this.showAnimacionesModal = true;
  }


  cerrarAnimacionesModal() {
    this.showAnimacionesModal = false;
    this.palabraSeleccionada = null;
  }

  // Cuando el usuario elige un prefijo y confirma:
  // Cuando el usuario elige un prefijo y confirma:
asignarAnimacionesAPalabra() {
  if (!this.palabraSeleccionada) { 
    this.mensajeError = 'No hay palabra seleccionada';
    setTimeout(() => this.mensajeError = null, 3000);
    return; 
  }

  // Obtener el prefijo seleccionado usando ViewChild o querySelector
  const selectElement = document.querySelector('#prefijoSelect') as HTMLSelectElement;
  if (!selectElement) {
    console.error('No se encontró el elemento select de prefijos');
    this.mensajeError = 'Error interno: No se encontró el selector de prefijos';
    setTimeout(() => this.mensajeError = null, 3000);
    return;
  }
  
  const prefijoSeleccionado = selectElement.value;
  console.log('Prefijo seleccionado:', prefijoSeleccionado);
  
  // Verificamos que el prefijo exista y tenga animaciones
  if (!prefijoSeleccionado) {
    this.mensajeError = 'Por favor selecciona un prefijo';
    setTimeout(() => this.mensajeError = null, 3000);
    return;
  }
  
  // Crear el nombre del archivo GLTF basado en el prefijo
  const nombreArchivo = `${prefijoSeleccionado}.gltf`;
  
  // Datos a enviar - IMPORTANTE: solo enviamos los campos que queremos actualizar
  const datos = {
    gltf: nombreArchivo,
    clipName: prefijoSeleccionado
  };
  
  console.log('ID de la palabra a actualizar:', this.palabraSeleccionada._id);
  console.log('Datos que se enviarán al servidor:', datos);

  // Verificar que el ID sea válido
  if (!this.palabraSeleccionada._id || this.palabraSeleccionada._id.trim() === '') {
    this.mensajeError = 'ID de palabra no válido';
    setTimeout(() => this.mensajeError = null, 3000);
    return;
  }

  this.palabrasService.asignarAnimacion(this.palabraSeleccionada._id, datos)
    .subscribe({
      next: resp => {
        console.log('Respuesta del servidor:', JSON.stringify(resp, null, 2));
        // actualiza la lista local
        const i = this.palabras.findIndex(p => p._id === this.palabraSeleccionada._id);
        if (i >= 0) { 
          this.palabras[i] = resp.palabra; 
        }
        this.mensajeExito = 'Animación asignada correctamente';
        setTimeout(() => this.mensajeExito = null, 3000);
        this.cerrarAnimacionesModal();
      },
      error: err => {
        console.error('Error al guardar la animación:', err);
        
        // Extraer mensaje de error detallado
        let mensajeError = 'Error desconocido';
        if (err.error) {
          if (err.error.msg) {
            mensajeError = err.error.msg;
          } else if (err.error.errores) {
            // Si hay errores de validación específicos
            const erroresClaves = Object.keys(err.error.errores);
            if (erroresClaves.length > 0) {
              mensajeError = `Error en: ${erroresClaves.join(', ')}`;
            }
          }
        }
        
        this.mensajeError = `Error al guardar la animación: ${mensajeError}`;
        setTimeout(() => this.mensajeError = null, 3000);
      }
    });
}


}

