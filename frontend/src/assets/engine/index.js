// WebGL - Skinning glTF
// from http://localhost:8082/webgl/webgl-skinning-3d-gltf-skinned.html

"use strict";

// Variables globales para los programas de shader
let skinProgramInfo;
let meshProgramInfo;
let gl;

// Material por defecto con un color más visible
const defaultMaterial = {
  uniforms: {
    u_diffuse: [1.0, 0.0, 0.0, 1.0], // Color rojo brillante
    u_lightDirection: [0.5, 0.7, 1],  // Dirección de la luz normalizada
    u_useTexture: 0,                  // No usar textura por defecto
  },
};

// Funciones auxiliares
function degToRad(deg) {
  return deg * Math.PI / 180;
}

function throwNoKey(key) {
  throw new Error(`no key: ${key}`);
}

const accessorTypeToNumComponentsMap = {
  'SCALAR': 1,
  'VEC2': 2,
  'VEC3': 3,
  'VEC4': 4,
  'MAT2': 4,
  'MAT3': 9,
  'MAT4': 16,
};

function accessorTypeToNumComponents(type) {
  return accessorTypeToNumComponentsMap[type] || throwNoKey(type);
}

const glTypeToTypedArrayMap = {
  '5120': Int8Array,    // gl.BYTE
  '5121': Uint8Array,   // gl.UNSIGNED_BYTE
  '5122': Int16Array,   // gl.SHORT
  '5123': Uint16Array,  // gl.UNSIGNED_SHORT
  '5124': Int32Array,   // gl.INT
  '5125': Uint32Array,  // gl.UNSIGNED_INT
  '5126': Float32Array, // gl.FLOAT
};

function glTypeToTypedArray(type) {
  return glTypeToTypedArrayMap[type] || throwNoKey(type);
}

async function loadFile(url, typeFunc) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`could not load: ${url}`);
  }
  return await response[typeFunc]();
}

async function loadBinary(url) {
  return loadFile(url, 'arrayBuffer');
}

async function loadJSON(url) {
  return loadFile(url, 'json');
}

// Clases necesarias
class TRS {
  constructor(position = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1]) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
  getMatrix(dst) {
    dst = dst || new Float32Array(16);
    m4.compose(this.position, this.rotation, this.scale, dst);
    return dst;
  }
}

class Node {
  constructor(source, name) {
    this.name = name;
    this.source = source;
    this.parent = null;
    this.children = [];
    this.localMatrix = m4.identity();
    this.worldMatrix = m4.identity();
    this.drawables = [];
  }
  setParent(parent) {
    if (this.parent) {
      this.parent._removeChild(this);
      this.parent = null;
    }
    if (parent) {
      parent._addChild(this);
      this.parent = parent;
    }
  }
  updateWorldMatrix(parentWorldMatrix) {
    const source = this.source;
    if (source) {
      source.getMatrix(this.localMatrix);
    }

    if (parentWorldMatrix) {
      m4.multiply(parentWorldMatrix, this.localMatrix, this.worldMatrix);
    } else {
      m4.copy(this.localMatrix, this.worldMatrix);
    }

    const worldMatrix = this.worldMatrix;
    for (const child of this.children) {
      child.updateWorldMatrix(worldMatrix);
    }
  }
  traverse(fn) {
    fn(this);
    for (const child of this.children) {
      child.traverse(fn);
    }
  }
  _addChild(child) {
    this.children.push(child);
  }
  _removeChild(child) {
    const ndx = this.children.indexOf(child);
    this.children.splice(ndx, 1);
  }
}

