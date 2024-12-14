import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import gsap from 'gsap';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css'] 
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('webglCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private loader: GLTFLoader = new GLTFLoader();
  private currentPoseIndex: number = 0;
  private poses: THREE.Group[] = [];
  private avatar!: THREE.Group;
  private animationInProgress: boolean = false;

  private animacion: string[] = [
    'assets/models/hola/hola.gltf',
    'assets/models/hola/hola_1.gltf',
    'assets/models/hola/hola_2.gltf',
    'assets/models/hola/hola_3.gltf',
    'assets/models/hola/hola_4.gltf',
  ];

  ngAfterViewInit(): void {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.addLights();
    this.loadModels();
    this.addControls();
    this.animate();
    this.handleResize();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
  }

  private initCamera(): void {
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    this.camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
    this.camera.position.set(0, 1, 5);
    this.camera.lookAt(-3, 1, 0);
    this.scene.add(this.camera);
  }

  private initRenderer(): void {
    if (!this.canvasRef) {
      console.error('Canvas element not found.');
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf5f5dc); // Color de fondo del canvas
  }

  private addLights(): void {
    const light = new THREE.PointLight(0xffffff, 1, 0.000001);
    light.position.set(10, 10, 10);
    this.scene.add(light);
  }

  private loadModels(): void {
    const promises = this.animacion.map((poseFile) => {
      return new Promise<THREE.Group>((resolve, reject) => {
        this.loader.load(
          poseFile,
          (gltf) => resolve(gltf.scene),
          undefined,
          (error) => reject(error)
        );
      });
    });

    Promise.all(promises)
      .then((loadedPoses) => {
        this.poses = loadedPoses;
        this.avatar = this.poses[0];
        this.scene.add(this.avatar);
        this.startPoseAnimation();
      })
      .catch((error) => console.error('Error loading poses:', error));
  }

  private startPoseAnimation(): void {
    if (this.animationInProgress) return;
    this.animationInProgress = true;

    const poseInterval = setInterval(() => {
      if (this.avatar) this.scene.remove(this.avatar);

      this.avatar = this.poses[this.currentPoseIndex];
      this.avatar.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Color rojo
          mesh.material.needsUpdate = true;
        }
      });

      this.avatar.position.set(-3, 0, 0); // Mueve el avatar hacia la izquierda
      this.scene.add(this.avatar);

      this.currentPoseIndex++;

      if (this.currentPoseIndex >= this.poses.length) {
        clearInterval(poseInterval);
        this.animationInProgress = false;
        console.log('Animation finished.');
      }
    }, 2000);
  }

  private addControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;
    // this.controls.enablePan = false;
    // this.controls.enableZoom = false;

    // Control del giro en los ejes X y Z
    this.controls.minPolarAngle = Math.PI / 2; // Límite inferior (90 grados)
    this.controls.maxPolarAngle = Math.PI / 2; // Límite superior (90 grados)

    // Limitamos los ejes a izquierda y derecha
    this.controls.minAzimuthAngle = -Math.PI / 6; // Límite izquierdo (30º en radianes)
    this.controls.maxAzimuthAngle = Math.PI / 6; // Límite derecho (30º en radianes)

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
      const sizes = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      this.camera.aspect = sizes.width / sizes.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(sizes.width, sizes.height);
    });
  }
}
