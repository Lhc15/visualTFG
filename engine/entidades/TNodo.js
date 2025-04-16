import TEntidad from './TEntidad.js';
import { vec3, mat4 } from '../../node_modules/gl-matrix/esm/index.js';

class TNodo {
    constructor(nombre = "Sin nombre") {
        this.entidad = null;      // TEntidad *entidad
        this.hijos = [];          // vector <TNodo*> hijos
        this.padre = null;        // TNodo *padre
        this.nombre = nombre;     // Nombre del nodo
        
        // Vectores de transformación
        this.traslacion = vec3.create();  // vec3 traslacion
        this.rotacion = vec3.create();    // vec3 rotacion
        this.escalado = vec3.fromValues(1, 1, 1);  // vec3 escalado
        this.matrizTransf = mat4.create(); // mat4 matrizTransf

        if (nombre === "Escena") {
            console.log("Soy el nodo Escena");
        } else {
            console.log(`Soy el nodo ${nombre}`);
        }
    }

    // Métodos de gestión de jerarquía
    addHijo(nodo) {
        if (nodo.padre) {
            nodo.padre.remHijo(nodo);
        }
        nodo.padre = this;
        this.hijos.push(nodo);

        // Si soy el nodo Escena, mostrar información de los hijos
        if (this.nombre === "Escena") {
            const nombresHijos = this.hijos.map(hijo => hijo.nombre).join(", ");
            console.log(`Soy el nodo Escena y mis hijos son: ${nombresHijos}`);
        }

        return 1;
    }

    remHijo(nodo) {
        const index = this.hijos.indexOf(nodo);
        if (index !== -1) {
            this.hijos.splice(index, 1);
            nodo.padre = null;
            return 1;
        }
        return 0;
    }

    // Métodos de gestión de entidad
    setEntidad(entidad) {
        if (!(entidad instanceof TEntidad)) {
            return false;
        }
        this.entidad = entidad;
        return true;
    }

    getEntidad() {
        return this.entidad;
    }

    getPadre() {
        return this.padre;
    }

    // Método de recorrido del árbol
    recorrer(matriz) {
        // Actualizar matriz de transformación
        mat4.copy(this.matrizTransf, matriz);
        
        // Aplicar transformaciones locales
        mat4.translate(this.matrizTransf, this.matrizTransf, this.traslacion);
        mat4.rotateX(this.matrizTransf, this.matrizTransf, this.rotacion[0]);
        mat4.rotateY(this.matrizTransf, this.matrizTransf, this.rotacion[1]);
        mat4.rotateZ(this.matrizTransf, this.matrizTransf, this.rotacion[2]);
        mat4.scale(this.matrizTransf, this.matrizTransf, this.escalado);

        // Dibujar la entidad si existe
        if (this.entidad) {
            this.entidad.dibujar(this.matrizTransf);
        }

        // Recorrer hijos
        for (const hijo of this.hijos) {
            hijo.recorrer(this.matrizTransf);
        }
    }

    // Métodos de transformación
    setTraslacion(v) {
        vec3.copy(this.traslacion, v);
    }

    setRotacion(v) {
        vec3.copy(this.rotacion, v);
    }

    setEscalado(v) {
        vec3.copy(this.escalado, v);
    }

    trasladar(v) {
        vec3.add(this.traslacion, this.traslacion, v);
    }

    rotar(v) {
        vec3.add(this.rotacion, this.rotacion, v);
    }

    escalar(v) {
        vec3.multiply(this.escalado, this.escalado, v);
    }

    getTraslacion() {
        return vec3.clone(this.traslacion);
    }

    getRotacion() {
        return vec3.clone(this.rotacion);
    }

    getEscalado() {
        return vec3.clone(this.escalado);
    }

    setMatrizTransf(m) {
        mat4.copy(this.matrizTransf, m);
    }

    getMatrizTransf() {
        return mat4.clone(this.matrizTransf);
    }
}

export default TNodo; 