// engine/skinEngine.js
// ---------------------------------------------------------------------------
//  IMPORTS
// ---------------------------------------------------------------------------

import * as m4  from 'engine/lib/m4.js';
import * as wu  from 'engine/lib/webgl-utils.js';
// ---------------------------------------------------------------------------
//  SHADERS  (★ Pega aquí tu código “real” si quieres modificarlo)            *
// ---------------------------------------------------------------------------
const skinVS = `precision mediump float;
attribute vec4 a_POSITION;
attribute vec3 a_NORMAL;
attribute vec4 a_WEIGHTS_0;
attribute vec4 a_JOINTS_0;
attribute vec2 a_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform sampler2D u_jointTexture;
uniform float u_numJoints;

varying vec3 v_normal;
varying vec2 v_texcoord;

#define ROW0_U ((0.5 + 0.0) / 4.)
#define ROW1_U ((0.5 + 1.0) / 4.)
#define ROW2_U ((0.5 + 2.0) / 4.)
#define ROW3_U ((0.5 + 3.0) / 4.)

mat4 getBoneMatrix(float jointNdx){
  float v = (jointNdx + .5) / u_numJoints;
  return mat4(
    texture2D(u_jointTexture, vec2(ROW0_U, v)),
    texture2D(u_jointTexture, vec2(ROW1_U, v)),
    texture2D(u_jointTexture, vec2(ROW2_U, v)),
    texture2D(u_jointTexture, vec2(ROW3_U, v))
  );
}
void main(){
  mat4 skin =
      getBoneMatrix(a_JOINTS_0[0]) * a_WEIGHTS_0[0] +
      getBoneMatrix(a_JOINTS_0[1]) * a_WEIGHTS_0[1] +
      getBoneMatrix(a_JOINTS_0[2]) * a_WEIGHTS_0[2] +
      getBoneMatrix(a_JOINTS_0[3]) * a_WEIGHTS_0[3];
  mat4 world = u_world * skin;
  gl_Position = u_projection * u_view * world * a_POSITION;
  v_normal   = mat3(world) * a_NORMAL;
  v_texcoord = a_texcoord;
}`;  // <— backtick de cierre

const meshVS = `precision mediump float;
attribute vec4 a_POSITION;
attribute vec3 a_NORMAL;
attribute vec2 a_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

varying vec3 v_normal;
varying vec2 v_texcoord;
void main(){
  gl_Position = u_projection * u_view * u_world * a_POSITION;
  v_normal   = mat3(u_world) * a_NORMAL;
  v_texcoord = a_texcoord;
}`;  // <— backtick de cierre

const fs = `precision mediump float;
varying vec3 v_normal;
varying vec2 v_texcoord;

uniform vec4 u_diffuse;
uniform sampler2D u_baseColorTexture;
uniform bool u_hasBaseColorTexture;
uniform vec3 u_lightDirection;

void main(){
  vec4 base = u_hasBaseColorTexture
              ? texture2D(u_baseColorTexture, v_texcoord)
              : u_diffuse;
  vec3 n = normalize(v_normal);
  float light = dot(u_lightDirection, n) * .5 + .5;
  gl_FragColor = vec4(base.rgb * light, base.a);
}`;

// ---------------------------------------------------------------------------
//  FUNCIÓN PÚBLICA
// ---------------------------------------------------------------------------
/**
 * Arranca el engine en el canvas indicado y carga el glTF que se pase.
 * Devuelve una función () => void para detener el render-loop.
 */
