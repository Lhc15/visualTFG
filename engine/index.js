"use strict";

// Función que escribe "hola caracola" en la consola
window.holaCaracola = function() {
  console.log("hola caracola");
};

async function main() {
  console.log("PEPE");
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  const ext = gl.getExtension('OES_texture_float');
  if (!ext) {
    return;  // the extension doesn't exist on this device
  }

  // compiles and links the shaders, looks up attribute and uniform locations
  const skinProgramInfo = webglUtils.createProgramInfo(gl, ["skinVS", "fs"]);
  const meshProgramInfo = webglUtils.createProgramInfo(gl, ["meshVS", "fs"]);

  // Método para aplicar la textura asegurando que no haya color azul de fondo
  function applyTextureToModel(gltf, texture) {
    console.log("Aplicando SOLO textura (sin color de base)");
    
    // Aplicar la textura a todos los materiales
    gltf.meshes.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        // Forzar material con SOLO textura
        primitive.material = {
          uniforms: {
            u_diffuse: [1, 1, 1, 1],  // Color neutro (blanco)
            u_useTexture: 1.0,         // FORZAR uso de textura
            u_texture: texture,
          }
        };
      });
    });
    //Texturas
    console.log("Textura aplicada - SIN COLOR DE BASE");
    var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");
  var textureLocation = gl.getUniformLocation(program, "u_texture");

  // Create a buffer for positions
  var positionBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Put the positions in the buffer
  setGeometry(gl);

  // provide texture coordinates for the rectangle.
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  // Set Texcoords.
  setTexcoords(gl);

  // Create a texture.
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));
  // Asynchronously load an image
  var image = new Image();
  image.src = "https://webglfundamentals.org/webgl/resources/f-texture.png";
  image.addEventListener('load', function() {
    // Now that the image has loaded make copy it to the texture.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  });
  }

  // Función para aplicar la textura al modelo (sin color de base)
  function applyCubeTextureToModel(gltf, texture) {
    console.log("Aplicando textura cubo.png al modelo...");
    
    let primitiveCount = 0;
    
    gltf.meshes.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        // Verificar coordenadas de textura
        const hasTexCoords = primitive.attributes && 
                            primitive.attributes.TEXCOORD_0 !== undefined;
        
        if (hasTexCoords) {
          primitiveCount++;
          // Configurar material para usar SOLO la textura cubo.png
          primitive.material = {
            uniforms: {
              u_diffuse: [1, 1, 1, 1],  // Color blanco neutro
              u_useTexture: 1.0,         // Forzar uso de textura
              u_texture: texture
            }
          };
        } else {
          console.warn("⚠️ Primitiva sin coordenadas UV:", mesh.name);
        }
      });
    });
    
    console.log(`✅ Textura cubo.png aplicada a ${primitiveCount} primitivas con UV`);
  }

  class Skin {
    constructor(joints, inverseBindMatrixData) {
      this.joints = joints;
      this.inverseBindMatrices = [];
      this.jointMatrices = [];
      // allocate enough space for one matrix per joint
      this.jointData = new Float32Array(joints.length * 16);
      // create views for each joint and inverseBindMatrix
      for (let i = 0; i < joints.length; ++i) {
        this.inverseBindMatrices.push(new Float32Array(
            inverseBindMatrixData.buffer,
            inverseBindMatrixData.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
            16));
        this.jointMatrices.push(new Float32Array(
            this.jointData.buffer,
            Float32Array.BYTES_PER_ELEMENT * 16 * i,
            16));
      }
      // create a texture to hold the joint matrices
      this.jointTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.jointTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    update(node) {
      const globalWorldInverse = m4.inverse(node.worldMatrix);
      // go through each joint and get its current worldMatrix
      // apply the inverse bind matrices and store the
      // entire result in the texture
      for (let j = 0; j < this.joints.length; ++j) {
        const joint = this.joints[j];
        const dst = this.jointMatrices[j];
        m4.multiply(globalWorldInverse, joint.worldMatrix, dst);
        m4.multiply(dst, this.inverseBindMatrices[j], dst);
      }
      gl.bindTexture(gl.TEXTURE_2D, this.jointTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, this.joints.length, 0,
                    gl.RGBA, gl.FLOAT, this.jointData);
    }
  }

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
        // a matrix was passed in so do the math
        m4.multiply(parentWorldMatrix, this.localMatrix, this.worldMatrix);
      } else {
        // no matrix was passed in so just copy local to world
        m4.copy(this.localMatrix, this.worldMatrix);
      }

      // now process all the children
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

  class SkinRenderer {
    constructor(mesh, skin) {
      this.mesh = mesh;
      this.skin = skin;
    }
    render(node, projection, view, sharedUniforms) {
      const {skin, mesh} = this;
      skin.update(node);
      gl.useProgram(skinProgramInfo.program);
      for (const primitive of mesh.primitives) {
        webglUtils.setBuffersAndAttributes(gl, skinProgramInfo, primitive.bufferInfo);
        webglUtils.setUniforms(skinProgramInfo, {
          u_projection: projection,
          u_view: view,
          u_world: node.worldMatrix,
          u_jointTexture: skin.jointTexture,
          u_numJoints: skin.joints.length,
        });
        if (sharedUniforms) {
          webglUtils.setUniforms(skinProgramInfo, sharedUniforms);
        }
        webglUtils.drawBufferInfo(gl, primitive.bufferInfo);
      }
    }
  }

  class MeshRenderer {
    constructor(mesh) {
      this.mesh = mesh;
    }
    render(node, projection, view, sharedUniforms) {
      const {mesh} = this;
      gl.useProgram(meshProgramInfo.program);
      for (const primitive of mesh.primitives) {
        webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, primitive.bufferInfo);
        webglUtils.setUniforms(meshProgramInfo, {
          u_projection: projection,
          u_view: view,
          u_world: node.worldMatrix,
        });
        if (sharedUniforms) {
          webglUtils.setUniforms(meshProgramInfo, sharedUniforms);
        }
        webglUtils.drawBufferInfo(gl, primitive.bufferInfo);
      }
    }
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

  // Given a GL type return the TypedArray needed
  function glTypeToTypedArray(type) {
    return glTypeToTypedArrayMap[type] || throwNoKey(type);
  }

  // given an accessor index return both the accessor and
  // a TypedArray for the correct portion of the buffer
  function getAccessorTypedArrayAndStride(gl, gltf, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    const TypedArray = glTypeToTypedArray(accessor.componentType);
    const buffer = gltf.buffers[bufferView.buffer];
    return {
      accessor,
      array: new TypedArray(
          buffer,
          bufferView.byteOffset + (accessor.byteOffset || 0),
          accessor.count * accessorTypeToNumComponents(accessor.type)),
      stride: bufferView.byteStride || 0,
    };
  }

  // Given an accessor index return a WebGLBuffer and a stride
  function getAccessorAndWebGLBuffer(gl, gltf, accessorIndex) {
    const accessor = gltf.accessors[accessorIndex];
    const bufferView = gltf.bufferViews[accessor.bufferView];
    if (!bufferView.webglBuffer) {
      const buffer = gl.createBuffer();
      const target = bufferView.target || gl.ARRAY_BUFFER;
      const arrayBuffer = gltf.buffers[bufferView.buffer];
      const data = new Uint8Array(arrayBuffer, bufferView.byteOffset, bufferView.byteLength);
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      bufferView.webglBuffer = buffer;
    }
    return {
      accessor,
      buffer: bufferView.webglBuffer,
      stride: bufferView.stride || 0,
    };
  }

  async function loadGLTF(url) {
    const gltf = await loadJSON(url);

    // load all the referenced files relative to the gltf file
    const baseURL = new URL(url, location.href);
    gltf.buffers = await Promise.all(gltf.buffers.map((buffer) => {
      const url = new URL(buffer.uri, baseURL.href);
      return loadBinary(url.href);
    }));

    // setup meshes
    gltf.meshes.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        const attribs = {};
        let numElements;
        for (const [attribName, index] of Object.entries(primitive.attributes)) {
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
          const {accessor, buffer} = getAccessorAndWebGLBuffer(gl, gltf, primitive.indices);
          bufferInfo.numElements = accessor.count;
          bufferInfo.indices = buffer;
          bufferInfo.elementType = accessor.componentType;
        }

        primitive.bufferInfo = bufferInfo;
      });
    });

    const skinNodes = [];
    const origNodes = gltf.nodes;
    gltf.nodes = gltf.nodes.map((n) => {
      const {name, skin, mesh, translation, rotation, scale} = n;
      const trs = new TRS(translation, rotation, scale);
      const node = new Node(trs, name);
      const realMesh = gltf.meshes[mesh];
      if (skin !== undefined) {
        skinNodes.push({node, mesh: realMesh, skinNdx: skin});
      } else if (realMesh) {
        node.drawables.push(new MeshRenderer(realMesh));
      }
      return node;
    });

    // setup skins
    gltf.skins = gltf.skins.map((skin) => {
      const joints = skin.joints.map(ndx => gltf.nodes[ndx]);
      const {array} = getAccessorTypedArrayAndStride(gl, gltf, skin.inverseBindMatrices);
      return new Skin(joints, array);
    });

    // Add SkinRenderers to nodes with skins
    for (const {node, mesh, skinNdx} of skinNodes) {
      node.drawables.push(new SkinRenderer(mesh, gltf.skins[skinNdx]));
    }

    // arrange nodes into graph
    gltf.nodes.forEach((node, ndx) => {
      const children = origNodes[ndx].children;
      if (children) {
        addChildren(gltf.nodes, node, children);
      }
    });

    // setup scenes
    for (const scene of gltf.scenes) {
      // Crear un nodo raíz con una escala mayor para hacer el modelo más visible
      const rootTRS = new TRS([0, 0, 0], [0, 0, 0, 1], [3, 3, 3]); // Escala x3
      scene.root = new Node(rootTRS, scene.name);
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

  const gltf = await loadGLTF('malanimation.gltf');

  // Cargar las texturas pero NO modificar el modelo
  preloadGltfTextures(gl, gltf);

  // Comentar TODAS las funciones que modifican el modelo
  //fixWhiteModelProblem(gl, gltf);
  // analyzeGltfTextures(gltf);
  // try {
  //   modifyShaders();
  //   await loadAndApplySimpleTexture(gl, gltf);
  // } catch (e) {
  //   console.error("Error en solución de emergencia:", e);
  // }

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  const origMatrices = new Map();
  function animSkin(skin, a) {
    for (let i = 0; i < skin.joints.length; ++i) {
      const joint = skin.joints[i];
      // if there is no matrix saved for this joint
      if (!origMatrices.has(joint)) {
        // save a matrix for joint
        origMatrices.set(joint, joint.source.getMatrix());
      }
      // get the original matrix
      const origMatrix = origMatrices.get(joint);
      // rotate it
      const m = m4.xRotate(origMatrix, a);
      // decompose it back into position, rotation, scale
      // into the joint
      m4.decompose(m, joint.source.position, joint.source.rotation, joint.source.scale);
    }
  }

  function render(time) {
    time *= 0.001;  // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    // Deshabilitar temporalmente el culling de caras
    // gl.enable(gl.CULL_FACE);
    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, 0.01, 5000);

    const cameraPosition = [0, 2, 20];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    // Verificar que gltf.skins[0] existe antes de intentar animarlo
    if (gltf.skins && gltf.skins.length > 0) {
      try {
        animSkin(gltf.skins[0], Math.sin(time) * .5);
      } catch (e) {
        console.error("Error al animar skin:", e);
      }
    }

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
    };

    function renderDrawables(node) {
      for (const drawable of node.drawables) {
          drawable.render(node, projection, view, sharedUniforms);
      }
    }

    for (const scene of gltf.scenes) {
      // updatte all world matices in the scene.
      scene.root.updateWorldMatrix();
      // walk the scene and render all renderables
      scene.root.traverse(renderDrawables);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();

// Configurar una función para aplicar un material neutro sin texturas ni colores
function applyNeutralMaterial(gltf) {
  console.log("Aplicando material neutro sin texturas ni colores");
  
  // Recorrer todos los meshes y primitivas
  gltf.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      // Aplicar un material completamente neutro (gris claro)
      primitive.material = {
        uniforms: {
          u_diffuse: [0.8, 0.8, 0.8, 1.0],  // Gris neutro claro
        }
      };
    });
  });
  
  console.log("Material neutro aplicado - sin texturas ni colores");
}

