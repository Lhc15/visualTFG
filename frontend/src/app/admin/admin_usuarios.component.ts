import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../services/usuarios.service';
import { FormsModule } from '@angular/forms';
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    './admin.component.scss'
  ],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h2>Gestión de Usuarios</h2>
        <button class="btn btn-success" (click)="toggleModal()">Agregar Usuario</button>
      </div>
      <div class="card-body">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>UID</th>
              <th>Nombre</th>
              <th>Apellidos</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let usuario of usuarios">
              <td>{{ usuario.uid }}</td>
              <td>{{ usuario.nombre }}</td>
              <td>{{ usuario.apellidos }}</td>
              <td>{{ usuario.email }}</td>
              <td>{{ usuario.rol }}</td>
              <td>
                <button class="btn btn-primary btn-sm me-2" (click)="editarUsuario(usuario)">Editar</button>
                <button class="btn btn-danger btn-sm" (click)="deleteUsuario(usuario.uid)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div *ngIf="showModal" class="modal-backdrop" (click)="closeModalOnBackdrop($event)">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Editar Usuario' : 'Agregar Nuevo Usuario' }}</h3>
        <form (ngSubmit)="submitForm()">
          <div class="form-group">
            <label for="nombre">Nombre</label>
            <input type="text" id="nombre" [(ngModel)]="nuevoUsuario.nombre" name="nombre" required />
          </div>
          <div class="form-group">
            <label for="apellidos">Apellidos</label>
            <input type="text" id="apellidos" [(ngModel)]="nuevoUsuario.apellidos" name="apellidos" required />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" [(ngModel)]="nuevoUsuario.email" name="email" required />
          </div>
          <div class="form-group" *ngIf="!isEditing">
            <label for="password">Contraseña</label>
            <input
              type="password"
              id="password"
              [(ngModel)]="nuevoUsuario.password"
              name="password"
              required
            />
          </div>
          <div class="form-group">
            <label for="rol">Rol</label>
            <select id="rol" [(ngModel)]="nuevoUsuario.rol" name="rol" required>
              <option value="ROL_USUARIO">Usuario</option>
              <option value="ROL_ADMIN">Administrador</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="toggleModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">{{ isEditing ? 'Actualizar' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AdminUsuariosComponent implements OnInit {
  usuarios: any[] = [];
  showModal = false;
  isEditing = false; // Indica si estamos editando
  nuevoUsuario = { nombre: '', apellidos: '', email: '', password: '', rol: 'ROL_USUARIO' };
  usuarioId: string | null = null; // Almacena el ID del usuario a editar

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit() {
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        console.log('Usuarios recibidos:', data);
        this.usuarios = data.usuarios;
      },
      error: (err) => {
        console.error('Error al obtener usuarios', err);
      },
    });
  }

  toggleModal() {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.isEditing = false; // Restablece el estado
      this.nuevoUsuario = { nombre: '', apellidos: '', email: '', password: '', rol: 'ROL_USUARIO' }; // Resetea el formulario
      this.usuarioId = null;
    }
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).className === 'modal-backdrop') {
      this.toggleModal();
    }
  }

  submitForm() {
    if (this.isEditing) {
      // Editar usuario
      this.usuariosService.updateUsuario(this.usuarioId!, {
        nombre: this.nuevoUsuario.nombre,
        apellidos: this.nuevoUsuario.apellidos,
        email: this.nuevoUsuario.email,
        rol: this.nuevoUsuario.rol
      }).subscribe({
        next: (data) => {
          console.log('Usuario actualizado:', data);
          const index = this.usuarios.findIndex(u => u.uid === this.usuarioId);
          if (index !== -1) {
            this.usuarios[index] = data.usuario; // Actualiza el usuario en la lista
          }
          this.toggleModal(); // Cierra el modal
        },
        error: (err) => {
          console.error('Error actualizando usuario:', err);
        }
      });
    } else {
      // Crear nuevo usuario
      this.usuariosService.createUsuario(this.nuevoUsuario).subscribe({
        next: (data) => {
          console.log('Usuario creado:', data);
          this.usuarios.push(data.usuario); // Agrega el nuevo usuario a la lista
          this.toggleModal(); // Cierra el modal
        },
        error: (err) => {
          console.error('Error creando usuario:', err);
        }
      });
    }
  }
  

  editarUsuario(usuario: any) {
    this.isEditing = true; // Cambia a modo edición
    this.usuarioId = usuario.uid; // Almacena el ID del usuario
    this.nuevoUsuario = {
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      password: '', // No incluir la contraseña
      rol: usuario.rol
    }; 
    this.toggleModal(); // Abre el modal
  }
  

  deleteUsuario(uid: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.usuariosService.deleteUsuario(uid).subscribe({
        next: () => {
          console.log('Usuario eliminado:', uid);
          this.usuarios = this.usuarios.filter((user) => user.uid !== uid);
        },
        error: (err) => {
          console.error('Error eliminando usuario:', err);
        },
      });
    }
  }
}
