import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriasService } from '../services/categorias.service';
import { ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule,FormsModule],
  encapsulation: ViewEncapsulation.None,
      styleUrls: [
        './admin.component.scss'
      ],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2>Gestión de Categorías</h2>
        <button class="btn btn-success" (click)="toggleModal()">Agregar Categoría</button>
      </div>
      <div class="card-body">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let categoria of categorias">
              <td>{{ categoria._id }}</td>
              <td>{{ categoria.nombre }}</td>
              <td>
                <button class="btn btn-primary btn-sm me-2" (click)="editarCategoria(categoria)">Editar</button>
                <button class="btn btn-danger btn-sm" (click)="eliminarCategoria(categoria._id)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div *ngIf="showModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Editar Categoría' : 'Agregar Nueva Categoría' }}</h3>
        <form (ngSubmit)="submitForm()">
          <div class="form-group">
            <label for="nombre">Nombre</label>
            <input type="text" id="nombre" [(ngModel)]="nuevaCategoria.nombre" name="nombre" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="toggleModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">{{ isEditing ? 'Actualizar' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  `,
})

export class AdminCategoriasComponent implements OnInit {
  categorias: any[] = [];
  showModal = false;
  isEditing = false; // Variable para indicar si estamos editando
  nuevaCategoria = { nombre: '' }; // Propiedad para la nueva o editada categoría
  categoriaId: string | null = null; // Almacena el ID de la categoría que se está editando

  constructor(private categoriasService: CategoriasService) {}

  ngOnInit() {
    this.obtenerCategorias();
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
      this.isEditing = false; // Restablece el estado al cerrar el modal
      this.nuevaCategoria = { nombre: '' }; // Resetea el formulario
      this.categoriaId = null;
    }
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-backdrop') {
      this.toggleModal();
    }
  }

  submitForm() {
    if (this.isEditing) {
      // Editar categoría
      this.categoriasService.editarCategoria(this.categoriaId!, this.nuevaCategoria).subscribe({
        next: (data) => {
          console.log('Categoría actualizada:', data);
          const index = this.categorias.findIndex(c => c._id === this.categoriaId);
          if (index !== -1) {
            this.categorias[index] = data; // Actualiza la categoría en la lista
          }
          this.toggleModal();
        },
        error: (err) => {
          console.error('Error actualizando categoría:', err);
        },
      });
    } else {
      // Crear nueva categoría
      this.categoriasService.crearCategoria(this.nuevaCategoria).subscribe({
        next: (data) => {
          console.log('Categoría creada:', data);
          this.categorias.push(data.categoria); // Agrega la nueva categoría a la lista
          this.toggleModal();
        },
        error: (err) => {
          console.error('Error creando categoría:', err);
        },
      });
    }
  }

  editarCategoria(categoria: any) {
    this.isEditing = true; // Cambia el estado a edición
    this.categoriaId = categoria._id; // Almacena el ID de la categoría a editar
    this.nuevaCategoria = { nombre: categoria.nombre }; // Carga los datos en el formulario
    this.toggleModal(); // Abre el modal
  }

  eliminarCategoria(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      this.categoriasService.eliminarCategoria(id).subscribe({
        next: () => {
          console.log('Categoría eliminada:', id);
          this.categorias = this.categorias.filter((c) => c._id !== id);
        },
        error: (err) => {
          console.error('Error eliminando categoría:', err);
        },
      });
    }
  }
}

