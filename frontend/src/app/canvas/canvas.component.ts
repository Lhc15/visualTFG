import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  Input,
  OnDestroy,
  Output,
  EventEmitter
} from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { AnimacionService, AnimationData } from '../services/animacion.service';
import { GltfService } from '../services/gltf.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css'],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('webglCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() animationUrls: string[] = [];
  @Input() showResetButton: boolean = false;

  @Output() animationEnded = new EventEmitter<void>();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private loader: GLTFLoader = new GLTFLoader();

  private poses: THREE.Group[] = [];
  private avatar!: THREE.Group | undefined;
  private poseInterval: any = null;
  private animacionSubscription: Subscription;

  // 👇 NUEVO: Propiedad para controlar la velocidad
  private playbackRate: number = 1;

  constructor(
    private animacionService: AnimacionService,
    private gltfService: GltfService
  ) {
    this.animacionSubscription = this.animacionService.animaciones$.subscribe(
      (data: AnimationData) => {
        if (data.animaciones.length > 0) {
          const permitido = this.animacionService.permitirReproduccion();
          console.log('Recibida petición de animación:', data, '¿permitido?', permitido);

          if (permitido) {
            setTimeout(() => {
              if (this.animacionService.permitirReproduccion()) {
                this.cargarAnimacionesDinamicas(data.animaciones, data.loop);
              }
            }, 50);
          } else {
            console.log('No se permite reproducción => limpiar');
            this.limpiarCanvas();
          }
        } else {
          this.limpiarCanvas();
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.animacionSubscription) {
      this.animacionSubscription.unsubscribe();
    }
    this.stopLoop(false);
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.addLights();
    this.addControls();
    this.loadDefaultPose();
    this.animate();
    this.handleResize();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
  }

  private initCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 5.8);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);
  }

  private initRenderer(): void {
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
  }

  private addLights(): void {
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    this.scene.add(light);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  private addControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = true;
    this.controls.autoRotate = false;
    this.controls.update();
  }

  private cargarAnimacionesDinamicas(animaciones: string[], loop: boolean): void {
    this.stopLoop(false);

    if (!this.animacionService.permitirReproduccion()) {
      console.log('Reproducción no permitida. Saliendo.');
      return;
    }

    this.poses = [];

    const promises = animaciones.map((url) => {
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
        console.log('Animaciones cargadas:', this.poses.length, 'poses');
        this.reproducirAnimacionSecuencial(loop);
      })
      .catch((error) => console.error('Error cargando animaciones:', error));
  }

  private reproducirAnimacionSecuencial(loop: boolean): void {
    this.stopLoop(false);

    let index = 0;

    const intervalMs = 120 / this.playbackRate; // 👈 Aplicar velocidad

    this.poseInterval = setInterval(() => {
      const currentPose = this.poses[index];

      if (this.avatar) {
        this.avatar!.clear();
        currentPose.children.forEach(child => {
          this.avatar!.add(child.clone());
        });
      } else {
        this.avatar = currentPose.clone();
        this.avatar.position.set(0, 0, 0);
        const box = new THREE.Box3().setFromObject(this.avatar);
        const center = box.getCenter(new THREE.Vector3());
        this.avatar.position.sub(center);
        this.avatar.scale.set(1.5, 1.5, 1.5);
        this.avatar.position.y -= 1.2;
        this.scene.add(this.avatar);
      }

      index++;
      if (index >= this.poses.length) {
        if (loop) {
          index = 0;
        } else {
          clearInterval(this.poseInterval);
          this.poseInterval = null;
          console.log('Animación completada (una sola vez).');
          this.animationEnded.emit();
        }
      }
    }, intervalMs);
  }

  public stopLoop(revertToDefault: boolean): void {
    if (this.poseInterval) {
      clearInterval(this.poseInterval);
      this.poseInterval = null;
    }
    console.log('Animación detenida. revertToDefault:', revertToDefault);

    if (revertToDefault) {
      this.limpiarCanvas();
      this.loadDefaultPose(true);
    }
  }

  private loadDefaultPose(force = false): void {
    if (!force && this.animacionService.hayAnimacionesActivas()) {
      return;
    }
    console.log('Cargando pose inicial (modelo por defecto)...');

    this.gltfService.getDefaultModel().subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        this.loader.load(
          url,
          (gltf) => {
            this.avatar = gltf.scene;
            const box = new THREE.Box3().setFromObject(this.avatar);
            const center = box.getCenter(new THREE.Vector3());
            this.avatar.position.sub(center);
            this.avatar.scale.set(1.5, 1.5, 1.5);
            this.avatar.position.y -= 1.2;
            this.scene.add(this.avatar);
            URL.revokeObjectURL(url);
            console.log('Pose inicial lista');
          },
          undefined,
          (err) => {
            console.error('Error cargando pose inicial:', err);
            URL.revokeObjectURL(url);
          }
        );
      },
      error: (err) => {
        console.error('Error obteniendo modelo por defecto:', err);
      },
    });
  }

  limpiarCanvas(): void {
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.clear();
      this.avatar = undefined;
    }
    this.poses = [];
    console.log('Canvas limpiado: avatar removido, poses vacías');
  }

  private animate(): void {
    const renderLoop = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  private handleResize(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (this.camera instanceof THREE.PerspectiveCamera) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }
      this.renderer.setSize(w, h);
    });
  }

  public resetView(): void {
    this.camera.position.set(0, 1.5, 8.5);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  // 👇 NUEVO MÉTODO para actualizar la velocidad desde fuera
  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    console.log('Velocidad actualizada a:', rate);
  }
}