// Reemplaza la función loadAvatarTexture con esta nueva implementación
async function loadAvatarTexture(gl) {
  console.log("Creando textura procedural de prueba...");
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Crear una textura procedural con patrón de ajedrez en colores brillantes
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const posBase = (y * size + x) * 4;
      
      // Crear un patrón de ajedrez de colores muy visibles
      const blockX = Math.floor(x / 16);
      const blockY = Math.floor(y / 16);
      const isEven = (blockX + blockY) % 2 === 0;
      
      if (isEven) {
        // Rojo brillante
        data[posBase] = 255;     // R
        data[posBase + 1] = 50;  // G
        data[posBase + 2] = 50;  // B
        data[posBase + 3] = 255; // A
      } else {
        // Verde brillante
        data[posBase] = 50;      // R
        data[posBase + 1] = 255; // G
        data[posBase + 2] = 50;  // B
        data[posBase + 3] = 255; // A
      }
      
      // Añadir bordes azules para mejor referencia
      if (x % 16 === 0 || y % 16 === 0) {
        data[posBase] = 80;       // R
        data[posBase + 1] = 80;   // G
        data[posBase + 2] = 255;  // B
      }
    }
  }
  
  // Cargar datos de textura procedural
  gl.texImage2D(
    gl.TEXTURE_2D,       // target
    0,                   // mip level
    gl.RGBA,             // internal format
    size,                // width
    size,                // height
    0,                   // border
    gl.RGBA,             // format
    gl.UNSIGNED_BYTE,    // type
    data                 // data
  );
  
  // Configurar parámetros
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  console.log("✅ Textura procedural creada correctamente");
  
  // Solo después de crear la textura procedural, intentamos cargar la textura real
  try {
    await cargarTexturaMedioAvatar(gl, texture);
  } catch (error) {
    console.warn("Se usará la textura procedural de respaldo", error);
  }
  
  return texture;
}

