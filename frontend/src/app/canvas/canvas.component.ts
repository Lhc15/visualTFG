import { Component, ElementRef, AfterViewInit, ViewChild, Input, OnDestroy } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GLTFLoader } from 'three-stdlib';
import { AnimacionService } from '../services/animacion.service';
import { GltfService } from '../services/gltf.service';
import { Subscription } from 'rxjs';
//import { main } from '../../assets/engine/index.js';
import { main } from '../../../../engine/main.js'

// Declaración para acceder a main() desde window
declare global {
  interface Window {
    main: Function;
  }
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [HttpClientModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css'],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('webglCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  @Input() animationUrls: string[] = [];

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private loader: GLTFLoader = new GLTFLoader();
  private poses: THREE.Group[] = [];
  private avatar!: THREE.Group | undefined;
  private animacionSubscription: Subscription;
  private engineScriptLoaded: boolean = false;

  constructor(
    private animacionService: AnimacionService,
    private gltfService: GltfService
  ) {
    // Suscribirse al servicio para recibir las animaciones
    this.animacionSubscription = this.animacionService.animaciones$.subscribe((urls: string[]) => {
      // Si hay URLs pero no hay permiso para reproducir, ignorar
      if (urls.length > 0) {
        const permitido = this.animacionService.permitirReproduccion();
        console.log('Estado de reproducción:', permitido);
        
        if (permitido) {
          console.log('URLs de las animaciones recibidas:', urls);
          // Esperar un momento antes de cargar las animaciones
          setTimeout(() => {
            if (this.animacionService.permitirReproduccion()) {
              this.cargarAnimacionesDinamicas(urls);
            }
          }, 100);
        } else {
          console.log('Ignorando animaciones - reproducción no permitida');
          this.limpiarCanvas();
        }
      } else {
        this.limpiarCanvas();
      }
    });
  }

  ngOnDestroy() {
    if (this.animacionSubscription) {
      this.animacionSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.addLights();
    this.addControls();
    this.loadDefaultPose(); // Cargar la pose inicial por defecto
    this.animate();
    this.handleResize();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
  }

  private initCamera(): void {
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    this.camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
    this.camera.position.set(0, 5.5, 5); // Posición en X, Y, Z
    this.camera.lookAt(0, 0, 0); // La cámara mira hacia el centro de la escena
    this.scene.add(this.camera);
  }

  private initRenderer(): void {
    if (!this.canvasRef) {
      console.error('Canvas element not found.');
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xfff8d4);
  }

  private addLights(): void {
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    this.scene.add(light);

    // Luz ambiental suave
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemiLight);

    // Luz direccional más definida
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
    this.controls.minAzimuthAngle = -Math.PI / 12; // -15 grados
    this.controls.maxAzimuthAngle = Math.PI / 12;  // 15 grado

    this.controls.autoRotate = false;

    this.controls.update();
  }

  private cargarAnimacionesDinamicas(urls: string[]): void {
    // Verificar una última vez antes de cargar
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

  private reproducirAnimacionSecuencial(): void {
    let index = 0;
    const poseInterval = setInterval(() => {
      const currentPose = this.poses[index];
  
      if (this.avatar) {
        this.avatar.clear(); // Limpia los hijos del avatar existente
        currentPose.children.forEach((child) => {
          this.avatar?.add(child.clone()); // Clona y agrega los nuevos hijos
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
    }, 120); // Intervalo ajustable
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

  private loadDefaultPose(): void {
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
  

  limpiarCanvas(): void {
    console.log('Limpiando canvas...');
    // Limpiar el avatar y poses
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.clear();
    }
    this.avatar = undefined;
    this.poses = [];

    // Limpiar la escena pero mantener el canvas
    if (this.scene) {
      this.scene.clear();
    }

    // Limpiar el buffer del renderer
    if (this.renderer) {
      this.renderer.clear();
    }

    console.log('Canvas limpiado completamente.');
  }

  // Método para cargar el script de engine/index.js
  cargarScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.engineScriptLoaded) {
        resolve();
        return;
      }

      // Cargar webglUtils primero
      const webglUtilsScript = document.createElement('script');
      webglUtilsScript.src = 'https://webglfundamentals.org/webgl/resources/webgl-utils.js';
      
      webglUtilsScript.onload = () => {
        // Cargar m4 después
        const m4Script = document.createElement('script');
        m4Script.src = 'https://webglfundamentals.org/webgl/resources/m4.js';
        
        m4Script.onload = () => {
          // Finalmente cargar el script principal
          const script = document.createElement('script');
          script.type = 'text/javascript';
          
          // Intentar diferentes rutas para el archivo
          const posiblesPaths = [
            'engine/index.js',
            './engine/index.js',
            '../engine/index.js',
            '../../engine/index.js',
            '/engine/index.js',
            window.location.origin + '/engine/index.js'
          ];
          
          let pathIndex = 0;
          
          // Función para intentar cargar el script con diferentes rutas
          const intentarCargar = () => {
            if (pathIndex >= posiblesPaths.length) {
              reject(new Error('No se pudo cargar el script después de intentar con todas las rutas posibles'));
              return;
            }
            
            const currentPath = posiblesPaths[pathIndex];
            console.log(`Intentando cargar el script desde: ${currentPath}`);
            
            script.src = currentPath;
            
            script.onload = () => {
              console.log(`Script cargado correctamente desde: ${currentPath}`);
              this.engineScriptLoaded = true;
              resolve();
            };
            
            script.onerror = () => {
              console.log(`Error al cargar desde: ${currentPath}, probando siguiente ruta...`);
              pathIndex++;
              intentarCargar();
            };
          };
          
          // Iniciar el proceso de carga
          intentarCargar();
          document.head.appendChild(script);
        };
        
        document.head.appendChild(m4Script);
      };
      
      document.head.appendChild(webglUtilsScript);
    });
  }

  // Método para mostrarThree cuando se hace clic en el botón Three
  mostrarThree(): void {
    console.log('Botón Three - Mostrando Three.js');
    
    // Ocultar el canvas del engine
    const canvasEngine = document.getElementById('canvas');
    if (canvasEngine) {
      canvasEngine.style.display = 'none';
    }
    
    // Mostrar el canvas de Three.js
    if (this.canvasRef && this.canvasRef.nativeElement) {
      this.canvasRef.nativeElement.style.display = 'block';
    }
  }

  // Método para ejecutar la función main de TAG cuando se hace clic en el botón TAG
  ejecutarMain(): void {
    console.log('Botón TAG - Ejecutando main');
    
    // Ocultar el canvas de Three.js
    if (this.canvasRef && this.canvasRef.nativeElement) {
      this.canvasRef.nativeElement.style.display = 'none';
    }
    
    // Mostrar el canvas del engine
    const canvasEngine = document.getElementById('canvas');
    if (canvasEngine) {
      canvasEngine.style.display = 'block';
      
      // Inyectar los shaders en el documento
      this.injectShaders();
      
      // Ejecutar main sin limpiar el canvas
      setTimeout(() => {main();}, 100);
    } else {
      console.error('No se encontró el elemento canvas');
    }
  }

  // Método para inyectar los shaders en el documento
  private injectShaders(): void {
    const shaderIds = ['skinVS', 'meshVS', 'fs', 'vertex-shader-3d', 'fragment-shader-3d'];
    
    // Eliminar shaders existentes si los hay
    shaderIds.forEach(id => {
      const existingShader = document.getElementById(id);
      if (existingShader) {
        existingShader.remove();
      }
    });

    // Obtener el contenido del template
    const template = document.createElement('template');
    template.innerHTML = `
      <script id="skinVS" type="notjs">
        attribute vec4 a_position;
        attribute vec3 a_normal;
        attribute vec4 a_weights;
        attribute vec4 a_joints;
        attribute vec2 a_texcoord;

        uniform mat4 u_projection;
        uniform mat4 u_view;
        uniform mat4 u_world;
        uniform sampler2D u_jointTexture;
        uniform float u_numJoints;

        varying vec3 v_normal;
        varying vec2 v_texcoord;

        mat4 getBoneMatrix(float jointNdx) {
          float v = (jointNdx + 0.5) / u_numJoints;
          float y = v;
          
          vec4 v0 = texture2D(u_jointTexture, vec2(0.125, y));
          vec4 v1 = texture2D(u_jointTexture, vec2(0.375, y));
          vec4 v2 = texture2D(u_jointTexture, vec2(0.625, y));
          vec4 v3 = texture2D(u_jointTexture, vec2(0.875, y));
          
          return mat4(v0, v1, v2, v3);
        }

        void main() {
          mat4 skinMatrix = getBoneMatrix(a_joints[0]) * a_weights[0] +
                            getBoneMatrix(a_joints[1]) * a_weights[1] +
                            getBoneMatrix(a_joints[2]) * a_weights[2] +
                            getBoneMatrix(a_joints[3]) * a_weights[3];
          
          vec4 worldPosition = u_world * skinMatrix * a_position;
          gl_Position = u_projection * u_view * worldPosition;
          v_normal = mat3(u_world) * mat3(skinMatrix) * a_normal;
          v_texcoord = a_texcoord;
        }
      </script>

      <script id="meshVS" type="notjs">
        attribute vec4 a_position;
        attribute vec3 a_normal;
        attribute vec2 a_texcoord;

        uniform mat4 u_projection;
        uniform mat4 u_view;
        uniform mat4 u_world;

        varying vec3 v_normal;
        varying vec2 v_texcoord;

        void main() {
          gl_Position = u_projection * u_view * u_world * a_position;
          v_normal = mat3(u_world) * a_normal;
          v_texcoord = a_texcoord;
        }
      </script>

      <script id="fs" type="notjs">
        precision mediump float;

        varying vec3 v_normal;
        varying vec2 v_texcoord;

        uniform vec4 u_diffuse;
        uniform vec3 u_lightDirection;
        uniform float u_useTexture;
        uniform sampler2D u_texture;

        void main() {
          vec3 normal = normalize(v_normal);
          float light = max(dot(u_lightDirection, normal), 0.0);
          vec4 color = u_diffuse;
          
          if (u_useTexture > 0.5) {
            color = texture2D(u_texture, v_texcoord);
          }
          
          gl_FragColor = vec4(color.rgb * light, color.a);
        }
      </script>
    `;

    // Añadir los shaders al documento
    document.body.appendChild(template.content);
  }
}
