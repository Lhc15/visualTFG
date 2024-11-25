//Tutoriales usados https://www.youtube.com/watch?v=_OwJV2xL8M8
//https://www.youtube.com/watch?v=lGokKxJ8D2c

import * as THREE from 'three';
import "./style.css";
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import gsap from 'gsap'; 
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
//import { add } from 'three/webgpu';

//creamos la escena
const scene = new THREE.Scene();
//Creacion del objeto que queremos cargar
const loader = new GLTFLoader();


loader.load(
  '/Modelo_pruebas.gltf', // Ruta al archivo GLTF
  (gltf) => {
    console.log("hey")
    const model = gltf.scene; // Obtener la escena del modelo cargado

    // Ajustar posición, escala, y rotación si es necesario
    model.position.set(0, -2.5, 0); //Ajustamos para que quede en una posición acertada
    //console.Console(model.getWorldPosition(model))
    model.scale.set(2, 2, 2); // Escalamo del modelo
    model.rotation.set(0, 0, 0); // Rotamos el modelo de ser necesario (en radianes)


    //Vamos a cargar una textura
    const texture = new THREE.TextureLoader().load( "/images.jpg" );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 1, 1 );
    model.traverse((child) => {
      if (child.isMesh) {
        // Verificamos si la malla tiene un material y le asignamos la textura
        if (child.material) {
          child.material.map = texture;
          child.material.needsUpdate = true; // Asegurar que el material se actualice
        }
      }
    });

        
    //añadimos los controles
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    //controls.target.set(-4, 0, 0);

    //Control del giro en los ejes X y Z
    controls.minPolarAngle = Math.PI / 2; // Límite inferior (90 grados)
    controls.maxPolarAngle = Math.PI / 2; // Límite superior (90 grados)
    
    //Limitamos los ejes a izquierda y derecha
    controls.minAzimuthAngle = -Math.PI / 6; // Límite izquierdo (30º en radianes)
    controls.maxAzimuthAngle = Math.PI / 6; // Límite derecho (30º en radianes)
    controls.update();

    // Agregar el modelo a la escena
    scene.add(model);

    //Timeline (para animaciones)
    const tl = gsap.timeline({defaults: {duration: 1}});//sincronizar varias animaciones a la vez
    tl.fromTo(model.scale, {z:0, x:0, y:0},  {z:2.5, x:2.5, y:2.5});
    tl.fromTo('nav', {y: "-100%"}, {y:"0%"});
    //tl.fromTo('form', {y: "150%"}, {y: "50%"})
    //tl.fromTo('.title', {opacity: 0}, {opacity: 1})
    console.log("Modelo cargado:", model);
  },
  (xhr) => {
    // Monitor de progreso
    console.log(`Cargando modelo: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
  },
  (error) => {
    // Manejo de errores
    console.error("Error al cargar el modelo:", error);
  }
);



//Ajustamos tamaños
const sizes = {
  width: window.innerWidth,
  height: innerHeight,
}

//añadimos la luz
const light = new THREE.PointLight(0xffffff, 500, 100);
light.position.set(0, 0, 10);
scene.add(light);

const light2 = new THREE.PointLight(0xffffff, 100, 100);
light2.position.set(0, -10, 0);
scene.add(light2);

//añadimos la camara
const camera = new THREE.PerspectiveCamera(45, sizes.width/sizes.height, 0.1, 100); //Parametros: 1 campo de visión(mayor de 50 puede provocar distorsion), 2 aspect ratio(tendría que ser 800/600 pero simplificando la fracción obtenemos 4/3), 3-4 near/far clipping point
camera.position.z = 15;
console.log("Posicion de la camara: ", camera.position.z)
//Desplazamos la cámara a la derecha
camera.setViewOffset(
  window.innerWidth, // full width
  window.innerHeight, // full height
  window.innerWidth / 4, // desplazamiento en el eje x (positivo para mover a la izquierda y negativo a la derecha)
  0, // desplazamiento en el eje y
  window.innerWidth, // width of subcamera
  window.innerHeight, // height of subcamera
  );
scene.add(camera);


//Renderizado de la escena
const canvas = document.querySelector(".webgl");
const renderer = new THREE.WebGLRenderer({canvas}); 
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(2);
renderer.render(scene, camera); 

//Controles
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false;
//controls.target.copy(loader.model.x);//Ajustamos el pivote a las coordenadas del modelo
//controls.autoRotate = true;
//controls.autoRotateSpeed = 5;

//EVENT LISTENERS
//Reescalado
window.addEventListener('resize', () =>{
  //Actualizar tamaño de la ventana
  //console.log('actualizando tamaños beibi')
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  //Actualizamos nuestra camara y el renderizado
  camera.aspect = sizes.width/sizes.height
  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height)
})
//Ajuste del zoom
const zoomControl = document.getElementById('zoom');
// Agregamos un evento para ajustar el zoom
zoomControl.addEventListener('input', (event) => {
  const zoomValue = event.target.value;
  const zMin = 15; // Distancia más cercana
  const zMax = 50; // Distancia más lejana
  

  // Ajustamos la posición de la cámara en el eje Z para simular el zoom
  const zPosition = (zMax + zMin)-zoomValue;
  camera.position.z = zPosition;
  console.log("Nueva posicion de la camara: ", camera.position.z);

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Ajustar la posición de la cámara en función de la distancia y la dirección
  camera.position.copy(direction.multiplyScalar(-zPosition).add(controls.target));

  console.log("Nueva posición de la cámara: ", camera.position);

  // Renderizar la escena de nuevo
  renderer.render(scene, camera);
});

//Bucle de la escena
const loop = () => {
  //console.log("Posición X: ", mesh.position.x)
  //mesh.position.x += 0.1;
  //controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(loop);
}
loop()

//Time line
/*const tl = gsap.timeline({defaults: {duration: 1}});//sincronizar varias animaciones a la vez
tl.fromTo(model.scale, {z:0, x:0, y:0},  {z:1, x:1, y:1});
tl.from('nav', {y: "-100%"}, {y:"0%"});
//tl.fromTo('.title', {opacity: 0}, {opacity: 1})*/

//Mouse animation color
let mouseDown = false;
let rgb =[];
/*window.addEventListener('mousedown', () => (mouseDown=true));
window.addEventListener('mouseup', () => (mouseDown=false));
window.addEventListener('mousemove', (e) =>
{
  if(mouseDown)
  {
    rgb = [Math.round((e.pageX/sizes.width)*255),Math.round((e.pageY/sizes.height)*255),150]
    let newColor = new THREE.Color(`rgb(${rgb.join(",")})`);
    
    //gsap.to(mesh.material.color, {r: newColor.r, g: newColor.g, b: newColor.b});
  }
});*/