// Función para intentar cargar la textura real
function cargarTexturaMedioAvatar(gl, texture) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    
    image.onload = () => {
      console.log("Textura textura_medio_avatar.png cargada, aplicando...");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      resolve();
    };
    
    image.onerror = () => {
      console.error("No se pudo cargar textura_medio_avatar.png");
      reject(new Error("Error de carga de textura"));
    };
    
    // Intentar rutas alternativas
    image.src = 'textura_medio_avatar.png?v=' + Date.now();
    
    // Si después de 2 segundos no carga, usar alternativa
    setTimeout(() => {
      if (!image.complete) {
        console.log("Intentando ruta alternativa para la textura...");
        image.src = './textura_medio_avatar.png?v=' + Date.now();
      }
    }, 2000);
  });
}

// Modifica la función de aplicación de textura para que sea más directa
function applyAvatarTextureToModel(gltf, texture) {
  console.log("⭐ Aplicando textura procedural al modelo - modo forzado ⭐");
  
  // Modificar los shaders para asegurar que muestren la textura correctamente
  overrideShaderUniforms(gl);
  
  gltf.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      // Aplicar textura a TODAS las primitivas independientemente de UV
      primitive.material = {
        uniforms: {
          u_diffuse: [1, 1, 1, 1],  // Color base blanco
          u_useTexture: 1.0,         // FORZAR uso de textura
          u_texture: texture,
          u_debugMode: 1.0           // Modo especial para depuración
        }
      };
    });
  });
  
  console.log("✅ Textura aplicada al modelo en modo diagnóstico");
}

// Función para sobrescribir el comportamiento del shader si es necesario
function overrideShaderUniforms(gl) {
  // La siguiente función sobrescribe el comportamiento de setUniforms
  // para asegurarse de que u_useTexture siempre sea 1.0
  const originalSetUniforms = webglUtils.setUniforms;
  webglUtils.setUniforms = function(program, uniforms) {
    // Forzar el uso de textura
    if (uniforms && typeof uniforms === 'object') {
      uniforms.u_useTexture = 1.0;
    }
    return originalSetUniforms(program, uniforms);
  };
}