export async function startSkinEngine(
  canvas,
  gltfUrl = 'assets/malanimation.gltf',
  getThreeCameras
){
  
  // -------------------------------------------------------------------------
  //  CONTEXTO WEBGL
  // -------------------------------------------------------------------------
  const gl = canvas.getContext('webgl', { alpha: true });
  if (!gl) throw new Error('WebGL no disponible');
  if (!gl.getExtension('OES_texture_float'))
    throw new Error('Extensión OES_texture_float no soportada');

  // Compila los programas
    const skinPI = wu.createProgramInfo(gl, [skinVS, fs]);
    const meshPI = wu.createProgramInfo(gl, [meshVS, fs]);

  // -------------------------------------------------------------------------
  //  CLASES AUXILIARES
  // -------------------------------------------------------------------------
  class Skin {
    constructor(joints, invBindData){
      this.joints = joints;
      this.invBind = [];
      this.jointMatrices = [];
      this.texData = new Float32Array(joints.length * 16);

      for (let i=0;i<joints.length;++i){
        this.invBind.push(new Float32Array(
          invBindData.buffer,
          invBindData.byteOffset + 16*4*i,
          16));
        this.jointMatrices.push(new Float32Array(
          this.texData.buffer, 16*4*i, 16));
      }
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    update(node){
      const invScene = m4.inverse(node.world);

      for (let j = 0; j < this.joints.length; ++j) {
      const dst = this.jointMatrices[j];
      // y aquí también usar .world
      m4.multiply(invScene, this.joints[j].world, dst);
      m4.multiply(dst, this.invBind[j], dst);
    }
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        4, this.joints.length, 0,
        gl.RGBA, gl.FLOAT,
        this.texData
      );
    }
  }

  class TRS {
    constructor(p=[0,0,0],r=[0,0,0,1],s=[1,1,1]){
      this.position=p; this.rotation=r; this.scale=s;
    }
    getMatrix(out=m4.identity()){
      m4.compose(this.position,this.rotation,this.scale,out); return out;
    }
  }

  class Node {
    constructor(src,name){
      this.name=name; this.source=src;
      this.parent=null; this.children=[];
      this.local=m4.identity(); this.world=m4.identity();
      this.drawables=[];
    }
    setParent(p){
      if(this.parent) this.parent.children =
        this.parent.children.filter(c=>c!==this);
      this.parent=p;
      if(p) p.children.push(this);
    }
    updateWorldMatrix(parentWorld){
      if(this.source) this.source.getMatrix(this.local);
      this.world = parentWorld ? m4.multiply(parentWorld,this.local)
                               : m4.copy(this.local);
      this.children.forEach(c=>c.updateWorldMatrix(this.world));
    }
    traverse(fn){ fn(this); this.children.forEach(c=>c.traverse(fn)); }
  }

  class SkinRenderer{
    constructor(mesh,skin){this.mesh=mesh;this.skin=skin;}
    render(node,proj,view,shared){
      const {mesh,skin}=this;
      skin.update(node);
      gl.useProgram(skinPI.program);
      mesh.primitives.forEach(p=>{
        wu.setBuffersAndAttributes(gl,skinPI,p.bufferInfo);
        wu.setUniforms(skinPI,{
          u_projection:proj,
          u_view:view,
          u_world:node.world,
          u_numJoints:skin.joints.length,
          u_hasBaseColorTexture:[p.material.baseColorTexture?1:0],
          u_diffuse:p.material.baseColorFactor,
          ...shared,
        });
        // samplers
        gl.uniform1i(gl.getUniformLocation(skinPI.program,'u_jointTexture'),0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,skin.texture);
        if(p.material.baseColorTexture){
          gl.uniform1i(gl.getUniformLocation(skinPI.program,'u_baseColorTexture'),1);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D,p.material.baseColorTexture);
        }
        wu.drawBufferInfo(gl,p.bufferInfo);
      });
    }
  }

  class MeshRenderer{
    constructor(mesh){this.mesh=mesh;}
    render(node,proj,view,shared){
      gl.useProgram(meshPI.program);
      this.mesh.primitives.forEach(p=>{
        wu.setBuffersAndAttributes(gl,meshPI,p.bufferInfo);
        wu.setUniforms(meshPI,{
          u_projection:proj,u_view:view,u_world:node.world,
          u_hasBaseColorTexture:[p.material.baseColorTexture?1:0],
          u_diffuse:p.material.baseColorFactor,
          ...shared,
        });
        if(p.material.baseColorTexture){
          gl.uniform1i(gl.getUniformLocation(meshPI.program,'u_baseColorTexture'),0);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D,p.material.baseColorTexture);
        }
        wu.drawBufferInfo(gl,p.bufferInfo);
      });
    }
  }


  class Animator {
    constructor(clips) {
      this.clips = clips;
      this.current = null;      // active clip
      this.time = 0;
      this.loop = false;
      this.playing = false;
      this.lastUpdateTime = 0;  // For consistent frame timing
    }

    play(name, loop = false) {
      // Find the requested clip by name, or use the first one if not found
      this.current = this.clips.find(c => c.name === name);
      
      if (!this.current && this.clips.length > 0) {
        console.warn(`Clip "${name}" not found, using first available clip instead.`);
        this.current = this.clips[0];
      }
      
      if (!this.current) {
        console.error("No animation clips available to play");
        return;
      }
      
      console.log(`Playing clip: ${this.current.name}, duration: ${this.current.duration}s, loop: ${loop}`);
      
      this.time = 0;
      this.loop = loop;
      this.playing = true;
      this.lastUpdateTime = performance.now() * 0.001; // Convert to seconds
    }

    stop() {
      this.playing = false;
      this.time = 0;
    }

    update(dt) {
      if (!this.playing || !this.current) return;
      
      // If dt is very large (e.g. after tab switching), cap it to avoid jumps
      const effectiveDt = Math.min(dt, 0.1);
      this.time += effectiveDt;
      
      // Handle loop or end of animation
      if (this.time > this.current.duration) {
        if (this.loop) {
          // For looping, wrap around but retain fractional part for smoothness
          this.time = this.time % this.current.duration;
        } else {
          // For non-looping, stop at the end
          this.time = this.current.duration;
          this.playing = false;
        }
      }
      
      // Apply animation to each channel (joint+property)
      this.current.channels.forEach(ch => {
        const inputs = this.current.inputs[ch.sampler];
        const outputs = this.current.outputs[ch.sampler];
        
        // Don't process if we don't have valid data
        if (!inputs || !outputs || inputs.length < 1) return;
        
        // Find the keyframes to interpolate between
        let i = 0;
        while (i < inputs.length - 1 && inputs[i+1] <= this.time) {
          i++;
        }
        
        // Handle edge cases
        if (i >= inputs.length - 1) {
          i = inputs.length - 2;
          if (i < 0) i = 0;
        }
        
        // Get the times and compute interpolation factor
        const t0 = inputs[i];
        const t1 = inputs[i+1] || this.current.duration;
        const segmentDuration = t1 - t0;
        
        // Avoid division by zero
        const alpha = segmentDuration > 0.0001 ? 
                      (this.time - t0) / segmentDuration : 
                      0;
        
        // Determine stride based on property type (position/rotation/scale)
        const stride = ch.path === 'rotation' ? 4 : 3;
        
        // Apply interpolation for each component
        for (let k = 0; k < stride; ++k) {
          const v0 = outputs[i * stride + k];
          const v1 = outputs[(i+1) * stride + k] || v0;
          
          if (ch.path === 'rotation') {
            // For rotations, we should use spherical interpolation (SLERP)
            // This is a simplified approach - for proper SLERP you'd need a quaternion library
            ch.node.source[ch.path][k] = v0 + (v1 - v0) * alpha;
          } else {
            // Linear interpolation for positions and scales
            ch.node.source[ch.path][k] = v0 + (v1 - v0) * alpha;
          }
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  //  CARGA GLTF + PREPARACIÓN DE MESHES Y SKINS
  // -------------------------------------------------------------------------
  const gltf = await loadGLTF(gltfUrl);

  // ➊ buffers a GPU + atributos
  for (const mesh of gltf.meshes){
    for (const prim of mesh.primitives){
      const attribs={}; let num;
      for (const [name,idx] of Object.entries(prim.attributes)){
        const {accessor,buffer,stride}=getAccessorAndWebGLBuffer(gl,gltf,idx);
        num=accessor.count;
        const attrName = name==='TEXCOORD_0'?'a_texcoord':'a_'+name;
        attribs[attrName]={buffer,type:accessor.componentType,
                           numComponents:typeToNum(accessor.type),
                           stride,offset:accessor.byteOffset|0};
      }
      const bufInfo={attribs,numElements:num};
      if(prim.indices!==undefined){
        const {accessor,buffer}=getAccessorAndWebGLBuffer(gl,gltf,prim.indices);
        bufInfo.indices=buffer; bufInfo.elementType=accessor.componentType;
        bufInfo.numElements=accessor.count;
      }
      prim.bufferInfo=bufInfo;

      // material (simple)
      const matDef=gltf.materials[prim.material]||{};
      const mat={baseColorFactor:[1,1,1,1],baseColorTexture:null};
      if(matDef.pbrMetallicRoughness){
        const pbr=matDef.pbrMetallicRoughness;
        if(pbr.baseColorFactor) mat.baseColorFactor=pbr.baseColorFactor;
        if(pbr.baseColorTexture){
          const texInfo=gltf.textures[pbr.baseColorTexture.index];
          const imgInfo=gltf.images[texInfo.source];
          mat.baseColorTexture = await createTextureFromImageInfo(gl,imgInfo,gltfUrl);
        }
      }
      prim.material=mat;
    }
  }

  const skinNodes=[];
  const originalNodes=gltf.nodes;
  gltf.nodes = gltf.nodes.map(n=>{
    const {name,skin,mesh,translation,rotation,scale}=n;
    const node=new Node(new TRS(translation,rotation,scale),name);
    const realMesh=gltf.meshes[mesh];
    if(skin!==undefined){
      skinNodes.push({node,mesh:realMesh,skinIdx:skin});
    }else if(realMesh){
      node.drawables.push(new MeshRenderer(realMesh));
    }
    return node;
  });

  // skins
  gltf.skins = gltf.skins.map(s=>{
    const joints=s.joints.map(i=>gltf.nodes[i]);
    const {array}=getAccessorTypedArrayAndStride(gl,gltf,s.inverseBindMatrices);
    return new Skin(joints,array);
  });
  skinNodes.forEach(({node,mesh,skinIdx})=>{
    node.drawables.push(new SkinRenderer(mesh,gltf.skins[skinIdx]));
  });

  // jerarquía
  gltf.nodes.forEach((node,i)=>{
    const children=originalNodes[i].children;
    if(children) children.forEach(c=>gltf.nodes[c].setParent(node));
  });
  // escenas
  gltf.scenes.forEach(sc => {
  // bajamos todo el modelo 1.2 unidades en Y
    sc.root = new Node(new TRS([0, -1.2, 0]), sc.name);
    sc.nodes.forEach(idx => gltf.nodes[idx].setParent(sc.root));
  });

  function getInputArray(sampler) {
    // índices a los accessors → convertimos en TypedArray listo para usar
    return getAccessorTypedArrayAndStride(gl, gltf, sampler.input).array;
  }
  function getOutputArray(sampler) {
    return getAccessorTypedArrayAndStride(gl, gltf, sampler.output).array;
  }
  // -------------------------------------------------------------------------
  //  SISTEMA DE ANIMACIÓN BÁSICO  (solo toma el primer clip)
  // -------------------------------------------------------------------------
  //let inputs=[],outputs=[],channels=[],duration=0;
  const clips = gltf.animations.map(anim => {
    const inputs  = anim.samplers.map(s => getInputArray(s));
    const outputs = anim.samplers.map(s => getOutputArray(s));
    const channels = anim.channels.map(ch => ({
      sampler: ch.sampler,
      node:    gltf.nodes[ch.target.node],
      path:    ch.target.path === 'translation'
              ? 'position'
              : ch.target.path,
    }));
    const duration = inputs[0][inputs[0].length - 1];
    return { name: anim.name || 'clip0', inputs, outputs, channels, duration };
  });

  const animator = new Animator(clips);

  // -------------------------------------------------------------------------
  //  RENDER-LOOP
  // -------------------------------------------------------------------------
  // 1) Variables para controlar el delta y la velocidad
  let lastTime = 0;
  let playbackSpeed = 1.0;      // 1 = velocidad normal, <1 más lento, >1 más rápido
  let rafId;
  function render(now) {
    // convertimos a segundos y sacamos delta
    now *= 0.001;                 // ahora now es segundos absolutos
    const dt = lastTime ? (now - lastTime) * playbackSpeed : 0;
    lastTime = now;

    animator.update(dt);

    wu.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const { projectionMatrix, viewMatrix } = getThreeCameras();

    // **Aquí aplicamos el clip activo, si hay alguno**
    const clip = animator.current;
    if (clip) {
      const localT = animator.time % clip.duration;
      clip.channels.forEach(ch => {
        const inA  = clip.inputs[ch.sampler];
        const outA = clip.outputs[ch.sampler];
        let i = inA.findIndex(t => t > localT) - 1;
        if (i < 0) i = 0;
        const t0 = inA[i], t1 = inA[i+1] ?? clip.duration;
        const α  = (localT - t0) / (t1 - t0 || 1);
        const stride = ch.path === 'rotation' ? 4 : 3;
        for (let k = 0; k < stride; ++k) {
          const v0 = outA[i*stride + k];
          const v1 = outA[(i+1)*stride + k] ?? v0;
          ch.node.source[ch.path][k] = v0 + (v1 - v0) * α;
        }
      });
    }

    const shared = { u_lightDirection: m4.normalize([-1,3,5]) };
    const draw = node => {
      node.drawables.forEach(d => d.render(
        node,
        projectionMatrix,
        viewMatrix,
        shared
      ));
    };
    gltf.scenes.forEach(sc => {
      sc.root.updateWorldMatrix();
      sc.root.traverse(draw);
    });

    //requestAnimationFrame(render);
    rafId = requestAnimationFrame(render);

  }
  rafId = requestAnimationFrame(render);

   return {
     stop:    () => animator.stop(),
     play:    (clipName, loop) => animator.play(clipName, loop),
     clips:   clips.map(c => c.name),
    // 2) Exponemos método para ajustar la velocidad de reproducción
    setSpeed: (s) => { playbackSpeed = s; },
    // 3) para limpiar el RAF si quisieras reiniciar todo
    destroy:  () => cancelAnimationFrame(rafId),
   };
 }

// ---------------------------------------------------------------------------
//  HELPERS
// ---------------------------------------------------------------------------
function typeToNum(t){
  return {SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}[t];
}
function glTypeToArray(t){
  return {5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,
          5124:Int32Array,5125:Uint32Array,5126:Float32Array}[t];
}



function getAccessorTypedArrayAndStride(gl,gltf,idx){
  const acc=gltf.accessors[idx];
  const bv = gltf.bufferViews[acc.bufferView];
  const T = glTypeToArray(acc.componentType);
  return {
    accessor:acc,
    array:new T(gltf.buffers[bv.buffer],
                (bv.byteOffset||0)+(acc.byteOffset||0),
                acc.count*typeToNum(acc.type)),
    stride:bv.byteStride||0
  };
}
function getAccessorAndWebGLBuffer(gl,gltf,idx){
  const acc=gltf.accessors[idx];
  const bv=gltf.bufferViews[acc.bufferView];
  if(!bv.webglBuffer){
    const buf=gl.createBuffer();
    const target=bv.target||gl.ARRAY_BUFFER;
    const data=new Uint8Array(gltf.buffers[bv.buffer],bv.byteOffset,bv.byteLength);
    gl.bindBuffer(target,buf); gl.bufferData(target,data,gl.STATIC_DRAW);
    bv.webglBuffer=buf;
  }
  return {accessor:acc,buffer:bv.webglBuffer,stride:bv.stride||0};
}

// carga glTF + buffers binarios
async function loadGLTF(url){
  const gltf=await (await fetch(url)).json();
  const base=new URL(url,location.href);
  gltf.buffers = await Promise.all(gltf.buffers.map(b=>{
    const u=new URL(b.uri,base).href;
    return fetch(u).then(r=>r.arrayBuffer());
  }));
  return gltf;
}

async function createTextureFromImageInfo(gl,imgInfo,gltfUrl){
  if(!imgInfo) return null;
  let src;
  if(imgInfo.uri){
    src=new URL(imgInfo.uri,new URL(gltfUrl,location.href)).href;
  }else if(imgInfo.bufferView!==undefined){
    const bvIdx=imgInfo.bufferView;
    const base=new URL(gltfUrl,location.href);
    const gltf=await (await fetch(gltfUrl)).json(); // tiny request for mimeType
    const bv  = gltf.bufferViews[bvIdx];
    const buf = await fetch(new URL(gltf.buffers[bv.buffer].uri,base)).then(r=>r.arrayBuffer());
    const slice=buf.slice(bv.byteOffset || 0,(bv.byteOffset||0)+bv.byteLength);
    src=URL.createObjectURL(new Blob([slice],{type:imgInfo.mimeType}));
  }
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const tex=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.generateMipmap(gl.TEXTURE_2D);
      res(tex);
      if(src.startsWith('blob:')) URL.revokeObjectURL(src);
    };
    img.src=src;
  });
}