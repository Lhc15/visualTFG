import TEntidad from './TEntidad.js';

class TCamara extends TEntidad {
    constructor() {
        super();
        this.esPerspectiva = true;  // Por defecto usamos perspectiva
        this.cercano = 0.1;         // Plano cercano
        this.lejano = 1000.0;       // Plano lejano
        this.fovy = 45.0;           // Campo de visión vertical (en grados)
        this.aspect = 1.0;          // Relación de aspecto
        this.width = 1.0;           // Ancho para vista paralela
        this.height = 1.0;          // Alto para vista paralela
    }

    // Configurar vista en perspectiva
    setPerspectiva(fovy, aspect, cercano, lejano) {
        this.esPerspectiva = true;
        this.fovy = fovy;
        this.aspect = aspect;
        this.cercano = cercano;
        this.lejano = lejano;
    }

    // Configurar vista paralela/ortográfica
    setParalela(width, height, cercano, lejano) {
        this.esPerspectiva = false;
        this.width = width;
        this.height = height;
        this.cercano = cercano;
        this.lejano = lejano;
    }

    // Obtener matriz de proyección
    getProyeccion() {
        if (this.esPerspectiva) {
            // Matriz de proyección en perspectiva
            return this.crearMatrizPerspectiva(
                this.fovy * Math.PI / 180, // Convertir fovy a radianes
                this.aspect,
                this.cercano,
                this.lejano
            );
        } else {
            // Matriz de proyección ortográfica
            return this.crearMatrizOrtografica(
                -this.width / 2,
                this.width / 2,
                -this.height / 2,
                this.height / 2,
                this.cercano,
                this.lejano
            );
        }
    }

    // Crear matriz de perspectiva
    crearMatrizPerspectiva(fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const rangeInv = 1 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ]);
    }

    // Crear matriz ortográfica
    crearMatrizOrtografica(left, right, bottom, top, near, far) {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);

        return new Float32Array([
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, 2 * nf, 0,
            (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
        ]);
    }

    // Implementación del método dibujar heredado de TEntidad
    dibujar(mat4) {
        // La cámara no necesita dibujarse, pero podría usarse para debug
        // Por ejemplo, dibujar un frustum o un gizmo de la cámara
    }
}

export default TCamara; 