// Función para analizar las propiedades de textura del GLTF
function analyzeGltfTextures(gltf) {
  console.log("📊 Analizando propiedades de textura del modelo GLTF:");
  
  // Verificar si el archivo GLTF tiene texturas definidas
  if (!gltf.textures || gltf.textures.length === 0) {
    console.log("❌ El modelo no tiene texturas definidas en el archivo GLTF");
    return false;
  }
  
  console.log(`✅ El modelo tiene ${gltf.textures.length} textura(s) definida(s)`);
  
  // Analizar cada textura
  gltf.textures.forEach((texture, index) => {
    const source = gltf.images[texture.source];
    const sampler = gltf.samplers ? gltf.samplers[texture.sampler] : null;
    
    console.log(`Textura #${index}:`);
    console.log(`  - Fuente: ${source.uri || "embebida"}`);
    
    if (sampler) {
      console.log(`  - Modos de filtrado: ${getFilterModeName(sampler.magFilter)}, ${getFilterModeName(sampler.minFilter)}`);
      console.log(`  - Modos de wrapping: ${getWrappingModeName(sampler.wrapS)}, ${getWrappingModeName(sampler.wrapT)}`);
    }
    
    // Verificar si hay materiales que usan esta textura
    const materialsUsingTexture = [];
    if (gltf.materials) {
      gltf.materials.forEach((material, matIndex) => {
        if (material.pbrMetallicRoughness) {
          const pbr = material.pbrMetallicRoughness;
          if (pbr.baseColorTexture && pbr.baseColorTexture.index === index) {
            materialsUsingTexture.push({ type: "baseColor", index: matIndex });
          }
          if (pbr.metallicRoughnessTexture && pbr.metallicRoughnessTexture.index === index) {
            materialsUsingTexture.push({ type: "metallicRoughness", index: matIndex });
          }
        }
        if (material.normalTexture && material.normalTexture.index === index) {
          materialsUsingTexture.push({ type: "normal", index: matIndex });
        }
        if (material.occlusionTexture && material.occlusionTexture.index === index) {
          materialsUsingTexture.push({ type: "occlusion", index: matIndex });
        }
        if (material.emissiveTexture && material.emissiveTexture.index === index) {
          materialsUsingTexture.push({ type: "emissive", index: matIndex });
        }
      });
    }
    
    if (materialsUsingTexture.length > 0) {
      console.log(`  - Utilizada por ${materialsUsingTexture.length} material(es)`);
    } else {
      console.log("  - No utilizada por ningún material");
    }
  });
  
  // Verificar UV coordinadas en las primitivas
  let hasUVs = false;
  gltf.meshes.forEach(mesh => {
    mesh.primitives.forEach(primitive => {
      if (primitive.attributes && primitive.attributes.TEXCOORD_0 !== undefined) {
        hasUVs = true;
      }
    });
  });
  
  console.log(`✅ El modelo ${hasUVs ? "tiene" : "no tiene"} coordenadas UV`);
  
  return hasUVs && gltf.textures.length > 0;
}

// Funciones auxiliares para mostrar los nombres de los modos de filtrado y wrapping
function getFilterModeName(mode) {
  const modes = {
    9728: "NEAREST",
    9729: "LINEAR",
    9984: "NEAREST_MIPMAP_NEAREST",
    9985: "LINEAR_MIPMAP_NEAREST",
    9986: "NEAREST_MIPMAP_LINEAR",
    9987: "LINEAR_MIPMAP_LINEAR"
  };
  return modes[mode] || "DEFAULT";
}

function getWrappingModeName(mode) {
  const modes = {
    33071: "CLAMP_TO_EDGE",
    33648: "MIRRORED_REPEAT",
    10497: "REPEAT"
  };
  return modes[mode] || "REPEAT";
}

// Función para cargar y aplicar la textura Cubo.png de manera más robusta
async function loadAndApplyCuboTexture(gl, gltf) {
  console.log("🔄 Cargando textura Cubo.png...");
  
  return new Promise((resolve, reject) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Crear una textura temporal mientras se carga la imagen
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                  new Uint8Array([200, 200, 200, 255]));
    
    const image = new Image();
    image.onload = () => {
      console.log("✅ Textura Cubo.png cargada correctamente", image.width, "x", image.height);
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);  // Importante: invertir la textura verticalmente
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
      // Configurar parámetros según PBR
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      // Generar mipmaps para mejor calidad
      gl.generateMipmap(gl.TEXTURE_2D);
      
      // Aplicar la textura al modelo
      applyPBRTexture(gltf, texture);
      
      resolve(texture);
    };
    
    image.onerror = (e) => {
      console.error("❌ Error al cargar Cubo.png:", e);
      reject(new Error("No se pudo cargar la textura Cubo.png"));
    };
    
    // Intentar varias rutas posibles
    image.src = 'Cubo.png';
    
    // Si no carga en 1 segundo, intentar con otra ruta
    setTimeout(() => {
      if (!image.complete) {
        console.log("Intentando ruta alternativa...");
        image.src = './Cubo.png';
      }
    }, 1000);
  });
}

// Aplicar textura siguiendo principios PBR (physically-based rendering)
function applyPBRTexture(gltf, texture) {
  console.log("🎨 Aplicando textura PBR al modelo...");
  
  let appliedCount = 0;
  
  gltf.meshes.forEach((mesh) => {
    mesh.primitives.forEach((primitive) => {
      if (primitive.attributes && primitive.attributes.TEXCOORD_0 !== undefined) {
        appliedCount++;
        
        // Crear un material compatible con PBR
        primitive.material = {
          uniforms: {
            u_diffuse: [1, 1, 1, 1],  // Color base
            u_useTexture: 1.0,        // Habilitar textura
            u_texture: texture,       // Textura principal
            // Parámetros PBR adicionales
            u_metallic: 0.0,          // No metálico (0.0) a totalmente metálico (1.0)
            u_roughness: 0.5,         // Rugosidad media
            u_normalScale: 1.0,       // Escala normal
            u_emissiveFactor: [0, 0, 0], // Sin emisión
          }
        };
      }
    });
  });
  
  console.log(`✅ Textura aplicada a ${appliedCount} primitivas con coordenadas UV`);
}

