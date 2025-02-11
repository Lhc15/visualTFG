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
      <button class="btn btn-success" (click)="toggleModal()">Agregar Palabra</button>
    </div>
    <div class="card-body">
      <!-- Tabla de palabras -->
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Palabra</th>
            <th>Explicación</th>
            <th>Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let palabra of palabras">
            <td>{{ palabra._id }}</td>
            <td>{{ palabra.palabra }}</td>
            <td>{{ palabra.categoria?.nombre || 'Sin categoría' }}</td>
            <td>{{ palabra.explicacion || 'Sin explicación' }}</td>
            <td>
              <button class="btn btn-primary btn-sm me-2" (click)="editarPalabra(palabra)">Editar</button>
              <button class="btn btn-danger btn-sm" (click)="borrarPalabra(palabra._id)">Eliminar</button>
              <button class="btn btn-info btn-sm" (click)="abrirAnimacionesModal(palabra)">Enlazar Animaciones</button>
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
          (click)="asignarAnimacionesAPalabra(prefijoSelect.value)"
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
  
  // Control del modal de palabra
  showModal = false;
  isEditing = false;
  nuevaPalabra = { palabra: '', categoria: null, explicacion: '' };
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
      this.nuevaPalabra = { palabra: '', categoria: null, explicacion: '' }; // Resetea el formulario
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
    this.nuevaPalabra = { palabra: palabra.palabra, categoria: palabra.categoria?._id || null, explicacion: palabra.explicacion || '' }; // Carga los datos en el formulario
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

  abrirAnimacionesModal(palabra: any) {
    this.palabraSeleccionada = palabra;
    this.showAnimacionesModal = true;
  }

  cerrarAnimacionesModal() {
    this.showAnimacionesModal = false;
    this.palabraSeleccionada = null;
  }

  // Cuando el usuario elige un prefijo y confirma:
  asignarAnimacionesAPalabra(prefijo: string) {
    if (!this.palabraSeleccionada || !this.agrupaciones[prefijo]) return;

    // Obtenemos los IDs de los GLTF files
    const animacionesIds = this.agrupaciones[prefijo].map(file => file._id);

    const datosActualizados = {
      // conservamos la palabra y categoría actual si no quieres sobrescribir
      palabra: this.palabraSeleccionada.palabra,
      categoria: this.palabraSeleccionada.categoria?._id || null,
      // agregamos la propiedad animaciones
      animaciones: animacionesIds
    };

    // Llamamos al servicio para actualizar la palabra
    this.palabrasService.editarPalabra(this.palabraSeleccionada._id, datosActualizados)
      .subscribe({
        next: (respuesta) => {
          console.log('Palabra actualizada con animaciones:', respuesta);
          // Actualizamos en local
          const i = this.palabras.findIndex(p => p._id === this.palabraSeleccionada._id);
          if (i >= 0) {
            this.palabras[i] = respuesta.palabra; // o la estructura que devuelva
          }
          const nombrePalabra = this.palabraSeleccionada?.palabra;
          this.cerrarAnimacionesModal();
          
          this.mensajeExito = `Animaciones asignadas correctamente a "${nombrePalabra}".`;
          setTimeout(() => this.mensajeExito = null, 3000);

        },
        error: (err) => {
          console.error('Error al asignar animaciones:', err);
          this.mensajeError = 'Ocurrió un error al asignar las animaciones.';
          setTimeout(() => this.mensajeError = null, 3000);
        }
      });
  }


}

