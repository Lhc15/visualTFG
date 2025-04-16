import TEntidad from './TEntidad.js';
import TRecursoMalla from '../recursos/TRecursoMalla.js';

class TMalla extends TEntidad {
    constructor(gl, programInfo) {
        super();
        this.malla = null; // TRecursoMalla
        this.gl = gl;
        this.programInfo = programInfo;
        this.cargarMalla('../recursos/cubo.gltf');
    }

    // Método para cargar la malla desde un fichero
    cargarMalla(fichero) {
        // Crear y cargar el recurso de malla
        this.malla = new TRecursoMalla();
        this.malla.cargarFichero(fichero);
        console.log('Cargando malla desde:', fichero);
    }

    // Implementación del método dibujar heredado de TEntidad
    dibujar(matrizTransf) {
        if (!this.malla || !this.gl || !this.programInfo) {
            console.error('No hay malla cargada o falta el contexto GL');
            return;
        }
        // Llamar al método draw del recurso malla con el contexto GL y el programa
        this.malla.draw(this.gl, this.programInfo, matrizTransf);
    }
}

export default TMalla; 