import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CombinacionMotorService,
  CombinacionMotor,
  StatsResponse
} from '../../services/combinacion-motor.service';

type Filtro = 'todas' | 'sin-revisar' | 'validas' | 'invalidas';

@Component({
  selector: 'app-admin-combinaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-combinaciones.component.html',
  styleUrls: ['./admin-combinaciones.component.css']
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
    this.svc.stats().subscribe({
      next: (s: StatsResponse) => { this.stats = s; },
      error: () => {}
    });
  }

  cargar(): void {
    this.cargando = true;
    this.svc.listar(this.filtroActivo, this.paginaActual, this.limit).subscribe({
      next: (r) => {
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
      next: (r: any) => {
        this.regenerando     = false;
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
    const partes: (string | undefined)[] = [c.sujetoId?.palabra];
    if (c.plantilla === 'afirmativa') {
      if (c.objetoId) partes.push(c.objetoId.palabra);
      partes.push(c.verboId.palabra);
    } else if (c.plantilla === 'pregunta-sn') {
      partes.push(c.verboId.palabra);
    } else if (c.plantilla === 'pregunta-wh') {
      partes.push(c.verboId.palabra);
      if (c.interrId) partes.push(c.interrId.palabra);
    }
    return partes.filter((p): p is string => Boolean(p)).join(' · ');
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