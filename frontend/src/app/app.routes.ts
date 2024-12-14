import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { LandingComponent } from './landing/landing.component';
import { PruebasComponent } from './pruebas/pruebas.component';
import { HomeComponent } from './home/home.component';
import { ModoGuiadoComponent } from './modo-guiado/modo-guiado.component';
import { TestUploadComponent } from './test-upload/test-upload.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'pruebas', component: PruebasComponent }, 
  { path: 'home', component: HomeComponent },
  { path: 'guiado', component: ModoGuiadoComponent },
  { path: 'test-upload', component: TestUploadComponent },
  { path: '**', redirectTo: 'landing' },
];

