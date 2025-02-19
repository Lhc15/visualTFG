// three-facade.service.ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { GltfService } from '../services/gltf.service';
import { AnimacionService } from '../services/animacion.service';

@Injectable({
  providedIn: 'root'
})
export class ThreeFacadeService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader: GLTFLoader = new GLTFLoader();
  private poses: THREE.Group[] = [];
  private avatar!: THREE.Group | undefined;

  constructor(
    private gltfService: GltfService,
    private animacionService: AnimacionService
  ) {}

  /**
   * Inicializa la escena completa en el canvas recibido.
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.initScene();
    this.initCamera();
    this.initRenderer(canvas);
    this.addLights();
    this.addControls();
    this.handleResize();
    this.animate();
    this.loadDefaultPose();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
  }

  private initCamera(): void {
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    this.camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
    this.camera.position.set(0, 5.5, 5);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  private initRenderer(canvas: HTMLCanvasElement): void {
    if (!canvas) {
      console.error('Canvas element not found.');
      return;
    }
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xfff8d4);
  }

  private addLights(): void {
    // Luz puntual
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    this.scene.add(light);

    // Luz ambiental
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemiLight);

    // Luz direccional
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  private addControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;
    // Limitar la rotación horizontal (azimutal)
    this.controls.minAzimuthAngle = -Math.PI / 12; // -15°
    this.controls.maxAzimuthAngle = Math.PI / 12;  // 15°
    this.controls.autoRotate = false;
    this.controls.update();
  }

  private animate(): void {
    const loop = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  private handleResize(): void {
    window.addEventListener('resize', () => {
      const sizes = { width: window.innerWidth, height: window.innerHeight };
      this.camera.aspect = sizes.width / sizes.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(sizes.width, sizes.height);
    });
  }

  /**
   * Carga el modelo por defecto en caso de que no haya animaciones activas.
   */
  loadDefaultPose(): void {
    if (!this.animacionService.hayAnimacionesActivas()) {
      console.log('Iniciando carga del modelo por defecto...');
      this.gltfService.getDefaultModel().subscribe({
        next: (blob: Blob) => {
          console.log('Blob recibido:', blob);
          const url = URL.createObjectURL(blob);
          console.log('URL temporal creada:', url);
  
          this.loader.load(
            url,
            (gltf) => {
              console.log('Modelo cargado exitosamente:', gltf);
              this.avatar = gltf.scene;
  
              // Centrar el modelo
              const box = new THREE.Box3().setFromObject(this.avatar);
              const center = box.getCenter(new THREE.Vector3());
              this.avatar.position.sub(center);
  
              this.scene.add(this.avatar);
              console.log('Avatar añadido a la escena');
              URL.revokeObjectURL(url);
            },
            (progress) => {
              console.log(
                'Progreso de carga:',
                (progress.loaded / progress.total) * 100 + '%'
              );
            },
            (error) => {
              console.error('Error al cargar el modelo:', error);
              URL.revokeObjectURL(url);
            }
          );
        },
        error: (error) => {
          console.error('Error al obtener el modelo de la base de datos:', error);
        },
      });
    }
  }

  /**
   * Carga las animaciones dinámicas a partir de las URLs recibidas.
   */
  cargarAnimacionesDinamicas(urls: string[]): void {
    // Verificar que se permita la reproducción
    if (!this.animacionService.permitirReproduccion()) {
      console.log('Cancelando carga de animaciones - reproducción no permitida');
      return;
    }
    
    this.poses = []; // Reinicia las poses

    const promises = urls.map((url) => {
      return new Promise<THREE.Group>((resolve, reject) => {
        this.loader.load(
          url,
          (gltf) => resolve(gltf.scene),
          undefined,
          (error) => reject(error)
        );
      });
    });

    Promise.all(promises)
      .then((loadedPoses) => {
        this.poses = loadedPoses;
        console.log('Nuevas animaciones cargadas.');
        this.reproducirAnimacionSecuencial();
      })
      .catch((error) => console.error('Error cargando las animaciones:', error));
  }

  /**
   * Reproduce secuencialmente las animaciones cargadas.
   */
  private reproducirAnimacionSecuencial(): void {
    let index = 0;
    const poseInterval = setInterval(() => {
      const currentPose = this.poses[index];
  
      if (this.avatar) {
        this.avatar.clear(); // Limpia los hijos del avatar existente
        currentPose.children.forEach((child) => {
          this.avatar?.add(child.clone());
        });
      } else {
        this.avatar = currentPose.clone();
        this.scene.add(this.avatar);
      }
  
      index++;
      if (index >= this.poses.length) {
        clearInterval(poseInterval);
        console.log('Animación completada.');
      }
    }, 120); // Intervalo ajustable (en milisegundos)
  }

  /**
   * Limpia la escena removiendo el avatar y reiniciando las poses.
   */
  limpiarCanvas(): void {
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.clear();
    }
    this.avatar = undefined;
    this.poses = [];
    console.log('Canvas limpiado.');
  }
}
