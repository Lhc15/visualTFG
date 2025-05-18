/**
 * Clase TRecursoShader
 * Gestiona los recursos de shaders en WebGL
 */
export class TRecursoShader {
    constructor() {
        this.vertexShader = null;
        this.fragmentShader = null;
        this.program = null;
        this.attributes = new Map();
        this.uniforms = new Map();
    }

    /**
     * Carga y compila un shader
     * @param {WebGLRenderingContext} gl - Contexto WebGL
     * @param {string} vertexSource - Código fuente del vertex shader
     * @param {string} fragmentSource - Código fuente del fragment shader
     * @returns {boolean} - true si se compiló correctamente
     */
    cargar(gl, vertexSource, fragmentSource) {
        // Crear y compilar vertex shader
        this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vertexShader, vertexSource);
        gl.compileShader(this.vertexShader);

        if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
            console.error('Error compilando vertex shader:', gl.getShaderInfoLog(this.vertexShader));
            gl.deleteShader(this.vertexShader);
            return false;
        }

        // Crear y compilar fragment shader
        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.fragmentShader, fragmentSource);
        gl.compileShader(this.fragmentShader);

        if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Error compilando fragment shader:', gl.getShaderInfoLog(this.fragmentShader));
            gl.deleteShader(this.fragmentShader);
            return false;
        }

        // Crear y linkar programa
        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vertexShader);
        gl.attachShader(this.program, this.fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Error linkando programa:', gl.getProgramInfoLog(this.program));
            return false;
        }

        // Obtener atributos y uniforms
        this.obtenerAtributos(gl);
        this.obtenerUniforms(gl);

        return true;
    }

    /**
     * Obtiene los atributos del shader
     * @param {WebGLRenderingContext} gl - Contexto WebGL
     */
    obtenerAtributos(gl) {
        const numAttribs = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttribs; i++) {
            const info = gl.getActiveAttrib(this.program, i);
            const location = gl.getAttribLocation(this.program, info.name);
            this.attributes.set(info.name, {
                location: location,
                type: info.type,
                size: info.size
            });
        }
    }

    /**
     * Obtiene los uniforms del shader
     * @param {WebGLRenderingContext} gl - Contexto WebGL
     */
    obtenerUniforms(gl) {
        const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(this.program, i);
            const location = gl.getUniformLocation(this.program, info.name);
            this.uniforms.set(info.name, {
                location: location,
                type: info.type,
                size: info.size
            });
        }
    }

    /**
     * Usa el programa de shader
     * @param {WebGLRenderingContext} gl - Contexto WebGL
     */
    usar(gl) {
        gl.useProgram(this.program);
    }

    /**
     * Libera los recursos del shader
     * @param {WebGLRenderingContext} gl - Contexto WebGL
     */
    liberar(gl) {
        if (this.vertexShader) {
            gl.deleteShader(this.vertexShader);
            this.vertexShader = null;
        }
        if (this.fragmentShader) {
            gl.deleteShader(this.fragmentShader);
            this.fragmentShader = null;
        }
        if (this.program) {
            gl.deleteProgram(this.program);
            this.program = null;
        }
        this.attributes.clear();
        this.uniforms.clear();
    }

    /**
     * Obtiene la ubicación de un atributo
     * @param {string} nombre - Nombre del atributo
     * @returns {number} - Ubicación del atributo o -1 si no existe
     */
    obtenerAtributo(nombre) {
        const attr = this.attributes.get(nombre);
        return attr ? attr.location : -1;
    }

    /**
     * Obtiene la ubicación de un uniform
     * @param {string} nombre - Nombre del uniform
     * @returns {WebGLUniformLocation} - Ubicación del uniform o null si no existe
     */
    obtenerUniform(nombre) {
        const uniform = this.uniforms.get(nombre);
        return uniform ? uniform.location : null;
    }
} 