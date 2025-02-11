import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { LandingComponent } from './landing/landing.component';
import { PruebasComponent } from './pruebas/pruebas.component';
import { HomeComponent } from './home/home.component';
import { ModoGuiadoComponent } from './modo-guiado/modo-guiado.component';
import { TestUploadComponent } from './test-upload/test-upload.component';
import { AdminGuard } from './guards/admin.guard'; // Importa el guardia
import { AdminComponent } from './admin/admin.component';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminUsuariosComponent } from './admin/admin_usuarios.component';
import { AdminPalabrasComponent } from './admin/admin_palabras.component';
import { AdminCategoriasComponent } from './admin/admin_categorias.component';
import { AjustesComponent } from './ajustes/ajustes.component';
import { MiperfilComponent } from './miperfil/miperfil.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'landing', component: LandingComponent },
  {path: 'ajustes', component: AjustesComponent },
  {path: 'perfil', component: MiperfilComponent },
  { path: 'admin', component: AdminComponent, canActivate: [AdminRoleGuard], 
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios', component: AdminUsuariosComponent },
      { path: 'palabras', component: AdminPalabrasComponent },
      { path: 'categorias', component: AdminCategoriasComponent }
    ] 
  },
  { path: 'pruebas', component: PruebasComponent }, 
  { path: 'home', component: HomeComponent },
  { path: 'guiado', component: ModoGuiadoComponent },
  { path: 'test-upload', component: TestUploadComponent, canActivate: [AdminRoleGuard] }, //canActivate: [AdminGuard] }, // Protege esta ruta
  { path: '**', redirectTo: 'landing' },
];

