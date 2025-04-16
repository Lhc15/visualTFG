import TRecurso from './TRecurso.js';

class TRecursoMalla extends TRecurso {
    constructor() {
        super();
        // Buffers para los datos de la malla
        this.vertices = null;    // float array para vértices
        this.normales = null;    // float array para normales
        this.coordTexturas = null; // float array para coordenadas de textura
        this.indices = null;     // int array para índices
    }

    // Método para cargar el fichero y rellenar los buffers
    cargarFichero(nombre) {
        this.SetNombre(nombre);
        try {
            // Aquí implementaremos la carga del fichero
            // Por ahora es un placeholder que crea una geometría simple
            this.vertices = new Float32Array([
                // Vértices de un triángulo simple por defecto
                -1.0, -1.0, 0.0,
                1.0, -1.0, 0.0,
                0.0, 1.0, 0.0
            ]);

            this.normales = new Float32Array([
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 1.0
            ]);

            this.coordTexturas = new Float32Array([
                0.0, 0.0,
                1.0, 0.0,
                0.5, 1.0
            ]);

            this.indices = new Uint16Array([0, 1, 2]);

        } catch (error) {
            console.error('Error al cargar el fichero:', error);
            throw error;
        }
    }

    // Método para dibujar la malla usando WebGL
    draw(gl, programInfo, matrizTransf) {
        if (!this.vertices || !this.indices) {
            console.error('No hay datos de malla para dibujar');
            return;
        }

        // Crear y configurar buffers de WebGL
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normales, gl.STATIC_DRAW);

        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.coordTexturas, gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // Configurar atributos
        const positionLocation = gl.getAttribLocation(programInfo.program, 'a_position');
        const normalLocation = gl.getAttribLocation(programInfo.program, 'a_normal');
        const texcoordLocation = gl.getAttribLocation(programInfo.program, 'a_texcoord');

        // Establecer la matriz de transformación
        const matrixLocation = gl.getUniformLocation(programInfo.program, 'u_matrix');
        gl.uniformMatrix4fv(matrixLocation, false, matrizTransf);

        // Habilitar atributos
        gl.enableVertexAttribArray(positionLocation);
        gl.enableVertexAttribArray(normalLocation);
        gl.enableVertexAttribArray(texcoordLocation);

        // Configurar punteros a atributos
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Dibujar la malla
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

        // Limpiar
        gl.disableVertexAttribArray(positionLocation);
        gl.disableVertexAttribArray(normalLocation);
        gl.disableVertexAttribArray(texcoordLocation);
    }
}

export default TRecursoMalla; 