// Nueva función ultra simplificada para cargar y aplicar una textura
async function loadAndApplySimpleTexture(gl, gltf) {
  console.log("🚨 SOLUCIÓN DE EMERGENCIA: Aplicando textura con método directo");
  
  // 1. Crear una textura procedural extremadamente visible
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Crear un patrón de tablero de ajedrez con colores brillantes
  const checkerboardData = new Uint8Array([
    255, 0, 0, 255,   0, 255, 0, 255,   255, 0, 0, 255,   0, 255, 0, 255,
    0, 0, 255, 255,   255, 255, 0, 255,   0, 0, 255, 255,   255, 255, 0, 255,
    255, 0, 0, 255,   0, 255, 0, 255,   255, 0, 0, 255,   0, 255, 0, 255,
    0, 0, 255, 255,   255, 255, 0, 255,   0, 0, 255, 255,   255, 255, 0, 255
  ]);
  
  // Cargar el patrón como textura inicial
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, 
    gl.RGBA, gl.UNSIGNED_BYTE, checkerboardData
  );
  
  // Configuración básica de parámetros
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  // 2. Intentar cargar cubo.png después
  const image = new Image();
  image.onload = () => {
    console.log("✅ Cubo.png cargado con éxito:", image.width, "x", image.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // No invertir verticalmente para probar primero
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  
  image.onerror = (e) => {
    console.warn("⚠️ No se pudo cargar cubo.png, usando textura procedural");
  };
  
  // Probar con cubo.png en minúscula
  image.src = 'cubo.png';
  
  // 3. MODIFICACIÓN CRÍTICA: Reemplazar la función de renderizado
  // para forzar el uso de la textura en cada frame
  const originalRenderDrawables = gltf.scenes[0].root.traverse;
  
  gltf.scenes[0].root.traverse = function(fn) {
    // Forzar la aplicación de textura en cada frame
    gltf.meshes.forEach(mesh => {
      mesh.primitives.forEach(primitive => {
        if (!primitive.material) {
          primitive.material = {};
        }
        if (!primitive.material.uniforms) {
          primitive.material.uniforms = {};
        }
        
        // Forzar estas propiedades en cada frame
        primitive.material.uniforms.u_diffuse = [1, 1, 1, 1];
        primitive.material.uniforms.u_useTexture = 1.0;
        primitive.material.uniforms.u_texture = texture;
      });
    });
    
    // Llamar a la función original
    originalRenderDrawables.call(this, fn);
  };
  
  // 4. Aplicar también la textura de forma inmediata
  console.log("Aplicando textura a todas las primitivas");
  gltf.meshes.forEach(mesh => {
    mesh.primitives.forEach(primitive => {
      primitive.material = {
        uniforms: {
          u_diffuse: [1, 1, 1, 1],
          u_useTexture: 1.0,
          u_texture: texture
        }
      };
    });
  });
  
  return texture;
}

// 5. Diagnosticar y modificar los shaders
function modifyShaders() {
  // No podemos modificar los shaders directamente, pero podemos
  // intentar sobreescribir las funciones de WebGL
  
  // Capturar llamadas a useProgram para diagnosticar
  const originalUseProgram = WebGLRenderingContext.prototype.useProgram;
  WebGLRenderingContext.prototype.useProgram = function(program) {
    console.log("🔍 Usando programa shader:", program);
    return originalUseProgram.call(this, program);
  };
  
  // Capturar llamadas a uniform1i/uniform1f para diagnosticar textura
  const originalUniform1i = WebGLRenderingContext.prototype.uniform1i;
  WebGLRenderingContext.prototype.uniform1i = function(location, value) {
    console.log("🔍 uniform1i:", location, value);
    return originalUniform1i.call(this, location, value);
  };
  
  const originalUniform1f = WebGLRenderingContext.prototype.uniform1f;
  WebGLRenderingContext.prototype.uniform1f = function(location, value) {
    console.log("🔍 uniform1f:", location, value);
    return originalUniform1f.call(this, location, value);
  };
}

// Reemplaza la función fixWhiteModelProblem con esta versión corregida que no usa MeshRenderer directamente
function fixWhiteModelProblem(gl, gltf) {
  console.log("🔥 APLICANDO SOLUCIÓN RADICAL 🔥");

  // 1. Primero confirmar que podemos aplicar colores sólidos
  // Aplicar colores brillantes diferentes a cada primitiva para identificar el problema
  let primitiveIndex = 0;
  const colors = [
    [1.0, 0.0, 0.0, 1.0], // Rojo
    [0.0, 1.0, 0.0, 1.0], // Verde
    [0.0, 0.0, 1.0, 1.0], // Azul
    [1.0, 1.0, 0.0, 1.0], // Amarillo
    [1.0, 0.0, 1.0, 1.0], // Magenta
    [0.0, 1.0, 1.0, 1.0]  // Cian
  ];

  // Aplicar colores brillantes a cada malla
  gltf.meshes.forEach((mesh, meshIndex) => {
    mesh.primitives.forEach((primitive, primIndex) => {
      const color = colors[(meshIndex + primIndex) % colors.length];
      primitive.material = {
        uniforms: {
          u_diffuse: color,
          u_useTexture: 0.0 // Desactivar texturas inicialmente para probar con colores
        }
      };
      primitiveIndex++;
    });
  });
  
  console.log(`Aplicados ${primitiveIndex} colores distintos a las primitivas`);
  
  // 3. Programar una actualización posterior para intentar aplicar texturas
  // después de confirmar que los colores sólidos funcionan
  setTimeout(() => {
    console.log("Intentando aplicar textura después de colores sólidos...");
    
    // Crear una textura muy simple con un patrón evidente
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Crear un patrón simple de 2x2 píxeles
    const pixels = new Uint8Array([
      255, 0, 0, 255,    0, 255, 0, 255,
      0, 0, 255, 255,    255, 255, 0, 255
    ]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // Configuración básica de textura
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    // Aplicar la textura a todas las primitivas
    gltf.meshes.forEach(mesh => {
      mesh.primitives.forEach(primitive => {
        if (primitive.attributes && primitive.attributes.TEXCOORD_0 !== undefined) {
          primitive.material = {
            uniforms: {
              u_diffuse: [1, 1, 1, 1],
              u_useTexture: 1.0,
              u_texture: texture
            }
          };
        }
      });
    });
  }, 5000); // Esperar 5 segundos para ver primero los colores sólidos
  
  return gltf;
}

// Nueva función para extraer y aplicar texturas internas
function extractAndApplyInternalTextures(gl, gltf) {
  console.log("🔍 Extrayendo y aplicando texturas internas del GLTF");
  
  if (!gltf.textures || !gltf.textures.length) {
    console.log("❗ El modelo no tiene texturas definidas en el GLTF");
    return;
  }
  
  console.log(`✅ Encontradas ${gltf.textures.length} textura(s) en el archivo GLTF`);
  
  // Recorrer todas las texturas del GLTF
  gltf.textures.forEach((gltfTexture, index) => {
    try {
      // Obtener la imagen y el sampler asociados
      const gltfImage = gltf.images[gltfTexture.source];
      const gltfSampler = gltf.samplers && gltfTexture.sampler !== undefined 
                          ? gltf.samplers[gltfTexture.sampler] 
                          : null;
      
      // Crear textura WebGL
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Textura temporal mientras se carga
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                  new Uint8Array([255, 0, 255, 255])); // Magenta temporal
      
      // Establecer parámetros de textura
      const wrapS = gltfSampler?.wrapS || gl.REPEAT;
      const wrapT = gltfSampler?.wrapT || gl.REPEAT;
      const minFilter = gltfSampler?.minFilter || gl.LINEAR;
      const magFilter = gltfSampler?.magFilter || gl.LINEAR;
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
      
      // Si la imagen es una URI, cargarla
      if (gltfImage.uri) {
        const isDataURI = gltfImage.uri.startsWith('data:');
        const imageUrl = isDataURI ? gltfImage.uri : new URL(gltfImage.uri, location.href).href;
        
        console.log(`📂 Cargando textura desde ${isDataURI ? 'datos incrustados' : imageUrl}`);
        
        const image = new Image();
        image.onload = () => {
          console.log(`✅ Textura #${index} cargada: ${image.width}x${image.height}`);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          
          if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
          }
          
          // Aplicar textura a todos los materiales que la utilizan
          applyGltfTextureToMaterials(gltf, texture, index);
        };
        
        image.onerror = (err) => {
          console.error(`❌ Error al cargar textura #${index}:`, err);
        };
        
        image.src = imageUrl;
      } 
      // Si la imagen está en un buffer, usar los datos binarios
      else if (gltfImage.bufferView !== undefined) {
        console.log(`📊 Cargando textura #${index} desde bufferView ${gltfImage.bufferView}`);
        
        const bufferView = gltf.bufferViews[gltfImage.bufferView];
        const arrayBuffer = gltf.buffers[bufferView.buffer];
        const byteOffset = bufferView.byteOffset || 0;
        const imageData = new Uint8Array(arrayBuffer, byteOffset, bufferView.byteLength);
        
        // Crear un blob y URL para la imagen
        const blob = new Blob([imageData], {type: gltfImage.mimeType});
        const imageUrl = URL.createObjectURL(blob);
        
        const image = new Image();
        image.onload = () => {
          console.log(`✅ Textura #${index} cargada desde buffer: ${image.width}x${image.height}`);
          
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          
          if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
          }
          
          URL.revokeObjectURL(imageUrl);
          
          // Aplicar textura a todos los materiales que la utilizan
          applyGltfTextureToMaterials(gltf, texture, index);
        };
        
        image.onerror = (err) => {
          console.error(`❌ Error al cargar textura #${index} desde buffer:`, err);
          URL.revokeObjectURL(imageUrl);
        };
        
        image.src = imageUrl;
      }
      
      // Guardar la textura WebGL en el objeto glTF para referencias futuras
      if (!gltf._textures) gltf._textures = [];
      gltf._textures[index] = texture;
      
    } catch (error) {
      console.error(`❌ Error procesando textura #${index}:`, error);
    }
  });
}

