// WebGL - Skinning glTF
// from http://localhost:8082/webgl/webgl-skinning-3d-gltf-skinned.html

"use strict";

import TNodo from './entidades/TNodo.js';
import TMalla from './entidades/TMalla.js';
import TLuz from './entidades/TLuz.js';
import TCamara from './entidades/TCamara.js';
import { vec3, mat4 } from '../node_modules/gl-matrix/esm/index.js';

// Shaders
const vsSource = `
    attribute vec4 a_position;
    attribute vec3 a_normal;
    attribute vec2 a_texcoord;
    
    uniform mat4 u_matrix;
    
    varying vec3 v_normal;
    varying vec2 v_texcoord;
    
    void main() {
        gl_Position = u_matrix * a_position;
        v_normal = a_normal;
        v_texcoord = a_texcoord;
    }
`;

const fsSource = `
    precision mediump float;
    
    varying vec3 v_normal;
    varying vec2 v_texcoord;
    
    void main() {
        vec3 color = normalize(v_normal) * 0.5 + 0.5;
        gl_FragColor = vec4(color, 1.0);
    }
`;

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Error al inicializar el programa shader: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error al compilar los shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

export async function main() {
    console.log("Iniciando la aplicación");
    
    // Obtener el contexto WebGL
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('No se pudo inicializar WebGL');
        return;
    }

    // Crear y configurar el programa shader
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'a_position'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'a_normal'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'a_texcoord'),
        },
        uniformLocations: {
            matrix: gl.getUniformLocation(shaderProgram, 'u_matrix'),
        },
    };
    
    // Crear el nodo raíz de la escena
    const escena = new TNodo("Escena");
    
    // Crear los nodos para cada entidad
    const nodoMalla = new TNodo("Malla");
    const nodoLuz = new TNodo("Luz");
    const nodoCamara = new TNodo("Camara");
    
    // Crear las entidades
    const malla = new TMalla(gl, programInfo);
    const luz = new TLuz();
    const camara = new TCamara();
    
    // Asignar las entidades a sus nodos
    nodoMalla.setEntidad(malla);
    nodoLuz.setEntidad(luz);
    nodoCamara.setEntidad(camara);
    
    // Configurar las transformaciones iniciales
    nodoMalla.setTraslacion([0, 0, -5]);
    nodoLuz.setTraslacion([5, 5, 0]);
    nodoCamara.setTraslacion([0, 0, 0]);
    
    // Configurar rotaciones iniciales
    nodoMalla.setRotacion(vec3.fromValues(0, 0, 0));
    nodoLuz.setRotacion(vec3.fromValues(0, 0, 0));
    nodoCamara.setRotacion(vec3.fromValues(0, 0, 0));
    
    // Configurar escalados iniciales
    nodoMalla.setEscalado(vec3.fromValues(1, 1, 1));
    nodoLuz.setEscalado(vec3.fromValues(1, 1, 1));
    nodoCamara.setEscalado(vec3.fromValues(1, 1, 1));
    
    // Construir la jerarquía
    escena.addHijo(nodoMalla);
    escena.addHijo(nodoLuz);
    escena.addHijo(nodoCamara);
    
    // Configurar WebGL
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    // Iniciar el bucle de renderizado
    const matrizIdentidad = mat4.create();
    
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(programInfo.program);
        
        // Recorrer el árbol de escena aplicando las transformaciones
        escena.recorrer(matrizIdentidad);
        
        // Solicitar el siguiente frame
        requestAnimationFrame(render);
    }
    
    // Iniciar el renderizado
    render();
    
    return escena;
}

export default main;
