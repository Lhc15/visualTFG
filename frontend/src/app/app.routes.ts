import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { LandingComponent } from './landing/landing.component';
import { PruebasComponent } from './pruebas/pruebas.component';
import { ModoGuiadoComponent } from './modo-guiado/modo-guiado.component';
import { Modos2Component } from './modos2/modos2.component';
import { TestUploadComponent } from './test-upload/test-upload.component';
import { AdminComponent } from './admin/admin.component';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminUsuariosComponent } from './admin/admin_usuarios.component';
import { AdminPalabrasComponent } from './admin/admin_palabras.component';
import { AdminCategoriasComponent } from './admin/admin_categorias.component';
import { AdminEstadisticasComponent } from './admin/admin_estadisticas.component';
import { MiperfilComponent } from './miperfil/miperfil.component';
import { ModoLibreComponent } from './modo-libre/modo-libre.component';
import { ModoExamenComponent } from './modo-examen/modo-examen.component';
import { ModoVersusComponent } from './modo-versus/modo-versus.component';
import { LearningObjectComponent } from './learning-object/learning-object.component';
import { AbecedarioComponent } from './abecedario/abecedario.component';
import { ConversamosComponent } from './conversamos/conversamos.component';
import { ComunicacionComponent } from './comunicacion/comunicacion.component';
import { PracticaComponent } from './practica/practica.component';
import { AprendeComponent } from './aprende/aprende.component';
import { PracticaAbecedarioComponent } from './practica-abecedario/practica-abecedario.component';
import { PracticaAbecedarioModoAComponent } from './practica-abecedario-modo-a/practica-abecedario-modo-a.component';
import { PracticaAbecedarioModoBComponent } from './practica-abecedario-modo-b/practica-abecedario-modo-b.component';
import { PracticaVocabularioComponent } from './practica-vocabulario/practica-vocabulario.component';
import { PracticaGramaticaComponent } from './practica-gramatica/practica-gramatica.component';
import { PracticaVocabularioEjercicioComponent } from './practica-vocabulario-ejercicio/practica-vocabulario-ejercicio.component';

export const routes: Routes = [
  { path: '',        component: LandingComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'modos',   redirectTo: 'modos2', pathMatch: 'full' },
  { path: 'modos2',  component: Modos2Component },
  { path: 'perfil',  component: MiperfilComponent },

  // Practica
  { path: 'practica',                          component: PracticaComponent },
  { path: 'practica/abecedario',               component: PracticaAbecedarioComponent },
  { path: 'practica/abecedario/modo-a',        component: PracticaAbecedarioModoAComponent },
  { path: 'practica/abecedario/modo-b',        component: PracticaAbecedarioModoBComponent },
  { path: 'practica/vocabulario',              component: PracticaVocabularioComponent },
  { path: 'practica/vocabulario/:categoriaId', component: PracticaVocabularioEjercicioComponent },
  { path: 'practica/gramatica',                component: PracticaGramaticaComponent },

  // Aprende
  { path: 'aprende',              component: AprendeComponent },
  { path: 'aprende/comunicacion', component: ComunicacionComponent },

  // Admin
  { path: 'admin', component: AdminComponent, canActivate: [AdminRoleGuard],
    children: [
      { path: '',            redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    component: AdminUsuariosComponent },
      { path: 'palabras',    component: AdminPalabrasComponent },
      { path: 'categorias',  component: AdminCategoriasComponent },
      { path: 'estadisticas',component: AdminEstadisticasComponent }
    ]
  },

  // Legacy
  { path: 'pruebas',     component: PruebasComponent },
  { path: 'guiado',      component: ModoGuiadoComponent },
  { path: 'libre',       component: ModoLibreComponent },
  { path: 'examen',      component: ModoExamenComponent },
  { path: 'versus',      component: ModoVersusComponent },
  { path: 'test-upload', component: TestUploadComponent, canActivate: [AdminRoleGuard] },
  { path: 'learning',    component: LearningObjectComponent },

  // Siempre activos
  { path: 'abecedario',  component: AbecedarioComponent },
  { path: 'conversamos', component: ConversamosComponent },

  { path: '**', redirectTo: 'landing' }
];