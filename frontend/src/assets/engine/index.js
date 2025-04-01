// WebGL - Skinning glTF
// from http://localhost:8082/webgl/webgl-skinning-3d-gltf-skinned.html

"use strict";

export async function main() {
  console.log('Pepe')
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

    const gl = canvas.getContext("webgl", { 
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
    const skinProgramInfo = window.webglUtils.createProgramInfo(gl, [skinVS, fs]);
    const meshProgramInfo = window.webglUtils.createProgramInfo(gl, [meshVS, fs]);

    if (!skinProgramInfo || !meshProgramInfo) {
      throw new Error("Error al crear los programas de shaders");
    }

    // Verificar que los programas se crearon correctamente
    if (!skinProgramInfo.program || !meshProgramInfo.program) {
      throw new Error("Los programas de shader no se crearon correctamente");
    }

    // Añadir manejador de redimensionamiento
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    });

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
          webglUtils.setUniforms(skinProgramInfo, primitive.material.uniforms|| {}); // anyadir || {});
          webglUtils.setUniforms(skinProgramInfo, sharedUniforms|| {});// anyadir || {});
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
          webglUtils.setUniforms(meshProgramInfo, primitive.material.uniforms);
          webglUtils.setUniforms(meshProgramInfo, sharedUniforms);
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

      const defaultMaterial = {
        uniforms: {
          u_diffuse: [.5, .8, 1, 1],
        },
      };

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

          // save the material info for this primitive
          primitive.material = gltf.materials && gltf.materials[primitive.material] || defaultMaterial;
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
        scene.root = new Node(new TRS(), scene.name);
        addChildren(gltf.nodes, scene.root, scene.nodes);
      }
      //mostrar huesos
      console.log("Escenas:", gltf.scenes);
      console.log("Nodos:", gltf.nodes);
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

    // Configurar la cámara inicial
    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    // Posicionar la cámara para ver mejor el modelo
    const cameraPosition = [0, 2, 5];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const camera = m4.lookAt(cameraPosition, target, up);
    const view = m4.inverse(camera);

    // Cargar y renderizar el modelo GLTF
    const gltf = await loadGLTF('/assets/malanimation.gltf');
    console.log("GLTF cargado exitosamente:", gltf);
    
    if (!gltf || !gltf.scenes || gltf.scenes.length === 0) {
      console.error("No se encontraron escenas en el modelo GLTF");
      return;
    }

    // Función de renderizado
    function render(time) {
      time *= 0.001;  // convertir a segundos

      // Actualizar tamaño del canvas si es necesario
      webglUtils.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      const sharedUniforms = {
        u_lightDirection: m4.normalize([-1, 3, 5]),
      };

      // Renderizar todas las escenas
      for (const scene of gltf.scenes) {
        scene.root.updateWorldMatrix();
        scene.root.traverse((node) => {
          for (const drawable of node.drawables) {
            drawable.render(node, projection, view, sharedUniforms);
          }
        });
      }

      requestAnimationFrame(render);
    }

    // Iniciar el bucle de renderizado
    requestAnimationFrame(render);

  } catch (error) {
    console.error("Error al cargar o renderizar el GLTF:", error);
  }
}

main();

function degToRad(deg) {
  return deg * Math.PI / 180;
}
