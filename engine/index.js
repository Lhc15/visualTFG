// WebGL - Skinning glTF
// from http://localhost:8082/webgl/webgl-skinning-3d-gltf-skinned.html

"use strict";

export async function main() {
  console.log('Ejecutando el motor desde engine!!!')
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
  let gltf;
  try {
    gltf = await loadGLTF('malanimation.gltf'); //const
    console.log("GLTF cargado exitosamente:", gltf);
    console.log("Animacion:", gltf.animations);
    console.log("Primer clip de animación:", gltf.animations[0]);
    // gltf.animations[0].samplers.forEach((sampler, i) => {
    //   console.log(`Sampler ${i} input:`, sampler.input);
    //   console.log(`Sampler ${i} output:`, sampler.output);
    // });
    
    if(gltf.animations && gltf.animations.length > 0) {
      console.log("Primer canal del primer frame:", gltf.animations[0].channels[0]);
    }
  } catch (error) {
      console.error("Error al cargar el GLTF:", error);
  }
  // const gltf = await loadGLTF('https://webglfundamentals.org/webgl/resources/models/killer_whale/whale.CYCLES.gltf');
  //console.log("GLTF cargado:", gltf);
  //const gltf = await loadGLTF('malanimation.gltf');
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
  function render(time) {
    time *= 0.001;  // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(.1, .1, .1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    const cameraPosition = [0, 0, 8];
    const target = [0, 0, 0];
    // for debugging .. see article
    // const cameraPosition = [5, 0, 5];
    // const target = [0, 0, 0];
    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    animSkin(gltf.skins[0], Math.sin(time) * .5);
    //animateGesture(time);

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
