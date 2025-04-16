class TEntidad {
    constructor() {
        // Asegurar que esta clase es abstracta
        if (this.constructor === TEntidad) {
            throw new Error('TEntidad es una clase abstracta y no puede ser instanciada directamente.');
        }
    }

    // Método virtual para dibujar la entidad
    dibujar(mat4) {
        throw new Error('El método dibujar debe ser implementado por las clases derivadas');
    }
}

export default TEntidad; 