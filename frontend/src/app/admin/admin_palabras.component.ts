import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewEncapsulation } from '@angular/core';
import { PalabrasService } from '../services/palabras.service';
import { CategoriasService } from '../services/categorias.service';
import { GltfService } from '../services/gltf.service';

const TIPOS_LEXICOS = ['S', 'O', 'V', 'ADJ', 'INT', 'FX', 'ADV'];
const TIPOS_LABELS: Record<string, string> = {
  S:   'Sujeto',
  O:   'Objeto',
  V:   'Verbo',
  ADJ: 'Adjetivo',
  INT: 'Partícula int.',
  FX:  'Fórmula fija',
  ADV: 'Adverbio'
};

@Component({
  selector: 'app-admin-palabras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./admin.component.scss'],
  template: `
  <div class="container mt-3">
    <div *ngIf="mensajeExito" class="alert alert-success">{{ mensajeExito }}</div>
    <div *ngIf="mensajeError"  class="alert alert-danger">{{ mensajeError }}</div>
  </div>

  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h2>Gestión de Palabras</h2>
      <button class="btn btn-success" (click)="toggleModal()">
        <i class="fas fa-plus"></i> Agregar Palabra
      </button>
    </div>
    <div class="card-body">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Palabra</th>
            <th>Categoría</th>
            <th>Nivel</th>
            <th>Tipos léxicos</th>
            <th>En motor</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let palabra of palabras">
            <td>{{ palabra.palabra }}</td>
            <td>{{ palabra.categoria?.nombre || '—' }}</td>
            <td>{{ palabra.nivel || 1 }}</td>
            <td>
              <span *ngFor="let t of (palabra.tiposLexicos || [])"
                    class="badge bg-secondary me-1">{{ t }}</span>
              <span *ngIf="!palabra.tiposLexicos?.length" class="text-muted">—</span>
            </td>
            <td>
              <span [class]="palabra.enMotor ? 'badge bg-success' : 'badge bg-light text-dark'">
                {{ palabra.enMotor ? 'Sí' : 'No' }}
              </span>
            </td>
            <td>
              <button class="btn btn-primary btn-sm me-1"   (click)="editarPalabra(palabra)">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button class="btn btn-danger btn-sm me-1"    (click)="borrarPalabra(palabra._id)">
                <i class="fas fa-trash-alt"></i> Eliminar
              </button>
              <button class="btn btn-info btn-sm"           (click)="abrirAnimacionesModal(palabra)">
                <i class="fas fa-link"></i> Animación
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal crear / editar palabra -->
  <div *ngIf="showModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
    <div class="modal-content" (click)="$event.stopPropagation()">
      <h3>{{ isEditing ? 'Editar Palabra' : 'Agregar Nueva Palabra' }}</h3>
      <form (ngSubmit)="submitForm()">

        <div class="form-group">
          <label>Palabra</label>
          <input type="text" [(ngModel)]="nuevaPalabra.palabra" name="palabra" required />
        </div>

        <div class="form-group">
          <label style="display:flex; align-items:center; gap:8px;">
            Descripción manual
            <input type="checkbox" [(ngModel)]="nuevaPalabra.usarDescripcion" name="usarDescripcion"
              style="width:16px;height:16px;cursor:pointer;" title="Mostrar al reproducir">
            <small class="text-muted" style="font-weight:400;">Mostrar al reproducir</small>
          </label>
          <textarea [(ngModel)]="nuevaPalabra.descripcion" name="descripcion" rows="3"
            placeholder="Texto que aparecerá al reproducir la animación (opcional)"></textarea>
        </div>

        <div class="form-group">
          <label>Categoría</label>
          <select [(ngModel)]="nuevaPalabra.categoria" name="categoria" [compareWith]="compareCat">
            <option [ngValue]="null">Sin categoría</option>
            <option *ngFor="let c of categorias" [ngValue]="c._id">{{ c.nombre }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Orden</label>
          <input type="number" [(ngModel)]="nuevaPalabra.orden" name="orden" />
        </div>

        <!-- Tipos léxicos -->
        <div class="form-group">
          <label>Tipos léxicos</label>
          <div class="d-flex flex-wrap gap-2 mt-1">
            <div *ngFor="let tipo of tiposDisponibles" class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="checkbox"
                [id]="'tipo-' + tipo"
                [checked]="nuevaPalabra.tiposLexicos.includes(tipo)"
                (change)="toggleTipo(tipo)"
              />
              <label class="form-check-label" [for]="'tipo-' + tipo">
                {{ tipo }} <small class="text-muted">({{ tiposLabels[tipo] }})</small>
              </label>
            </div>
          </div>
        </div>

        <!-- En motor -->
        <div class="form-group">
          <div class="form-check form-switch mt-2">
            <input
              class="form-check-input"
              type="checkbox"
              id="enMotor"
              [(ngModel)]="nuevaPalabra.enMotor"
              name="enMotor"
            />
            <label class="form-check-label" for="enMotor">
              <strong>Disponible en el motor de práctica</strong>
              <small class="text-muted d-block">
                Actívalo solo cuando la animación Blender esté lista
              </small>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="toggleModal()">Cancelar</button>
          <button type="submit"  class="btn btn-primary">{{ isEditing ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal animaciones -->
  <div *ngIf="showAnimacionesModal" class="modal-backdrop" (click)="cerrarAnimacionesModal()">
    <div class="modal-content" (click)="$event.stopPropagation()">
      <h3>Enlazar Animación a "{{ palabraSeleccionada?.palabra }}"</h3>
      <label for="prefijoSelect">Selecciona un prefijo</label>
      <select id="prefijoSelect" #prefijoSelect>
        <option *ngFor="let p of prefijos" [value]="p">{{ p }}</option>
      </select>
      <div class="form-actions mt-3">
        <button class="btn btn-primary"   (click)="asignarAnimacionesAPalabra()">Guardar animación</button>
        <button class="btn btn-secondary" (click)="cerrarAnimacionesModal()">Cancelar</button>
      </div>
    </div>
  </div>
  `
})
export class AdminPalabrasComponent implements OnInit {
  palabras: any[]    = [];
  categorias: any[]  = [];
  mensajeExito: string | null = null;
  mensajeError:  string | null = null;

