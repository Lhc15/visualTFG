import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CombinacionMotorService,
  CombinacionMotor,
  StatsResponse
} from '../services/combinacion-motor.service';

type Filtro = 'todas' | 'sin-revisar' | 'validas' | 'invalidas';

@Component({
  selector: 'app-admin-combinaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="container-fluid py-3">

  <!-- Cabecera -->
  <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
    <div>
      <h4 class="mb-0">Motor procedimental
        <span *ngIf="stats && stats.sinRevisar > 0" class="badge bg-warning text-dark ms-2">
          {{ stats.sinRevisar }} sin revisar
        </span>
      </h4>
      <small class="text-muted" *ngIf="stats">
        {{ stats.total }} combinaciones totales &middot;
        {{ stats.validas }} válidas &middot;
        {{ stats.invalidas }} inválidas
      </small>
    </div>
    <button class="btn btn-primary" (click)="regenerar()" [disabled]="regenerando">
      <span *ngIf="regenerando" class="spinner-border spinner-border-sm me-1"></span>
      {{ regenerando ? 'Regenerando…' : 'Regenerar combinaciones' }}
    </button>
  </div>

  <!-- Mensaje resultado de regeneración -->
  <div *ngIf="msgRegeneracion" class="alert alert-success alert-dismissible py-2">
    {{ msgRegeneracion }}
    <button type="button" class="btn-close" (click)="msgRegeneracion=''"></button>
  </div>

  <!-- Filtros -->
  <div class="btn-group mb-3" role="group">
    <button *ngFor="let f of filtros" type="button"
      class="btn btn-sm"
      [class.btn-dark]="filtroActivo === f.id"
      [class.btn-outline-secondary]="filtroActivo !== f.id"
      (click)="cambiarFiltro(f.id)">
      {{ f.label }}
    </button>
  </div>

  <!-- Tabla -->
  <div class="table-responsive" *ngIf="!cargando">
    <table class="table table-sm table-hover align-middle">
      <thead class="table-dark">
        <tr>
          <th>Frase LSE</th>
          <th>Plantilla</th>
          <th>ENM</th>
          <th class="text-center">Revisada</th>
          <th class="text-center">Válida</th>
          <th>Notas</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let c of combinaciones" [class.table-success]="c.valida === true && c.revisada"
            [class.table-danger]="c.valida === false && c.revisada"
            [class.table-warning]="!c.revisada">
          <td class="fw-semibold">{{ fraseLSE(c) }}</td>
          <td>
            <span class="badge" [class.bg-secondary]="c.plantilla==='afirmativa'"
              [class.bg-info]="c.plantilla==='pregunta-sn'"
              [class.bg-primary]="c.plantilla==='pregunta-wh'">
              {{ labelPlantilla(c.plantilla) }}
            </span>
          </td>
          <td>
            <small *ngIf="c.enm" class="text-muted">{{ labelEnm(c.enm) }}</small>
            <small *ngIf="!c.enm" class="text-muted">—</small>
          </td>
          <td class="text-center">
            <div class="form-check form-switch d-flex justify-content-center">
              <input class="form-check-input" type="checkbox"
                [checked]="c.revisada"
                (change)="toggleRevisada(c)">
            </div>
          </td>
          <td class="text-center">
            <ng-container *ngIf="c.revisada">
              <button class="btn btn-sm me-1"
                [class.btn-success]="c.valida === true"
                [class.btn-outline-success]="c.valida !== true"
                (click)="setValida(c, true)" title="Válida">✓</button>
              <button class="btn btn-sm"
                [class.btn-danger]="c.valida === false"
                [class.btn-outline-danger]="c.valida !== false"
                (click)="setValida(c, false)" title="Inválida">✗</button>
            </ng-container>
            <small *ngIf="!c.revisada" class="text-muted">—</small>
          </td>
          <td>
            <input type="text" class="form-control form-control-sm"
              [value]="c.notas"
              (blur)="guardarNotas(c, $event)"
              placeholder="Notas…" style="min-width:120px">
          </td>
        </tr>
        <tr *ngIf="combinaciones.length === 0">
          <td colspan="6" class="text-center text-muted py-4">
            No hay combinaciones con este filtro.
            <span *ngIf="filtroActivo === 'todas'">Pulsa "Regenerar combinaciones" para generarlas.</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Cargando -->
  <div *ngIf="cargando" class="text-center py-5">
    <div class="spinner-border text-primary"></div>
  </div>

  <!-- Paginación -->
  <div class="d-flex justify-content-between align-items-center mt-2" *ngIf="totalPages > 1">
    <small class="text-muted">{{ total }} combinaciones</small>
    <div class="btn-group btn-group-sm">
      <button class="btn btn-outline-secondary" [disabled]="paginaActual === 1" (click)="cambiarPagina(paginaActual-1)">‹</button>
      <button class="btn btn-outline-secondary" disabled>{{ paginaActual }} / {{ totalPages }}</button>
      <button class="btn btn-outline-secondary" [disabled]="paginaActual >= totalPages" (click)="cambiarPagina(paginaActual+1)">›</button>
    </div>
  </div>

</div>
  `,
  styles: [`
    .table td, .table th { vertical-align: middle; }
    .form-check-input { cursor: pointer; }
  `]
})
export class AdminCombinacionesComponent implements OnInit {

  combinaciones: CombinacionMotor[] = [];
  stats: StatsResponse | null = null;
  cargando    = false;
  regenerando = false;
  msgRegeneracion = '';
  filtroActivo: Filtro = 'todas';
  paginaActual = 1;
  total        = 0;
  readonly limit = 50;

  readonly filtros: { id: Filtro; label: string }[] = [
    { id: 'todas',        label: 'Todas' },
    { id: 'sin-revisar',  label: 'Sin revisar' },
    { id: 'validas',      label: 'Válidas' },
    { id: 'invalidas',    label: 'Inválidas' },
  ];

  get totalPages(): number { return Math.ceil(this.total / this.limit); }

  constructor(private svc: CombinacionMotorService) {}

  ngOnInit(): void {
    this.cargarStats();
    this.cargar();
  }

  cargarStats(): void {
    this.svc.stats().subscribe({ next: s => this.stats = s, error: () => {} });
  }

  cargar(): void {
    this.cargando = true;
    this.svc.listar(this.filtroActivo, this.paginaActual, this.limit).subscribe({
      next: r => {
        this.combinaciones = r.combinaciones;
        this.total         = r.total;
        this.cargando      = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  cambiarFiltro(f: Filtro): void {
    this.filtroActivo = f;
    this.paginaActual = 1;
    this.cargar();
  }

  cambiarPagina(p: number): void {
    this.paginaActual = p;
    this.cargar();
  }

  regenerar(): void {
    this.regenerando = true;
    this.msgRegeneracion = '';
    this.svc.regenerar().subscribe({
      next: r => {
        this.regenerando    = false;
        this.msgRegeneracion = r.msg;
        this.cargarStats();
        this.cargar();
      },
      error: () => { this.regenerando = false; }
    });
  }

  toggleRevisada(c: CombinacionMotor): void {
    const nuevo = !c.revisada;
    this.svc.actualizar(c._id, { revisada: nuevo }).subscribe({
      next: () => { c.revisada = nuevo; this.cargarStats(); }
    });
  }

  setValida(c: CombinacionMotor, v: boolean): void {
    this.svc.actualizar(c._id, { valida: v, revisada: true }).subscribe({
      next: () => { c.valida = v; c.revisada = true; this.cargarStats(); }
    });
  }

  guardarNotas(c: CombinacionMotor, event: Event): void {
    const notas = (event.target as HTMLInputElement).value;
    if (notas === c.notas) return;
    this.svc.actualizar(c._id, { notas }).subscribe({
      next: () => { c.notas = notas; }
    });
  }

  fraseLSE(c: CombinacionMotor): string {
    const partes = [c.sujetoId?.palabra];
    if (c.plantilla === 'afirmativa') {
      if (c.objetoId) partes.push(c.objetoId.palabra);
      partes.push(c.verboId.palabra);
    } else if (c.plantilla === 'pregunta-sn') {
      partes.push(c.verboId.palabra);
    } else if (c.plantilla === 'pregunta-wh') {
      partes.push(c.verboId.palabra);
      if (c.interrId) partes.push(c.interrId.palabra);
    }
    return partes.filter(Boolean).join(' · ');
  }

  labelPlantilla(p: string): string {
    const m: Record<string, string> = {
      'afirmativa':  'S+O+V',
      'pregunta-sn': 'Pregunta s/p',
      'pregunta-wh': 'Pregunta c/p',
    };
    return m[p] ?? p;
  }

  labelEnm(enm: string): string {
    const m: Record<string, string> = {
      'pregunta-sin-particula': 'Cejas altas',
      'pregunta-con-particula': 'Cejas fruncidas',
    };
    return m[enm] ?? enm;
  }
}