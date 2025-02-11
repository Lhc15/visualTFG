import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CategoriasService } from '../services/categorias.service';
import { CanvasComponent } from '../canvas/canvas.component';
import { AnimacionService } from '../services/animacion.service'; // Importa el servicio
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent, CanvasComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  categorias: any[] = []; // Lista de categorías obtenidas de la base de datos
  palabras: any[] = []; // Lista de palabras obtenidas de la base de datos
  currentCategoryId: string | null = null; // Categoría actual seleccionada
  currentAnimationUrls: string[] = []; // URLs de las animaciones seleccionadas
Math: any;

  constructor(private categoriasService: CategoriasService, private animacionService: AnimacionService) {}

  ngOnInit(): void {
    this.cargarCategorias(); // Cargar las categorías al inicio
  }

  cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        console.log('Categorías cargadas:', this.categorias);

        if (this.categorias.length > 0) {
          // Selecciona automáticamente la primera categoría
          this.selectCategory(this.categorias[0]._id);
        }
      },
      error: (error) => {
        console.error('Error al cargar las categorías:', error);
      },
    });
  }

  selectCategory(categoriaId: string): void {
    this.currentCategoryId = categoriaId;
    console.log('Categoría seleccionada:', categoriaId);

    this.categoriasService.obtenerPalabrasPorCategoria(categoriaId).subscribe({
      next: (data) => {
        this.palabras = data;
        console.log(`Palabras cargadas para la categoría ${categoriaId}:`, this.palabras);
      },
      error: (error) => {
        console.error('Error al cargar las palabras:', error);
      },
    });
  }

  seleccionarPalabra(palabra: any): void {
  console.log('Palabra seleccionada:', palabra);
  console.log('Animaciones asociadas:', palabra.animaciones);

  if (palabra.animaciones && palabra.animaciones.length > 0) {
    // Si hay animaciones, construimos las URLs
    const animacionesUrls = palabra.animaciones.map(
      (animacion: any) => `${environment.apiUrl}/gltf/animaciones/${animacion.filename}`
    );

    console.log('URLs de las animaciones generadas:', animacionesUrls);

    // Verificar que las animaciones están correctamente formateadas
    animacionesUrls.forEach((url: string) => {
      console.log(`Comprobando animación en URL: ${url}`);
      fetch(url).then(response => {
        if (response.ok) {
          console.log(`Animación encontrada: ${url}`);
        } else {
          console.warn(`Error al acceder a la animación: ${url}`);
        }
      }).catch(error => {
        console.error(`Error al intentar acceder a la animación: ${url}`, error);
      });
    });

    // Enviar las animaciones al servicio
    this.animacionService.cargarAnimaciones(animacionesUrls, true); // Marcamos como manual = true
  } else {
    console.warn('No hay animaciones asociadas a esta palabra.');
  }
}

  /*
  cargarAnimacionesSecuenciales(animaciones: any[]): void {
    const loader = new THREE.GLTFLoader();
  
    let index = 0;
  
    const cargarSiguienteFrame = () => {
      if (index < animaciones.length) {
        const url = `${environment.apiUrl}/gltf/animaciones/${animaciones[index].filename}`;
        console.log(`Cargando frame: ${url}`);
  
        loader.load(
          url,
          (gltf) => {
            // Reemplaza o actualiza la escena con el nuevo frame
            scene.clear(); // Opcional: limpia la escena anterior
            scene.add(gltf.scene);
            index++;
            setTimeout(cargarSiguienteFrame, 500); // Intervalo entre frames
          },
          undefined,
          (error) => {
            console.error('Error al cargar el frame:', error);
          }
        );
      } else {
        console.log('Animación completada.');
      }
    };
  
    cargarSiguienteFrame();
  }
  */
}
