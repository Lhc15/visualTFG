import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-reset-password',
  standalone: true, 
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  imports: [FormsModule] 
})
export class ResetPasswordComponent implements OnInit {
  nuevaPassword = '';
  confirmarPassword = '';
  token = '';
  error: string | null = null;
  success: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  resetearPassword() {
    if (!this.nuevaPassword || this.nuevaPassword !== this.confirmarPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.usuarioService.resetPasswordWithToken(this.token, this.nuevaPassword).subscribe({
      next: () => {
        this.success = 'Contraseña actualizada con éxito. Redirigiendo...';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al actualizar contraseña';
      }
    });
  }
}
