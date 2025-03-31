import { Injectable } from '@angular/core';
import { mat4, vec3 } from 'gl-matrix';

@Injectable({
  providedIn: 'root'
})
export class WebGL2EngineService {
  private canvas!: HTMLCanvasElement;
  private gl!: WebGL2RenderingContext;
  private program!: WebGLProgram;

  // Matrices de cámara y transformación
  private projectionMatrix: mat4 = mat4.create();
  private viewMatrix: mat4 = mat4.create();
  private modelMatrix: mat4 = mat4.create();

  // Buffers y cuenta de índices para el modelo por defecto
  private defaultVertexBuffer!: WebGLBuffer;
  private defaultIndexBuffer!: WebGLBuffer;
  private defaultIndexCount: number = 0;

  // Uniform locations (se obtienen dinámicamente en render)
  // (uMVPMatrix, uModelMatrix y uNormalMatrix se actualizan en cada frame)
  
  // Variables para controles orbit (muy básicos)
  private angleX: number = 0;
  private angleY: number = 0;
  private distance: number = 10;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private isDragging: boolean = false;

  // Parámetros de luz para el shader
  private lightDirection: vec3 = vec3.fromValues(0.5, 0.7, 1.0);

  // ID del requestAnimationFrame para poder detener la animación
  private animationFrameId: number = 0;

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 no está soportado en este navegador.');
      return;
    }
    this.gl = gl;

    this.resize();
    this.gl.clearColor(1.0, 1.0, 0.84, 1.0);
    this.createProgram();
    this.createDefaultModel();
    this.setupControls();

    this.animate();

    window.addEventListener('resize', () => this.resize());
  }

  /** Ajusta el tamaño del canvas y recalcula la matriz de proyección.*/
  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    mat4.perspective(this.projectionMatrix, 45 * Math.PI / 180, width / height, 0.1, 100.0);
  }

  // Compila shaderss, enlaza el programa
  private createProgram(): void {
    const vertexShaderSource = `#version 300 es
    precision mediump float;
    layout(location = 0) in vec3 aPosition;
    layout(location = 1) in vec3 aNormal;
    layout(location = 2) in vec3 aColor;
    
    uniform mat4 uMVPMatrix;
    uniform mat4 uModelMatrix;
    uniform mat4 uNormalMatrix;
    
    out vec3 vColor;
    out vec3 vNormal;
    out vec3 vFragPos;
    
    void main() {
      gl_Position = uMVPMatrix * vec4(aPosition, 1.0);
      vFragPos = (uModelMatrix * vec4(aPosition, 1.0)).xyz;
      vNormal = mat3(uNormalMatrix) * aNormal;
      vColor = aColor;
    }
    `;

    const fragmentShaderSource = `#version 300 es
    precision mediump float;
    in vec3 vColor;
    in vec3 vNormal;
    in vec3 vFragPos;
    
    out vec4 fragColor;
    
    uniform vec3 uLightDirection;
    uniform vec3 uLightColor;
    uniform vec3 uAmbientColor;
    
    void main() {
      vec3 norm = normalize(vNormal);
      vec3 lightDir = normalize(uLightDirection);
      float diff = max(dot(norm, lightDir), 0.0);
      vec3 diffuse = diff * uLightColor;
      vec3 ambient = uAmbientColor;
      vec3 result = (ambient + diffuse) * vColor;
      fragColor = vec4(result, 1.0);
    }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.program = this.gl.createProgram()!;
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Error al enlazar el programa:', this.gl.getProgramInfoLog(this.program));
    }
    this.gl.useProgram(this.program);
  }

  // Compila un shader.
  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Error al compilar el shader:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      throw new Error('Error en la compilación del shader');
    }
    return shader;
  }


  private createDefaultModel(): void {
    // Datos intercalados: [x, y, z, nx, ny, nz, r, g, b]
    const vertices = new Float32Array([
      // frente
      -1, -1,  1,  0,  0,  1,  1, 0, 0,
       1, -1,  1,  0,  0,  1,  0, 1, 0,
       1,  1,  1,  0,  0,  1,  0, 0, 1,
      -1,  1,  1,  0,  0,  1,  1, 1, 0,
      // trasera
      -1, -1, -1,  0,  0, -1,  1, 0, 1,
       1, -1, -1,  0,  0, -1,  0, 1, 1,
       1,  1, -1,  0,  0, -1,  1, 1, 1,
      -1,  1, -1,  0,  0, -1,  0, 0, 0,
    ]);
    // indices para formar un cubo
    const indices = new Uint16Array([
      // frente
      0, 1, 2,  0, 2, 3,
      // derecha
      1, 5, 6,  1, 6, 2,
      // trasera
      5, 4, 7,  5, 7, 6,
      // izq
      4, 0, 3,  4, 3, 7,
      // arriba
      3, 2, 6,  3, 6, 7,
      // abajo
      4, 5, 1,  4, 1, 0,
    ]);
    this.defaultIndexCount = indices.length;

    // Crear y configurar buffer de vértices
    this.defaultVertexBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.defaultVertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Crear y configurar buffer de índices
    this.defaultIndexBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.defaultIndexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

    // Configurar atributos:  
    // location 0: posición (3 floats)  
    // location 1: normal (3 floats)  
    // location 2: color (3 floats)
    const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, stride, 0);
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(2, 3, this.gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    this.gl.enableVertexAttribArray(2);

    // Matriz de modelo por defecto (podrías centrar el modelo aquí si fuese necesario)
    mat4.identity(this.modelMatrix);
  }

  // controles de órbita mouse.

  private setupControls(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.angleY += deltaX * 0.01;
      this.angleX += deltaY * 0.01;
    });
    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance += e.deltaY * 0.01;
      if (this.distance < 2) this.distance = 2;
      if (this.distance > 50) this.distance = 50;
    });
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.render();
  }

  /** Renderiza el modelo actual aplicando las transformaciones y la iluminación.*/
  private render(): void {
    // Actualizar la vista según los controles de órbita
    const eye: vec3 = vec3.create();
    const center: vec3 = vec3.fromValues(0, 0, 0);
    const x = this.distance * Math.sin(this.angleX) * Math.cos(this.angleY);
    const y = this.distance * Math.cos(this.angleX);
    const z = this.distance * Math.sin(this.angleX) * Math.sin(this.angleY);
    vec3.set(eye, x, y, z);
    mat4.lookAt(this.viewMatrix, eye, center, vec3.fromValues(0, 1, 0));

    // Calcular la matriz Modelo-Vista-Proyección (MVP)
    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, this.viewMatrix, this.modelMatrix);
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, this.projectionMatrix, modelViewMatrix);

    // Calcular la matriz de normales (inversa transpuesta de la matriz de modelo)
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, this.modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // Limpiar el canvas
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Usar el programa y establecer los uniforms
    this.gl.useProgram(this.program);
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'uMVPMatrix'), false, mvpMatrix);
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'uModelMatrix'), false, this.modelMatrix);
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'uNormalMatrix'), false, normalMatrix);
    this.gl.uniform3fv(this.gl.getUniformLocation(this.program, 'uLightDirection'), this.lightDirection);
    this.gl.uniform3fv(this.gl.getUniformLocation(this.program, 'uLightColor'), [1.0, 1.0, 1.0]);
    this.gl.uniform3fv(this.gl.getUniformLocation(this.program, 'uAmbientColor'), [0.2, 0.2, 0.2]);

    // Reubicar buffers y dibujar el modelo
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.defaultVertexBuffer);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.defaultIndexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, this.defaultIndexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  public limpiarCanvas(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  //  cargar, parsear y actualizar lasd anim
  public cargarAnimacionesDinamicas(urls: string[]): void {
    console.log('');
  }
}