// Función auxiliar para aplicar texturas a materiales
function applyGltfTextureToMaterials(gltf, texture, textureIndex) {
  console.log(`Aplicando textura #${textureIndex} a materiales`);
  
  // Buscar los materiales que utilizan esta textura
  const materialsWithTexture = [];
  let appliedCount = 0;
  
  // Para cada material, verificar si usa esta textura
  if (gltf.materials) {
    gltf.materials.forEach((material, matIndex) => {
      let usesTexture = false;
      
      // Verificar diferentes tipos de texturas en el material
      if (material.pbrMetallicRoughness) {
        const pbr = material.pbrMetallicRoughness;
        if (pbr.baseColorTexture && pbr.baseColorTexture.index === textureIndex) {
          usesTexture = true;
          materialsWithTexture.push(matIndex);
        }
      }
      
      if (material.normalTexture && material.normalTexture.index === textureIndex) {
        usesTexture = true;
        materialsWithTexture.push(matIndex);
      }
      
      // ... verificar otros tipos de texturas si es necesario
    });
  }
  
  // Si ningún material usa esta textura, aplicarla a todas las primitivas con coordenadas UV
  if (materialsWithTexture.length === 0) {
    console.log("⚠️ No se encontraron materiales que usen esta textura, aplicando a todas las primitivas con UV");
    
    gltf.meshes.forEach(mesh => {
      mesh.primitives.forEach(primitive => {
        if (primitive.attributes && primitive.attributes.TEXCOORD_0 !== undefined) {
          primitive.material = {
            uniforms: {
              u_diffuse: [1, 1, 1, 1],
              u_useTexture: 1.0,
              u_texture: texture
            }
          };
          appliedCount++;
        }
      });
    });
  } 
  // Si hay materiales que usan esta textura, aplicarla solo a las primitivas con esos materiales
  else {
    console.log(`✅ Encontrados ${materialsWithTexture.length} materiales que usan esta textura`);
    
    gltf.meshes.forEach(mesh => {
      mesh.primitives.forEach(primitive => {
        if (materialsWithTexture.includes(primitive.material)) {
          primitive.material = {
            uniforms: {
              u_diffuse: [1, 1, 1, 1],
              u_useTexture: 1.0,
              u_texture: texture
            }
          };
          appliedCount++;
        }
      });
    });
  }
  
  console.log(`✅ Textura aplicada a ${appliedCount} primitivas`);
}

// Función auxiliar para verificar si un número es potencia de 2
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