  tiposDisponibles = TIPOS_LEXICOS;
  tiposLabels      = TIPOS_LABELS;

  showModal = false;
  isEditing = false;
  palabraId: string | null = null;

  nuevaPalabra: any = {
    palabra: '', descripcion: '', usarDescripcion: false, categoria: null,
    orden: 0, tiposLexicos: [], enMotor: false
  };

  showAnimacionesModal = false;
  palabraSeleccionada: any = null;
  allGltfFiles: any[] = [];
  agrupaciones: { [prefijo: string]: any[] } = {};
  prefijos: string[] = [];

  nuevoGltf     = '';
  nuevoClipName = '';

  constructor(
    private palabrasService: PalabrasService,
    private categoriasService: CategoriasService,
    private gltfService: GltfService
  ) {}

  ngOnInit() {
    this.obtenerPalabras();
    this.obtenerCategorias();
    this.cargarAllAnimaciones();
  }

  compareCat(a: any, b: any): boolean {
    if (!a || !b) return a === b;
    return a.toString() === b.toString();
  }

  toggleTipo(tipo: string) {
    const idx = this.nuevaPalabra.tiposLexicos.indexOf(tipo);
    if (idx === -1) {
      this.nuevaPalabra.tiposLexicos.push(tipo);
    } else {
      this.nuevaPalabra.tiposLexicos.splice(idx, 1);
    }
  }

  obtenerPalabras() {
    this.palabrasService.obtenerPalabras().subscribe({
      next: (data) => { this.palabras = Array.isArray(data) ? data : data.palabras || []; },
      error: (err)  => { console.error('Error al obtener palabras:', err); }
    });
  }

