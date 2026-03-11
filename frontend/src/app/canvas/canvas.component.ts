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
import { Router } from '@angular/router';


// Definir la interfaz para el API del motor de skin
interface SkinEngineApi {
  play(name: string, loop: boolean): void;
  stop(): void;
  clips: string[];
  resetRotation(): void;

}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css'],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas', { static: false }) threeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('skinCanvas',  { static: false }) skinCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() animationUrls: string[] = [];
  @Input() showResetButton: boolean = false;
  @Input() standalone: boolean = false;  // true = no escuchar animacionService (usado en landing)
  @Input() cameraZ: number = 4.2;
  @Input() cameraY: number = 0;
  @Input() cameraLookAtY: number = 0;
  @Input() containerEl: HTMLElement | null = null;

  // Emisor para avisar de que la animación ha terminado (una sola vez)
  @Output() animationEnded = new EventEmitter<void>();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private loader: GLTFLoader = new GLTFLoader();
  private isMainActive: boolean = false;

  private poses: THREE.Group[] = [];
  private avatar!: THREE.Group | undefined;
  private poseInterval: any = null;
  private animacionSubscription: Subscription;

  // Definimos correctamente las propiedades relacionadas con el motor de skin
  private engineApi: SkinEngineApi | null = null;
  private skinIsRunning: boolean = false;

  private clipDurations: Map<string, number> = new Map();


  // 👇 NUEVO: Propiedad para controlar la velocidad
  private playbackRate: number = 1;

  constructor(
    private animacionService: AnimacionService,
    private gltfService: GltfService,
    public  router: Router
  ) {
    this.animacionSubscription = this.animacionService.animaciones$.subscribe(
      (data: AnimationData) => {
        // En modo standalone (landing) ignoramos el servicio completamente
        if (this.standalone) return;

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
    this.animacionSubscription.unsubscribe();
    // Detenemos el motor de skin si está activo
    if (this.engineApi) {
      this.engineApi.stop();
    }
  }

  async ngAfterViewInit(): Promise<void> {
    const api = await this.initSkinEngine('/assets/hola_0.gltf');
    this.loader.load(
      '/assets/hola_0.gltf',
      gltf => {
        gltf.animations.forEach(anim => {
          this.clipDurations.set(anim.name, anim.duration * 1000);
        });
      }
    );
    this.initScene();
    this.initCamera();
    this.initThreeRenderer();
    this.addLights();
    this.addControls();
    //this.loadDefaultPose(); // Pose inicial
    this.animate();
    this.handleResize();
  }

  // --------------------------------------------------
  // INICIALIZAR ESCENA, CÁMARA, LUCES, CONTROLES
  // --------------------------------------------------
  private initScene() {
    this.scene = new THREE.Scene();
  }

  private get renderWidth(): number {
    return this.containerEl ? this.containerEl.clientWidth : window.innerWidth;
  }
  private get renderHeight(): number {
    return this.containerEl ? this.containerEl.clientHeight : window.innerHeight;
  }

  private initCamera() {
    const aspect = this.renderWidth / this.renderHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
    this.camera.position.set(0, this.cameraY, this.cameraZ);
    this.camera.lookAt(0, this.cameraLookAtY, 0);
  }

  private initThreeRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.threeCanvas.nativeElement, alpha: true });
    this.renderer.setSize(this.renderWidth, this.renderHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.addLights();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
    if (this.isMainActive) return;
    // 1) Detenemos animación previa, pero sin recargar la pose
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
    // Just in case, paramos algo previo
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

          console.log('CanvasComponent: emit animationEnded');
          // Emitir evento de final de animación
          this.animationEnded.emit();
        }
      }
    }, intervalMs);
  }
  
  /**
   * Detener la animación secuencial actual.
   * @param revertToDefault Si es true, limpiamos y recargamos la pose inicial.
   */
  public stopLoop(revertToDefault: boolean): void {
    // 1) Parar el intervalo
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

  public getClipDuration(name: string): number {
    return this.clipDurations.get(name) ?? 1000;
  }

  // --------------------------------------------------
  // POSE INICIAL
  // --------------------------------------------------
  /** Cargar la pose inicial o "modelo por defecto". */
  private loadDefaultPose(force = false): void {
    if (this.isMainActive) return;
    // si no forzamos y hay animaciones, no hacemos nada
    if (!force && this.animacionService.hayAnimacionesActivas()) return;

    console.log('Cargando pose inicial (hola_0.gltf)…');
    // simplemente recargamos el mismo GLTF
    this.loadSkinModel('/assets/hola_0.gltf');
  }

  limpiarCanvas(): void {
    if (this.isMainActive) return;
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.clear();
      this.avatar = undefined;
    }
    this.poses = [];
    console.log('Canvas limpiado: avatar removido, poses vacías');
  }

  private animate() {
    const loop = () => {
      // sólo render Three.js si el skinEngine NO está activo
      if (!this.skinIsRunning) {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  private handleResize(): void {
    window.addEventListener('resize', () => {
      if (!this.isMainActive) {
        const w = this.renderWidth;
        const h = this.renderHeight;
        if (this.camera instanceof THREE.PerspectiveCamera) {
          this.camera.aspect = w / h;
          this.camera.updateProjectionMatrix();
        }
        this.renderer.setSize(w, h);
      }
    });
  }
  

  public async resetView(): Promise<void> {
    if (this.isMainActive) return;

    if (this.skinRunning) {
    // 1) Resetea la rotación interna del skin-engine
    if (this.engineApi?.resetRotation) {
      this.engineApi.resetRotation();
    }

    // 2) Fade-out / fade-in opcional
    const canvas = this.skinCanvas.nativeElement;
    canvas.style.transition = 'opacity 0.3s ease-out';
    canvas.style.opacity = '0';
    await new Promise(r => setTimeout(r, 300));
    canvas.style.opacity = '1';

    // 3) Resetea la cámara de Three.js
    this.camera.position.set(0, 0, 3.8);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    } else {
      if (this.avatar) {
        this.scene.remove(this.avatar);
        this.avatar.clear();
        this.avatar = undefined;
      }
      this.loadDefaultPose(true);

      this.camera.position.set(0, 0, 3.8);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }



  /**
   * Obtiene si el motor de skin está corriendo actualmente
   */
  public get skinRunning(): boolean {
    return this.skinIsRunning;
  }

  /**
   * Inicializa el motor de skin
   */
  private async initSkinEngine(url = '/assets/hola_0.gltf') {
    const { startSkinEngine } = await import('engine/skinEngine.js');
    this.engineApi = await startSkinEngine(
      this.skinCanvas.nativeElement,
      url,
      () => ({
        projectionMatrix: new Float32Array(this.camera.projectionMatrix.elements),
        viewMatrix:       new Float32Array(this.camera.matrixWorldInverse.elements),
      }),
    ) as unknown as SkinEngineApi;

    // ⚡ Aquí aplicamos siempre el playbackRate que tengas
    if ((this.engineApi as any).setSpeed) {
      (this.engineApi as any).setSpeed(this.playbackRate);
    }

    this.skinIsRunning = true;
    this.skinCanvas.nativeElement.style.display = 'block';
    return this.engineApi;
  }


  /**
   * Alterna entre mostrar/ocultar el skin
   */
  async toggleSkin() {
    if (this.skinIsRunning) {
      // Estaba activo, lo detenemos
      this.engineApi?.stop();
      this.skinIsRunning = false;
      this.skinCanvas.nativeElement.style.display = 'none';
    } else {
      // Estaba inactivo, lo iniciamos
      await this.initSkinEngine();
    }
  }

  public currentModel: string | null = null;

  async loadSkinModel(url: string) {
    console.log(`Intentando cargar modelo: ${url}`);
    
    if (this.currentModel === url) { 
      console.log('El modelo ya está cargado, no es necesario recargar');
      return; 
    }

    const previousModel = this.currentModel;
    
    try {
      // Fade out suave antes de detener el motor
      const canvas = this.skinCanvas?.nativeElement;
      if (canvas && this.skinIsRunning) {
        canvas.style.transition = 'opacity 0.15s ease-out';
        canvas.style.opacity = '0';
        await new Promise(r => setTimeout(r, 150));
      }

      if (this.engineApi) {
        this.engineApi.stop();
        this.skinIsRunning = false;
      }
      
      // Iniciamos el motor con el nuevo URL
      console.log(`Iniciando motor de skin con URL: ${url}`);
      await this.initSkinEngine(url);
      this.loader.load(
        url,
        gltf => {
          this.clipDurations.clear();
          gltf.animations.forEach(anim => {
            this.clipDurations.set(anim.name, anim.duration * 1000);
          });
        }
      );
      this.currentModel = url;

      // Fade in tras cargar
      if (canvas) {
        canvas.style.opacity = '1';
      }

      console.log('Modelo cargado exitosamente');
    } catch (error) {
      console.error(`Error al cargar el modelo ${url}:`, error);
      // Si falla, restaurar modelo anterior o pose neutral local
      const fallback = (previousModel && previousModel !== url) ? previousModel : '/assets/hola_0.gltf';
      if (url !== fallback) {
        console.log(`Restaurando modelo: ${fallback}`);
        await this.loadSkinModel(fallback);
      }
    }
  }

  public playClip(clip: string, loop = false) {
    this.engineApi?.play(clip, loop);
    if (!loop) {
      const ms = this.clipDurations.get(clip) ?? 1000;
      console.log(`CanvasComponent: clip "${clip}" no-loop, emitir animationEnded en ${ms}ms`);
      setTimeout(() => {
        console.log('CanvasComponent: emit animationEnded');
        this.animationEnded.emit();
      }, ms);
    }
  }

  public stopClip() {
    this.engineApi?.stop();
  }

  /** en CanvasComponent */
  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    console.log('Velocidad actualizada a:', rate);

    // 1) Si el skinEngine está activo, ajusta su velocidad
    if (this.engineApi && typeof (this.engineApi as any).setSpeed === 'function') {
      (this.engineApi as any).setSpeed(rate);
    }

    // 2) Si tienes un loop de poses secuencial en marcha, reinícialo
    if (this.poseInterval) {
      // guarda el estado de loop
      const looping = !!this.poseInterval;
      clearInterval(this.poseInterval);
      this.poseInterval = null;
      // relanza con el nuevo playbackRate
      this.reproducirAnimacionSecuencial(looping);
    }
  }


  public resizeToContainer(w: number, h: number): void {
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.controls) this.controls.update();
  }

  public get skinReady(): boolean {
    return this.skinIsRunning;
  }

  public get availableClips(): string[] {
    return this.engineApi?.clips ?? [];
  }

}