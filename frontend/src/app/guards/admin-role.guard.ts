import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AdminRoleGuard implements CanActivate {
  constructor(private usuariosService: UsuariosService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.usuariosService.getAuthenticatedUser().pipe(
      map((response) => {
        const usuario = response.usuario;
        if (usuario && usuario.rol === 'ROL_ADMIN') {
          return true; // Permitir acceso
        } else {
          this.router.navigate(['/home']); // Redirigir si no es admin
          return false;
        }
      })
    );
  }
}
