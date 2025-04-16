import TRecurso from './TRecurso.js';

class TGestorRecursos {
    constructor() {
        this.recursos = []; // Vector de TRecurso
    }

    // Método principal para obtener un recurso
    getRecurso(nombre) {
        // Buscar el recurso en el vector
        let rec = this.buscarRecurso(nombre);
        
        // Si no se encuentra, crear uno nuevo
        if (!rec) {
            rec = this.crearRecurso();
            rec.SetNombre(nombre);
            this.recursos.push(rec);
        }
        
        return rec;
    }

    // Método auxiliar para buscar un recurso por nombre
    buscarRecurso(nombre) {
        return this.recursos.find(recurso => recurso.GetNombre() === nombre);
    }

    // Método para crear una nueva instancia de recurso
    crearRecurso() {
        // Este método debe ser sobrescrito por las clases derivadas
        throw new Error('crearRecurso debe ser implementado por las clases derivadas');
    }
}

export default TGestorRecursos; 