// Nueva función simplificada que solo aplica la textura sin modificar el modelo
function applyGltfInternalTexture(gl, gltf) {
  console.log("🔄 Aplicando textura interna del GLTF sin modificar el modelo");
  
  // Verificar si el modelo tiene texturas
  if (!gltf.textures || !gltf.textures.length) {
    console.log("⚠️ El modelo no tiene texturas definidas");
    return;
  }
  
  console.log(`📂 El modelo tiene ${gltf.textures.length} textura(s) definida(s)`);
  
  // Usar solo la primera textura para simplificar
  const textureInfo = gltf.textures[0];
  const imageInfo = gltf.images[textureInfo.source];
  
  // Crear una textura WebGL
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Textura temporal mientras se carga
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
              new Uint8Array([200, 200, 200, 255]));
  
  // Aplicar parámetros básicos de textura
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  // Cargar la imagen si hay una URI
  if (imageInfo.uri) {
    const isDataURI = imageInfo.uri.startsWith('data:');
    const imageUrl = isDataURI ? imageInfo.uri : new URL(imageInfo.uri, location.href).href;
    
    console.log(`📄 Cargando textura desde: ${isDataURI ? 'data URI' : imageUrl}`);
    
    const image = new Image();
    image.onload = () => {
      console.log(`✅ Textura cargada: ${image.width}x${image.height}`);
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
      // Generar mipmaps si las dimensiones son potencias de 2
      if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      
      // Aplicar la textura a las primitivas que tengan coordenadas UV
      // SIN MODIFICAR NADA MÁS DEL MODELO
      gltf.meshes.forEach(mesh => {
        mesh.primitives.forEach(primitive => {
          // Solo modificar el material si la primitiva tiene coordenadas de textura
          if (primitive.attributes && primitive.attributes.TEXCOORD_0 !== undefined) {
            // Si ya existe un material, preservarlo y solo añadir la textura
            if (!primitive.material) {
              primitive.material = {};
            }
            
            if (!primitive.material.uniforms) {
              primitive.material.uniforms = {};
            }
            
            // Mantener cualquier color difuso existente, o usar blanco si no hay
            if (!primitive.material.uniforms.u_diffuse) {
              primitive.material.uniforms.u_diffuse = [1, 1, 1, 1];
            }
            
            // Añadir la textura
            primitive.material.uniforms.u_useTexture = 1.0;
            primitive.material.uniforms.u_texture = texture;
          }
        });
      });
    };
    
    image.onerror = err => {
      console.error("❌ Error al cargar la textura:", err);
    };
    
    image.src = imageUrl;
  }
}

// Nueva función para aplicar los materiales originales del GLTF
async function applyOriginalGltfMaterials(gl, gltf) {
  console.log("📚 Aplicando materiales originales del GLTF");
  
  // Verificar si hay materiales definidos
  if (!gltf.materials || !gltf.materials.length) {
    console.log("⚠️ El modelo no tiene materiales definidos en el GLTF");
    return;
  }
  
  console.log(`✅ Encontrados ${gltf.materials.length} materiales en el GLTF`);

  // 1. Primero cargar todas las texturas referenciadas
  const texturePromises = [];
  
  if (gltf.textures && gltf.textures.length) {
    console.log(`📂 Cargando ${gltf.textures.length} texturas...`);
    
    gltf.textures.forEach((textureInfo, index) => {
      texturePromises.push(loadGltfTexture(gl, gltf, index));
    });
  }
  
  // Esperar a que todas las texturas se carguen
  const loadedTextures = await Promise.all(texturePromises);
  console.log(`✅ ${loadedTextures.length} texturas cargadas correctamente`);
  
  // 2. Vincular los materiales originales con las primitivas
  let appliedCount = 0;
  
  gltf.meshes.forEach(mesh => {
    mesh.primitives.forEach(primitive => {
      // Verificar si la primitiva tiene asignado un material en el GLTF
      if (primitive.material !== undefined) {
        const gltfMaterial = gltf.materials[primitive.material];
        
        if (gltfMaterial) {
          // Convertir el material GLTF al formato que nuestro renderer entiende
          const material = convertGltfMaterial(gl, gltf, gltfMaterial, loadedTextures);
          
          // Asignar el material convertido a la primitiva
          primitive.material = material;
          appliedCount++;
        }
      }
    });
  });
  
  console.log(`✅ Materiales originales aplicados a ${appliedCount} primitivas`);
}

// Función para cargar una textura del GLTF
function loadGltfTexture(gl, gltf, textureIndex) {
  return new Promise((resolve, reject) => {
    const textureInfo = gltf.textures[textureIndex];
    const imageInfo = gltf.images[textureInfo.source];
    const samplerInfo = gltf.samplers ? gltf.samplers[textureInfo.sampler] : null;
    
    // Crear una textura WebGL
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Textura temporal mientras se carga
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                new Uint8Array([200, 200, 200, 255]));
    
    // Configurar parámetros de la textura
    const wrapS = samplerInfo?.wrapS || gl.REPEAT;
    const wrapT = samplerInfo?.wrapT || gl.REPEAT;
    const minFilter = samplerInfo?.minFilter || gl.LINEAR;
    const magFilter = samplerInfo?.magFilter || gl.LINEAR;
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    
    // Cargar la imagen si hay una URI
    if (imageInfo.uri) {
      const isDataURI = imageInfo.uri.startsWith('data:');
      const imageUrl = isDataURI ? imageInfo.uri : new URL(imageInfo.uri, location.href).href;
      
      console.log(`📄 Cargando textura #${textureIndex} desde: ${isDataURI ? 'data URI' : imageUrl}`);
      
      const image = new Image();
      image.onload = () => {
        console.log(`✅ Textura #${textureIndex} cargada: ${image.width}x${image.height}`);
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Generar mipmaps si las dimensiones son potencias de 2
        if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
          gl.generateMipmap(gl.TEXTURE_2D);
        }
        
        resolve(texture);
      };
      
      image.onerror = err => {
        console.error(`❌ Error al cargar la textura #${textureIndex}:`, err);
        resolve(texture); // Resolver con la textura temporal
      };
      
      image.src = imageUrl;
    } else if (imageInfo.bufferView !== undefined) {
      // Manejar texturas almacenadas en buffers
      console.log(`📊 Cargando textura #${textureIndex} desde bufferView ${imageInfo.bufferView}`);
      
      const bufferView = gltf.bufferViews[imageInfo.bufferView];
      const buffer = gltf.buffers[bufferView.buffer];
      const byteOffset = bufferView.byteOffset || 0;
      const imageData = new Uint8Array(buffer, byteOffset, bufferView.byteLength);
      
      // Crear un blob y URL para la imagen
      const blob = new Blob([imageData], {type: imageInfo.mimeType || 'image/jpeg'});
      const imageUrl = URL.createObjectURL(blob);
      
      const image = new Image();
      image.onload = () => {
        console.log(`✅ Textura #${textureIndex} cargada desde buffer: ${image.width}x${image.height}`);
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
          gl.generateMipmap(gl.TEXTURE_2D);
        }
        
        URL.revokeObjectURL(imageUrl);
        resolve(texture);
      };
      
      image.onerror = err => {
        console.error(`❌ Error al cargar la textura #${textureIndex} desde buffer:`, err);
        URL.revokeObjectURL(imageUrl);
        resolve(texture); // Resolver con la textura temporal
      };
      
      image.src = imageUrl;
    } else {
      console.warn(`⚠️ No se encontró fuente para la textura #${textureIndex}`);
      resolve(texture); // Resolver con la textura temporal
    }
  });
}

