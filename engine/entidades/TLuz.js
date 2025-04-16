import TEntidad from './TEntidad.js';

class TLuz extends TEntidad {
    constructor() {
        super();
        // Vector de intensidad RGB (por defecto luz blanca)
        this.intensidad = new Float32Array([1.0, 1.0, 1.0]);
    }

    // Establecer la intensidad de la luz
    setIntensidad(vec3) {
        if (vec3.length !== 3) {
            throw new Error('El vector de intensidad debe tener 3 componentes (RGB)');
        }
        this.intensidad[0] = vec3[0];
        this.intensidad[1] = vec3[1];
        this.intensidad[2] = vec3[2];
    }

    // Obtener la intensidad de la luz
    getIntensidad() {
        return new Float32Array(this.intensidad);
    }

    // Implementación del método dibujar heredado de TEntidad
    dibujar(mat4) {
        // La luz no necesita dibujarse directamente, pero podría
        // representarse con un gizmo para debug
        // Por ejemplo, dibujar una esfera o un icono que represente la luz
    }
}

export default TLuz; 