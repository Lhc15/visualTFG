import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewEncapsulation } from '@angular/core';
import { CategoriasService } from '../services/categorias.service';

const MODULOS = [
  { value: 'abecedario',  label: 'Abecedario' },
  { value: 'vocabulario', label: 'Aprende / Vocabulario' },
  { value: 'gramatica',   label: 'Aprende / Gramática' }
];

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./admin.component.scss'],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2>Gestión de Categorías</h2>
        <button class="btn btn-success" (click)="toggleModal()">
          <i class="fas fa-plus"></i> Agregar Categoría
        </button>
      </div>
      <div class="card-body">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Módulo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let categoria of categorias">
              <td>{{ categoria.nombre }}</td>
              <td>
                <span *ngIf="categoria.modulo" class="badge bg-secondary">
                  {{ moduloLabel(categoria.modulo) }}
                </span>
                <span *ngIf="!categoria.modulo" class="text-muted">—</span>
              </td>
              <td>
                <button class="btn btn-primary btn-sm me-2" (click)="editarCategoria(categoria)">
                  <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-sm" (click)="eliminarCategoria(categoria._id)">
                  <i class="fas fa-trash-alt"></i> Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div *ngIf="showModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>{{ isEditing ? 'Editar Categoría' : 'Agregar Nueva Categoría' }}</h3>
        <form (ngSubmit)="submitForm()">

          <div class="form-group">
            <label>Nombre</label>
            <input type="text" [(ngModel)]="nuevaCategoria.nombre" name="nombre" required />
          </div>

          <div class="form-group">
            <label>Módulo de la app</label>
            <select [(ngModel)]="nuevaCategoria.modulo" name="modulo">
              <option [ngValue]="null">Sin asignar</option>
              <option *ngFor="let m of modulos" [ngValue]="m.value">{{ m.label }}</option>
            </select>
            <small class="text-muted">
              Indica en qué sección de la app aparece este grupo de palabras.
            </small>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="toggleModal()">Cancelar</button>
            <button type="submit"  class="btn btn-primary">{{ isEditing ? 'Actualizar' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AdminCategoriasComponent implements OnInit {
  categorias: any[] = [];
  modulos = MODULOS;

  showModal  = false;
  isEditing  = false;
  categoriaId: string | null = null;
  nuevaCategoria: any = { nombre: '', modulo: null };

  constructor(private categoriasService: CategoriasService) {}

  ngOnInit() { this.obtenerCategorias(); }

  moduloLabel(value: string): string {
    return MODULOS.find(m => m.value === value)?.label || value;
  }

  obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => { this.categorias = Array.isArray(data) ? data : data.categorias || []; },
      error: (err)  => { console.error('Error al obtener categorías:', err); }
    });
  }

  toggleModal() {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.isEditing   = false;
      this.categoriaId = null;
      this.nuevaCategoria = { nombre: '', modulo: null };
    }
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-backdrop') this.toggleModal();
  }

  submitForm() {
    if (this.isEditing) {
      this.categoriasService.editarCategoria(this.categoriaId!, this.nuevaCategoria).subscribe({
        next: (data) => {
          const i = this.categorias.findIndex(c => c._id === this.categoriaId);
          if (i !== -1) this.categorias[i] = data;
          this.toggleModal();
        },
        error: (err) => { console.error('Error actualizando categoría:', err); }
      });
    } else {
      this.categoriasService.crearCategoria(this.nuevaCategoria).subscribe({
        next: (data) => { this.categorias.push(data.categoria); this.toggleModal(); },
        error: (err)  => { console.error('Error creando categoría:', err); }
      });
    }
  }

  editarCategoria(categoria: any) {
    this.isEditing   = true;
    this.categoriaId = categoria._id;
    this.nuevaCategoria = { nombre: categoria.nombre, modulo: categoria.modulo || null };
    this.toggleModal();
  }

  eliminarCategoria(id: string) {
    if (confirm('¿Eliminar esta categoría?')) {
      this.categoriasService.eliminarCategoria(id).subscribe({
        next: () => { this.categorias = this.categorias.filter(c => c._id !== id); },
        error: (err) => { console.error('Error eliminando categoría:', err); }
      });
    }
  }
}