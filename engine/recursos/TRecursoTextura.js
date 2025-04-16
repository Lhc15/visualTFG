import TRecurso from './TRecurso.js';

class TRecursoTextura extends TRecurso {
    constructor() {
        super();
        this.id = null;     // ID de textura generado por WebGL (glGenTextures)
        this.width = 0;     // Ancho de la textura
        this.height = 0;    // Alto de la textura
    }

    // Método para cargar el fichero usando stb_image_loader
    cargarFichero(nombre) {
        this.SetNombre(nombre);
        try {
            // Cargar la imagen
            const image = new Image();
            image.onload = () => {
                this.width = image.width;
                this.height = image.height;
            };
            image.src = nombre;

            return new Promise((resolve, reject) => {
                image.onload = () => {
                    this.width = image.width;
                    this.height = image.height;
                    resolve(image);
                };
                image.onerror = () => {
                    reject(new Error(`Error cargando la imagen: ${nombre}`));
                };
            });
        } catch (error) {
            console.error('Error al cargar la textura:', error);
            throw error;
        }
    }

    // Método para cargar la textura en WebGL
    cargarEnGPU(gl) {
        // Generar ID de textura
        this.id = gl.createTexture();
        
        // Cargar la imagen y configurar la textura
        this.cargarFichero(this.GetNombre())
            .then(image => {
                gl.bindTexture(gl.TEXTURE_2D, this.id);
                
                // Configurar parámetros de la textura
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                
                // Cargar los datos de la imagen en la textura
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                
                gl.bindTexture(gl.TEXTURE_2D, null);
            })
            .catch(error => {
                console.error('Error al cargar la textura en GPU:', error);
                throw error;
            });
    }

    // Método para activar la textura para renderizado
    activar(gl, textureUnit = 0) {
        if (!this.id) {
            console.error('Textura no cargada en GPU');
            return;
        }
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, this.id);
    }

    // Método para liberar recursos
    liberar(gl) {
        if (this.id) {
            gl.deleteTexture(this.id);
            this.id = null;
        }
    }
}

export default TRecursoTextura; 