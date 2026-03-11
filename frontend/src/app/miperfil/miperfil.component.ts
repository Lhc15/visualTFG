import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ Importado FormsModule para usar ngModel
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { StatsService } from '../services/stats.service'; // ← importa el servicio

@Component({
  selector: 'app-miperfil',
  templateUrl: './miperfil.component.html',
  styleUrls: ['./miperfil.component.css'],
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, NgxChartsModule], // ✅ Agregado FormsModule
})
export class MiperfilComponent implements OnInit {
  single = [
    { name: 'Usuarios', value: 40632 },
    { name: 'Palabras', value: 50000 },
    { name: 'Tiempo de uso', value: 36745 },
    { name: 'Niveles', value: 36240 },
    // { "name": "Spain", "value": 33000 },
    // { "name": "Italy", "value": 35800 }
  ];

  // Configuración de la gráfica
  view: [number, number] = [900, 500]; // Tamaño de la gráfica
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = false;
  showXAxisLabel = true;
  showYAxisLabel = true;

  colorScheme = 'vivid'; // O puedes usar 'cool', 'cooldown', 'flame', etc.

  userData: any = {}; // Ahora es un objeto genérico

  isEditing: Record<string, boolean> = {
    username: false,
    fullname: false,
    email: false,
    imagen: false, // Agregado para evitar errores si se usa en la interfaz
    password: false,
  };

  emailUsuario: string = ''; // Asignamos manualmente el email
  isModalOpen: boolean = false;
  isPasswordModalOpen: boolean = false; // Nueva variable para gestionar el modal de contraseña

  // Variables para el formulario
  currentEmail: string = ''; // Email introducido por el usuario
  newEmail: string = ''; // Nuevo email a actualizar
  emailError: string | null = null; // Mensaje de error

  // Variables para el formulario de cambio de contraseña
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordError: string | null = null;
  emailErrorField: string | null = null;
  passwordFieldType: string = 'password';
  showCurrentPassword: boolean = false;

  passwordErrorField: string | null = null; // Campo de error para contraseña
  passwordSuccessMessageVisible: boolean = false;
  emailSuccessMessageVisible: boolean = false;


  examStats: { name: string; value: number }[] = [];

  // 2) configuración del gráfico de pastel
  examView: [number, number] = [300, 300];
  showLabels = true;

  loginStats = { totalDays: 0, currentStreak: 0, maxStreak: 0 };
  topWords: { palabra: string; count: number }[] = [];

  // configuración del gráfico de barras para top 3 palabras
  barChartData: { name: string; value: number }[] = [];
  barView: [number, number] = [500, 300]; // tamaño del gráfico
  xAxisLabel = 'Palabra';
  yAxisLabel = 'Clicks';

  topVersus: { name: string; value: number }[] = [];
  vsView: [number, number] = [500, 300];

  //para niveles completados en modo guiado
  completedLevels = 0;
  levelsPieData: { name: string; value: number }[] = [];

  constructor(
    private usuarioService: UsuariosService,
    private router: Router,
    private statsService: StatsService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadExamStats();
    this.loadLoginStats();
    this.loadTopWords();
    this.loadTopVersus();
    this.loadCompletedLevels();
  }

  loadUserData() {
    this.usuarioService.getAuthenticatedUser().subscribe({
      next: (data) => {
        console.log('Datos recibidos:', data); // Verificando los datos recibidos
        const user = data.usuario; // Asegurándote de acceder al objeto usuario
        this.userData = user;

        // Verificar que el email esté cargado correctamente
        if (user && user.email) {
          this.emailUsuario = user.email;
          console.log('Email del usuario:', this.emailUsuario); // Verificar que el email está correcto
        } else {
          console.log('Email no disponible para este usuario');
        }
      },
      error: (error) => {
        console.error('Error al cargar los datos del usuario:', error);
      },
    });
  }

  updateEmail() {
    this.emailErrorField = null;

    // Validar email actual
    if (this.currentEmail !== this.emailUsuario) {
      this.emailErrorField = 'currentEmail';
      return;
    }

    // Validar nuevo email (simple validación, puedes mejorarla)
    if (!this.newEmail || !this.newEmail.includes('@')) {
      this.emailErrorField = 'newEmail';
      return;
    }

    // Verificar que el UID del usuario esté presente
    if (!this.userData.uid) {
      console.error('UID del usuario no encontrado.');
      alert(
        'Hubo un problema al actualizar el email. El identificador del usuario no está disponible.'
      );
      return; // No proceder si el UID no está presente
    }

    // Si los emails coinciden, realizamos la actualización
    const updatedEmail = { email: this.newEmail };

    console.log('Enviando solicitud para actualizar email:', updatedEmail); // Depuración
    console.log('UID del usuario:', this.userData.uid); // Verificar que el UID esté disponible

    // Usamos el UID en lugar de ID
    this.usuarioService
      .updateUsuario(this.userData.uid, updatedEmail)
      .subscribe({
        next: () => {
          this.emailUsuario = this.newEmail; // Actualizamos el email en la sesión
            this.emailSuccessMessageVisible = true; // mostrar mensaje de éxito

        },
        error: (error) => {
          console.error('Error al actualizar el email:', error);
          if (error && error.message) {
            alert(
              'Hubo un problema al actualizar el email. Detalles: ' +
                error.message
            );
          } else {
            alert('Hubo un problema al actualizar el email.');
          }
        },
      });
  }