// Función principal
export async function main() {
  console.log('Iniciando main desde assets');
  
  try {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // Esperar a que las dependencias estén cargadas
    if (!window.webglUtils || !window.m4) {
      await new Promise((resolve, reject) => {
        const webglUtilsScript = document.createElement('script');
        webglUtilsScript.src = 'https://webglfundamentals.org/webgl/resources/webgl-utils.js';
        webglUtilsScript.onload = () => {
          const m4Script = document.createElement('script');
          m4Script.src = 'https://webglfundamentals.org/webgl/resources/m4.js';
          m4Script.onload = resolve;
          m4Script.onerror = reject;
          document.head.appendChild(m4Script);
        };
        webglUtilsScript.onerror = reject;
        document.head.appendChild(webglUtilsScript);
      });
    }

    // Inicializar WebGL
    const canvas = document.querySelector("#canvas");
    if (!canvas) {
      throw new Error("No se encontró el elemento canvas");
    }

    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl = canvas.getContext("webgl", { 
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });
    if (!gl) {
      throw new Error("No se pudo obtener el contexto WebGL");
    }

    // Configurar WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Verificar extensión necesaria
    const ext = gl.getExtension('OES_texture_float');
    if (!ext) {
      throw new Error("La extensión OES_texture_float no está disponible");
    }

    // Crear y compilar los shaders
    const skinVSElement = document.querySelector('#skinVS');
    const meshVSElement = document.querySelector('#meshVS');
    const fsElement = document.querySelector('#fs');

    if (!skinVSElement || !meshVSElement || !fsElement) {
      throw new Error("No se encontraron los elementos shader en el HTML");
    }

    const skinVS = skinVSElement.textContent;
    const meshVS = meshVSElement.textContent;
    const fs = fsElement.textContent;

    if (!skinVS || !meshVS || !fs) {
      throw new Error("Los shaders están vacíos");
    }

    // Crear los programas de shader usando webglUtils
    skinProgramInfo = window.webglUtils.createProgramInfo(gl, [skinVS, fs]);
    meshProgramInfo = window.webglUtils.createProgramInfo(gl, [meshVS, fs]);

    if (!skinProgramInfo || !meshProgramInfo) {
      throw new Error("Error al crear los programas de shaders");
    }

    // Configurar la cámara inicial
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    // Posicionar la cámara más cerca y más alta para ver mejor el modelo
    const cameraPosition = [0, 3, 3]; // Más cerca y un poco más alta
    const target = [0, 1.5, 0]; // Mirando un poco más arriba
    const up = [0, 1, 0];
    const camera = m4.lookAt(cameraPosition, target, up);
    const view = m4.inverse(camera);

    // Intentar cargar el modelo con una ruta relativa
    const modelPath = './assets/engine/cubo.gltf';
    console.log(__dirname);
    //const modelPath = './assets/malanimation.gltf';
    console.log('Intentando cargar el modelo desde:', modelPath);
    
    let gltf;
    try {
      gltf = await loadGLTF(modelPath, gl);
      console.log("GLTF cargado exitosamente:", gltf);
      console.log("Número de escenas:", gltf.scenes.length);
      console.log("Número de nodos:", gltf.nodes.length);
      console.log("Número de meshes:", gltf.meshes.length);
    } catch (error) {
      console.error("Error cargando el modelo desde la primera ruta:", error);
      
      // Intentar con una ruta alternativa
      //const altPath = '../assets/malanimation.gltf';
      //console.log('Intentando cargar el modelo desde ruta alternativa:', altPath);
      //gltf = await loadGLTF(altPath, gl);
    }
    
    if (!gltf || !gltf.scenes || gltf.scenes.length === 0) {
      throw new Error("No se encontraron escenas en el modelo GLTF");
    }

    // Función de renderizado
    function render(time) {
      time *= 0.001;  // convertir a segundos

      // Actualizar tamaño del canvas si es necesario
      webglUtils.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      // Limpiar buffers
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const sharedUniforms = {
        u_lightDirection: m4.normalize([1, 3, 5]), // Luz desde arriba y adelante
        u_view: view,
        u_projection: projection,
        ...defaultMaterial.uniforms,
      };

      // Renderizar todas las escenas
      for (const scene of gltf.scenes) {
        console.log("Renderizando escena:", scene.name);
        // Actualizar matrices
        scene.root.updateWorldMatrix();
        
        // Renderizar cada nodo
        scene.root.traverse((node) => {
          //console.log("Renderizando nodo:", node.name, "con", node.drawables.length, "drawables");
          for (const drawable of node.drawables) {
            drawable.render(node, projection, view, sharedUniforms);
          }
        });
      }

      requestAnimationFrame(render);
    }

    // Iniciar el bucle de renderizado
    requestAnimationFrame(render);

    function degToRad(deg) {
      return deg * Math.PI / 180;
    }

    const origMatrices = new Map();

    //---------------------------HUESOS---------------------------------------
    function animSkin(skin, a) { //avatar, angulo
      for (let i = 0; i < skin.joints.length; ++i) {
        const joint = skin.joints[i];
        // ponemos los huesos quw queremos animar
        if (joint.name === "Bone.006.L") {
            // continue;
          // Si no se ha guardado la matriz original para este hueso, la guardamos:
          if (!origMatrices.has(joint)) {
            origMatrices.set(joint, joint.source.getMatrix());
          }
          // Recuperamos la matriz original
          const origMatrix = origMatrices.get(joint);
          // Rotamos alrededor del eje Y (puedes ajustar el ángulo 'a' según lo necesites)
          const mR = m4.xRotate(origMatrix, a);
          const mT = m4.translation(0, 0, 1);
          const m = m4.multiply(mR, mT);
          // Descomponemos la matriz resultante para actualizar la posición, rotación y escala del hueso
          m4.decompose(m , joint.source.position, joint.source.rotation, joint.source.scale);
        }
        //m4.multiply(mR, mT, joint.source.worldMatrix);
        //multiply(m, translation(tx, ty, tz), dst);
        if (joint.name === "Bone.003.L") {
          if (!origMatrices.has(joint)) {
            origMatrices.set(joint, joint.source.getMatrix());
          }
          const origMatrix = origMatrices.get(joint);
          const mR = m4.xRotate(origMatrix, a);
          m4.decompose(mR , joint.source.position, joint.source.rotation, joint.source.scale);
        }
      }
    }
    function slerp(q1, q2, t) {
      let cosHalfTheta = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];
      if (cosHalfTheta < 0) {
        q2 = q2.map(x => -x);
        cosHalfTheta = -cosHalfTheta;
      }
      if (cosHalfTheta >= 1.0) {
        return q1.slice();
      }
      const halfTheta = Math.acos(cosHalfTheta);
      const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);
      if (Math.abs(sinHalfTheta) < 0.001) {
        return [
          q1[0] * 0.5 + q2[0] * 0.5,
          q1[1] * 0.5 + q2[1] * 0.5,
          q1[2] * 0.5 + q2[2] * 0.5,
          q1[3] * 0.5 + q2[3] * 0.5,
        ];
      }
      const ratioA = Math.sin((1-t)*halfTheta) / sinHalfTheta;
      const ratioB = Math.sin(t*halfTheta) / sinHalfTheta;
      return [
        q1[0]*ratioA + q2[0]*ratioB,
        q1[1]*ratioA + q2[1]*ratioB,
        q1[2]*ratioA + q2[2]*ratioB,
        q1[3]*ratioA + q2[3]*ratioB,
      ];
    }

    function animateBone(bone, t) {
      // bone: es el objeto (nodo) que representa el hueso.
      // t: factor de interpolación entre 0 (pose inicial) y 1 (pose objetivo)

      // cambiamos pos
      bone.source.position = [
        bone.initialPosition[0]*(1-t) + bone.targetPosition[0]*t,
        bone.initialPosition[1]*(1-t) + bone.targetPosition[1]*t,
        bone.initialPosition[2]*(1-t) + bone.targetPosition[2]*t,
      ];
      
      // interpolar rot usando SLERP
      bone.source.rotation = slerp(bone.initialRotation, bone.targetRotation, t);
      
      // interpolar escala
      // bone.source.scale = [
      //   bone.initialScale[0]*(1-t) + bone.targetScale[0]*t,
      //   bone.initialScale[1]*(1-t) + bone.targetScale[1]*t,
      //   bone.initialScale[2]*(1-t) + bone.targetScale[2]*t,
      // ];
    }

    function animateGesture(time) {
      const duracionGesto = 2.0;
      // Calculamos t de 0 a 1, y de 1 a 0 para un ciclo de ida y vuelta
      let t = (time % duracionGesto) / duracionGesto;
      if (t > 0.5) {
        t = 1 - t;
      }
      const skin = gltf.skins[0];
      for (let i = 0; i < skin.joints.length; i++) {
        const joint = skin.joints[i];
        if (joint.name === "Bone.003.R") {

          // joint.initialPosition = [...]; joint.targetPosition = [...];
          // joint.initialRotation = [...]; joint.targetRotation = [...];
          // joint.initialScale = [...];    joint.targetScale = [...];
          animateBone(joint, t);
        }
      }
    }

    
    //---------------------------HUESOS---------------------------------------
  } catch (error) {
    console.error("Error en la inicialización:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Función para cargar el modelo GLTF
async function loadGLTF(url, gl) {
  console.log("Iniciando carga de GLTF desde:", url);
  const gltf = await loadJSON(url);
  console.log("JSON del modelo cargado:", gltf);

  // Cargar todos los archivos referenciados relativos al archivo gltf
  const baseURL = new URL(url, window.location.href);
  console.log("URL base para buffers:", baseURL.href);
  
  gltf.buffers = await Promise.all(gltf.buffers.map(async (buffer) => {
    const bufferUrl = new URL(buffer.uri, baseURL.href);
    console.log("Cargando buffer desde:", bufferUrl.href);
    return loadBinary(bufferUrl.href);
  }));
  console.log("Buffers cargados:", gltf.buffers.length);

  // Configurar meshes
  gltf.meshes.forEach((mesh, index) => {
    console.log(`Procesando mesh ${index}:`, mesh);
    mesh.primitives.forEach((primitive, primIndex) => {
      console.log(`Procesando primitiva ${primIndex} del mesh ${index}`);
      const attribs = {};
      let numElements;
      
      // Procesar atributos
      for (const [attribName, index] of Object.entries(primitive.attributes)) {
        console.log(`Procesando atributo ${attribName}`);
        const {accessor, buffer, stride} = getAccessorAndWebGLBuffer(gl, gltf, index);
        numElements = accessor.count;
        attribs[`a_${attribName}`] = {
          buffer,
          type: accessor.componentType,
          numComponents: accessorTypeToNumComponents(accessor.type),
          stride,
          offset: accessor.byteOffset | 0,
        };
      }

      const bufferInfo = {
        attribs,
        numElements,
      };

      if (primitive.indices !== undefined) {
        console.log("Procesando índices");
        const {accessor, buffer} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices);
        bufferInfo.numElements = accessor.count;
        bufferInfo.indices = buffer;
        bufferInfo.elementType = accessor.componentType;
      }

      primitive.bufferInfo = bufferInfo;
      primitive.material = gltf.materials && gltf.materials[primitive.material] || defaultMaterial;
      console.log("BufferInfo creado:", bufferInfo);
    });
  });

  // Configurar nodos
  const skinNodes = [];
  const origNodes = gltf.nodes;
  gltf.nodes = gltf.nodes.map((n, index) => {
    const {name, skin, mesh, translation, rotation, scale} = n;
    const trs = new TRS(translation, rotation, scale);
    const node = new Node(trs, name);
    
    console.log(`Procesando nodo ${index}:`, name);
    console.log("Mesh index:", mesh);
    console.log("Skin index:", skin);
    
    if (mesh !== undefined) {
      const realMesh = gltf.meshes[mesh];
      console.log("Mesh encontrado:", realMesh);
      
      if (skin !== undefined) {
        console.log("Creando MeshRenderer con skin para:", name);
        skinNodes.push({node, mesh: realMesh, skinNdx: skin});
        node.drawables.push(new MeshRenderer(realMesh, skinProgramInfo));
      } else {
        console.log("Creando MeshRenderer sin skin para:", name);
        node.drawables.push(new MeshRenderer(realMesh, meshProgramInfo));
      }
      
      console.log("Drawables creados para el nodo:", node.drawables.length);
    }
    
    return node;
  });

  // Configurar escenas
  for (const scene of gltf.scenes) {
    scene.root = new Node(new TRS(), scene.name);
    console.log("Configurando escena:", scene.name);
    console.log("Nodos en la escena:", scene.nodes);
    addChildren(gltf.nodes, scene.root, scene.nodes);
  }

  return gltf;
}

function addChildren(nodes, node, childIndices) {
  childIndices.forEach((childNdx) => {
    const child = nodes[childNdx];
    child.setParent(node);
  });
}

function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const buffer = gl.createBuffer();
  const arrayBuffer = gltf.buffers[bufferView.buffer];
  const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return {
    accessor,
    buffer,
    stride: bufferView.byteStride,
  };
}

class MeshRenderer {
  constructor(mesh, programInfo) {
    this.mesh = mesh;
    this.programInfo = programInfo;
    console.log("MeshRenderer creado con programInfo:", programInfo);
  }

  render(node, projection, view, sharedUniforms) {
    const {mesh, programInfo} = this;
    console.log("Renderizando mesh con programInfo:", programInfo);
    
    mesh.primitives.forEach((primitive, index) => {
      console.log(`Renderizando primitiva ${index}:`, primitive);
      const {material, bufferInfo} = primitive;
      
      if (!programInfo || !programInfo.program) {
        console.error("ProgramInfo no válido:", programInfo);
        return;
      }

      gl.useProgram(programInfo.program);

      // Configurar uniforms
      const uniforms = {
        u_projection: projection,
        u_view: view,
        u_world: node.worldMatrix,
        ...sharedUniforms,
        ...material.uniforms,
      };
      console.log("Aplicando uniforms:", uniforms);
      webglUtils.setUniforms(programInfo, uniforms);

      // Configurar atributos
      console.log("Configurando atributos con bufferInfo:", bufferInfo);
      webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);

      // Dibujar
      console.log("Dibujando con numElements:", bufferInfo.numElements);
      gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    });
  }
}

main();