// Función para convertir un material GLTF a nuestro formato de material
function convertGltfMaterial(gl, gltf, gltfMaterial, loadedTextures) {
  const material = {
    uniforms: {
      // Valores por defecto
      u_diffuse: [1, 1, 1, 1],
      u_useTexture: 0.0
    }
  };
  
  // Procesar material PBR si está definido
  if (gltfMaterial.pbrMetallicRoughness) {
    const pbr = gltfMaterial.pbrMetallicRoughness;
    
    // Aplicar color base
    if (pbr.baseColorFactor) {
      material.uniforms.u_diffuse = pbr.baseColorFactor;
    }
    
    // Aplicar textura de color base
    if (pbr.baseColorTexture) {
      const textureIndex = pbr.baseColorTexture.index;
      if (loadedTextures[textureIndex]) {
        material.uniforms.u_texture = loadedTextures[textureIndex];
        material.uniforms.u_useTexture = 1.0;
        console.log(`✓ Material usando textura #${textureIndex} para color base`);
      }
    }
    
    // Añadir propiedades metálicas/rugosidad si nuestro shader las soporta
    if (pbr.metallicFactor !== undefined) {
      material.uniforms.u_metallic = pbr.metallicFactor;
    }
    
    if (pbr.roughnessFactor !== undefined) {
      material.uniforms.u_roughness = pbr.roughnessFactor;
    }
  }
  
  // Aplicar otras propiedades de material según lo que necesite nuestro shader
  if (gltfMaterial.normalTexture && loadedTextures[gltfMaterial.normalTexture.index]) {
    material.uniforms.u_normalMap = loadedTextures[gltfMaterial.normalTexture.index];
    material.uniforms.u_useNormalMap = 1.0;
  }
  
  if (gltfMaterial.emissiveFactor) {
    material.uniforms.u_emissive = gltfMaterial.emissiveFactor;
  }
  
  if (gltfMaterial.emissiveTexture && loadedTextures[gltfMaterial.emissiveTexture.index]) {
    material.uniforms.u_emissiveMap = loadedTextures[gltfMaterial.emissiveTexture.index];
    material.uniforms.u_useEmissiveMap = 1.0;
  }
  
  // Manejo de transparencia/opacidad
  if (gltfMaterial.alphaMode === 'BLEND') {
    material.uniforms.u_alphaMode = 1.0; // Modo de mezcla
    material.transparent = true;
  } else if (gltfMaterial.alphaMode === 'MASK') {
    material.uniforms.u_alphaMode = 2.0; // Modo de máscara
    material.uniforms.u_alphaCutoff = gltfMaterial.alphaCutoff || 0.5;
  }
  
  return material;
}

// Función para precargar texturas sin modificar el modelo
function preloadGltfTextures(gl, gltf) {
  console.log("🔄 Precargando texturas del GLTF sin modificar el modelo");
  
  // Crear un almacén para las texturas cargadas
  if (!gltf._loadedTextures) {
    gltf._loadedTextures = {};
  }
  
  // Solo cargar las texturas, sin modificar ninguna estructura
  if (gltf.textures && gltf.textures.length) {
    console.log(`📂 El modelo tiene ${gltf.textures.length} textura(s)`);
    
    gltf.textures.forEach((textureInfo, index) => {
      const imageInfo = gltf.images[textureInfo.source];
      const samplerInfo = gltf.samplers && textureInfo.sampler !== undefined ? 
                         gltf.samplers[textureInfo.sampler] : null;
      
      // Crear la textura WebGL
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Textura temporal mientras se carga
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                  new Uint8Array([200, 200, 200, 255]));
      
      // Configurar parámetros básicos
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      // Almacenar la referencia a la textura
      gltf._loadedTextures[index] = texture;
      
      // Cargar la imagen si hay una URI
      if (imageInfo.uri) {
        const imageUrl = new URL(imageInfo.uri, location.href).href;
        console.log(`📄 Cargando textura #${index} desde: ${imageUrl}`);
        
        const image = new Image();
        image.onload = () => {
          console.log(`✅ Textura #${index} cargada: ${image.width}x${image.height}`);
          
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          
          if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
            gl.generateMipmap(gl.TEXTURE_2D);
          }
        };
        
        image.onerror = err => {
          console.error(`❌ Error al cargar la textura #${index}:`, err);
        };
        
        image.src = imageUrl;
      }
    });
  }
}