  obtenerCategorias() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => { this.categorias = Array.isArray(data) ? data : data.categorias || []; },
      error: (err)  => { console.error('Error al obtener categorías:', err); }
    });
  }

  cargarAllAnimaciones() {
    this.gltfService.getAllGltfFiles().subscribe({
      next: (files) => { this.allGltfFiles = files; this.agruparPorPrefijo(); },
      error: (err)  => { console.error('Error al cargar animaciones:', err); }
    });
  }

  agruparPorPrefijo() {
    this.agrupaciones = {};
    for (const file of this.allGltfFiles) {
      const filename  = (file.filename || '').replace('.gltf', '');
      const [prefijo] = filename.split('_');
      if (!this.agrupaciones[prefijo]) this.agrupaciones[prefijo] = [];
      this.agrupaciones[prefijo].push(file);
    }
    this.prefijos = Object.keys(this.agrupaciones);
  }

  toggleModal() {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.isEditing = false;
      this.palabraId = null;
      this.nuevaPalabra = { palabra: '', descripcion: '', usarDescripcion: false, categoria: null, orden: 0, tiposLexicos: [], enMotor: false };
    }
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-backdrop') this.toggleModal();
  }

  submitForm() {
    if (this.isEditing) {
      this.palabrasService.editarPalabra(this.palabraId!, this.nuevaPalabra).subscribe({
        next: (data) => {
          const i = this.palabras.findIndex(p => p._id === this.palabraId);
          if (i !== -1) this.palabras[i] = data.palabra;
          this.toggleModal();
        },
        error: (err) => { console.error('Error actualizando palabra:', err); }
      });
    } else {
      this.palabrasService.crearPalabra(this.nuevaPalabra).subscribe({
        next: (data) => { this.palabras.push(data.palabra); this.toggleModal(); },
        error: (err)  => { console.error('Error creando palabra:', err); }
      });
    }
  }

  editarPalabra(palabra: any) {
    this.isEditing  = true;
    this.palabraId  = palabra._id;
    // La categoría puede llegar como objeto {_id, nombre} del populate o como string
    const categoriaId = palabra.categoria?._id ?? palabra.categoria ?? null;
    this.nuevaPalabra = {
      palabra:         palabra.palabra         || '',
      descripcion:     palabra.descripcion     || palabra.explicacion || '',
      usarDescripcion: palabra.usarDescripcion || false,
      categoria:       categoriaId,
      orden:           palabra.orden           ?? 0,
      tiposLexicos:    [...(palabra.tiposLexicos || [])],
      enMotor:         palabra.enMotor         || false
    };
    this.toggleModal();
  }

  borrarPalabra(id: string) {
    if (confirm('¿Eliminar esta palabra?')) {
      this.palabrasService.borrarPalabra(id).subscribe({
        next: () => { this.palabras = this.palabras.filter(p => p._id !== id); },
        error: (err) => { console.error('Error eliminando palabra:', err); }
      });
    }
  }

  abrirAnimacionesModal(p: any) {
    this.palabraSeleccionada = p;
    this.nuevoGltf     = p.gltf     || '';
    this.nuevoClipName = p.clipName || '';
    this.showAnimacionesModal = true;
  }

  cerrarAnimacionesModal() {
    this.showAnimacionesModal = false;
    this.palabraSeleccionada  = null;
  }

  asignarAnimacionesAPalabra() {
    if (!this.palabraSeleccionada) return;
    const selectEl = document.querySelector('#prefijoSelect') as HTMLSelectElement;
    if (!selectEl) return;
    const prefijo = selectEl.value;
    if (!prefijo) { this.mensajeError = 'Selecciona un prefijo'; return; }

    this.palabrasService.asignarAnimacion(this.palabraSeleccionada._id, {
      gltf: `${prefijo}.gltf`, clipName: prefijo
    }).subscribe({
      next: (resp) => {
        const i = this.palabras.findIndex(p => p._id === this.palabraSeleccionada._id);
        if (i >= 0) this.palabras[i] = resp.palabra;
        this.mensajeExito = 'Animación asignada correctamente';
        setTimeout(() => this.mensajeExito = null, 3000);
        this.cerrarAnimacionesModal();
      },
      error: (err) => {
        this.mensajeError = `Error: ${err.error?.msg || 'desconocido'}`;
        setTimeout(() => this.mensajeError = null, 3000);
      }
    });
  }
}