  // Abrir el modal de editar contraseña
  openPasswordModal() {
    this.isPasswordModalOpen = true;
  }

  // Cerrar el modal de editar contraseña
  closePasswordModal() {
    this.isPasswordModalOpen = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = null;
    this.passwordErrorField = null;
  }

  toggleEdit(field: string) {
    // Cambié el tipo de field a 'string' para flexibilidad
    if (this.isEditing[field]) {
      const updatedField = { [field]: this.userData[field] };
      this.usuarioService
        .updateUsuario(this.userData.email, updatedField)
        .subscribe(
          () => {
            this.isEditing[field] = false;
          },
          (error) => {
            console.error('Error al actualizar:', error);
          }
        );
    } else {
      this.isEditing[field] = true;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.userData.imagen = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  navigateTo(destination: string) {
    this.router.navigate([`/${destination}`]);
  }

  // Métodos para abrir y cerrar el modal
  openModal() {
    this.isModalOpen = true;
    this.emailError = null; // Limpiamos el error cuando se abre el modal
  }

  closeModal() {
    this.isModalOpen = false;
    this.currentEmail = '';
    this.newEmail = '';
    this.emailError = null;
    this.emailErrorField = null;
  }

  logout(): void {
    console.log('[DEBUG] Cerrando sesión desde Modo Libre...');
    this.usuarioService.logout().subscribe({
      next: (response) => {
        console.log('[DEBUG] Respuesta del logout:', response);
        this.router.navigate(['/landing']);
      },
      error: (error) => {
        console.error('[ERROR] Error al cerrar sesión:', error);
        alert('Error al cerrar sesión.');
      },
    });
  }

  volverAModos(): void {
    this.router.navigate(['/modos2']);
  }

  updatePassword() {
    // Resetear errores antes de validar
    this.passwordError = null;
    this.passwordErrorField = null;

    // Validaciones
    if (!this.currentPassword) {
      this.passwordErrorField = 'currentPassword';
      this.passwordError = 'La contraseña actual es obligatoria';
      return;
    }

    if (!this.newPassword) {
      this.passwordErrorField = 'newPassword';
      this.passwordError = 'La nueva contraseña es obligatoria';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorField = 'confirmPassword';
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }

    // Validado → Llamar al servicio
    const payload = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
    };

    if (!this.userData.uid) {
      console.error('UID del usuario no encontrado.');
      alert(
        'No se puede cambiar la contraseña sin un identificador de usuario.'
      );
      return;
    }

    this.usuarioService.updatePassword(this.userData.uid, payload).subscribe({
      next: () => {
        // alert('Contraseña actualizada correctamente');
        // this.closePasswordModal();
        this.passwordSuccessMessageVisible = true;
      },
      error: (error) => {
        console.error('Error al actualizar contraseña:', error);
        alert(
          'Error del servidor: ${error?.error?.message || No se pudo actualizar la contraseña. Verifica tus datos.'
        );
      },
    });
  }

  //metodos que cargan las estadisticas
  private loadExamStats(): void {
    this.statsService.getMyExamStats().subscribe({
      next: ({ correctas = 0, incorrectas = 0 }) => {
        this.examStats = [
          { name: 'Aciertos', value: correctas },
          { name: 'Fallos', value: incorrectas },
        ];
      },
      error: (err) => console.error('No pude cargar stats de examen:', err),
    });
  }

  private loadLoginStats() {
    this.statsService.getLoginStats().subscribe({
      next: (stats) => (this.loginStats = stats),
      error: (err) => console.error(err),
    });
  }

  private loadTopWords() {
    this.statsService.getTopLearnedWords().subscribe({
      next: (data) => {
        // convierte [{palabra, count}] a [{name, value}]
        this.barChartData = data.map((w) => ({
          name: w.palabra,
          value: w.count,
        }));
        console.log('barChartData:', this.barChartData);
      },
      error: (err) => console.error('No pude cargar top words:', err),
    });
  }

  private loadTopVersus() {
    this.statsService.getTopVersusPlayers().subscribe({
      next: (list) => {
        this.topVersus = list.map((p) => ({
          name: p.player,
          value: p.wins,
        }));
      },
      error: (err) => console.error('No pude cargar top versus:', err),
    });
  }

  private loadCompletedLevels(): void {
    this.statsService.getCompletedLevels().subscribe(
      (cnt) => {
        this.completedLevels = cnt;
        // preparamos los datos para el pie chart
        this.levelsPieData = [
          { name: 'Completados', value: cnt },
          {
            name: 'Pendientes',
            value: /* aquí totalNiveles − cnt */ cnt > 0 ? 0 : 0,
          },
          // si quieres, sustituye el segundo slice por (TOTAL_NIVELES - cnt)
        ];
      },
      (err) => console.error('Error cargando niveles completados', err)
    );
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  get currentPasswordInputType(): string {
    return this.showCurrentPassword ? 'text' : 'password';
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  confirmPasswordUpdateSuccess() {
    this.passwordSuccessMessageVisible = false;
    this.closePasswordModal();
  }

  confirmEmailUpdateSuccess() {
  this.emailSuccessMessageVisible = false;
  this.closeModal();
}

}