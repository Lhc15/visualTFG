import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private usuariosService: UsuariosService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.usuariosService.getAuthenticatedUser().pipe(
      map((response) => {
        const usuario = response.usuario;
        if (usuario && usuario.rol === 'admin') {
          console.log('Acceso permitido: usuario es admin');
          return true;
        } else {
          console.warn('Acceso denegado: usuario no es admin');
          return this.router.parseUrl('/landing'); // Redirige si no es admin
        }
      }),
      catchError((error) => {
        console.error('Error al verificar rol del usuario:', error);
        return [this.router.parseUrl('/landing')];
      })
    );
  }
}
