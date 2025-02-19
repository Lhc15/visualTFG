// three-facade.service.ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { AnimacionService } from '../services/animacion.service';
import { GltfService } from '../services/gltf.service';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThreeFacadeService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader: GLTFLoader = new GLTFLoader();
  private avatar!: THREE.Group | undefined;

  constructor() { }

  /**
   * Inicializa la escena de Three.js usando el canvas proporcionado.
   */
  initialize(canvas: HTMLCanvasElement): void {
    // Crear la escena
    this.scene = new THREE.Scene();

    // Configurar la cámara
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    this.camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
    this.camera.position.set(0, 5.5, 5);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);

    // Configurar el renderer
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(sizes.width, sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xfff8d4);

    // Añadir luces
    this.addLights();

    // Configurar controles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minAzimuthAngle = -Math.PI / 12;
    this.controls.maxAzimuthAngle = Math.PI / 12;
    this.controls.autoRotate = false;
    this.controls.update();

    // Manejar el cambio de tamaño de la ventana
    window.addEventListener('resize', () => {
      const sizes = { width: window.innerWidth, height: window.innerHeight };
      this.camera.aspect = sizes.width / sizes.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(sizes.width, sizes.height);
    });

    // Iniciar el ciclo de animación
    this.animate();
  }

  /**
   * Método privado para agregar luces a la escena.
   */
  private addLights(): void {
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  /**
   * Inicia el bucle de animación.
   */
  private animate(): void {
    const loop = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Carga un modelo 3D a partir de una URL (puede ser el modelo por defecto o dinámico).
   * Si ya hay un modelo cargado, lo remueve antes de agregar el nuevo.
   */
  loadModel(url: string): void {
    this.loader.load(
      url,
      (gltf) => {
        // Si ya existe un avatar, eliminarlo de la escena
        if (this.avatar) {
          this.scene.remove(this.avatar);
        }
        this.avatar = gltf.scene;

        // Centrar el modelo
        const box = new THREE.Box3().setFromObject(this.avatar);
        const center = box.getCenter(new THREE.Vector3());
        this.avatar.position.sub(center);

        // Agregar el modelo a la escena
        this.scene.add(this.avatar);
      },
      undefined,
      (error) => {
        console.error('Error al cargar el modelo:', error);
      }
    );
  }

  /**
   * Método para limpiar la escena (por ejemplo, remover el avatar y resetear variables).
   */
  clearScene(): void {
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.clear();
      this.avatar = undefined;
    }
  }

  // Puedes agregar otros métodos para cargar animaciones dinámicas o reproducir secuencias.
}
