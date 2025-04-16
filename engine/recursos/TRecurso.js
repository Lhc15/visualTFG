class TRecurso {
    constructor() {
        this.nombre = '';
        
        // Asegurar que esta clase es abstracta
        if (this.constructor === TRecurso) {
            throw new Error('TRecurso es una clase abstracta y no puede ser instanciada directamente.');
        }
    }

    // Getter para el nombre
    GetNombre() {
        return this.nombre;
    }

    // Setter para el nombre
    SetNombre(nombre) {
        this.nombre = nombre;
    }
}

export default TRecurso;
