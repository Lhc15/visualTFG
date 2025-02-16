import { TEntidad } from "../entidades/TEntidad";

export class Nodo {
    entidad: TEntidad | null;
    transformacion: {
        posicion: [number, number, number];
        rotacion: [number, number, number]; // Rotación en Euler (X, Y, Z)
        escala: [number, number, number];
    };
    hijos: Nodo[];
    padre: Nodo | null; // Se agrega la referencia al nodo padre

    constructor(entidad: TEntidad | null = null, padre: Nodo | null = null) {
        this.entidad = entidad;
        this.transformacion = {
            posicion: [0, 0, 0],
            rotacion: [0, 0, 0],
            escala: [1, 1, 1]
        };
        this.hijos = [];
        this.padre = padre;

        // Obtener nombres para el mensaje en consola
        const nombreNodo = this.entidad ? this.entidad.nombre : "Nodo vacío";
        const tipoEntidad = this.entidad ? this.entidad.constructor.name : "Ninguna";
        const nombrePadre = this.padre ? (this.padre.entidad ? this.padre.entidad.nombre : "Escena") : "Sin padre";

        console.log(`Soy el nodo [${nombreNodo}], mi entidad es [${tipoEntidad}], y mi padre es [${nombrePadre}]`);
    }

    agregarHijo(nodo: Nodo): void {
        nodo.padre = this; // Asignar padre al nodo hijo
        this.hijos.push(nodo);
    }

    actualizar(): void {
        if (this.entidad) {
            console.log(`Actualizando nodo de: ${this.entidad.nombre}`);
        }
        for (const hijo of this.hijos) {
            hijo.actualizar();
        }
    }
}
