import { Nodo } from "./escena/Nodo";
import { TLuz } from "./entidades/TLuz";
import { TMalla } from "./entidades/TMalla";
import { TCamara } from "./entidades/TCamara"; // Asegúrate de que la ruta del import es correcta

export function iniciarEscena(): Nodo {
    console.log("Creando escena...");

    // Crear nodo raíz con el nombre "Escena"
    const nodoRaiz = new Nodo({ nombre: "Escena" } as any);

    // Crear entidades
    const luz = new TLuz("Luz Principal", 0, 10, 0, 1.0, [255, 255, 255]);
    const camara = new TCamara("Cámara Principal", 45, 16 / 9, 0.1, 100);
    const malla = new TMalla("Cubo", 0, 0, 0, 
        [
            -1, -1, -1,   1, -1, -1,   1,  1, -1,  -1,  1, -1,
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
        ],
        [0, 1, 2, 2, 3, 0]
    );

    // Crear nodos con sus respectivas entidades y asignarles el padre
    const nodoLuz = new Nodo(luz, nodoRaiz);
    const nodoCamara = new Nodo(camara, nodoRaiz);
    const nodoMalla = new Nodo(malla, nodoRaiz);

    // Agregar los nodos hijos al nodo raíz ("Escena")
    nodoRaiz.agregarHijo(nodoLuz);
    nodoRaiz.agregarHijo(nodoCamara);
    nodoRaiz.agregarHijo(nodoMalla);

    // Actualizar la escena
    nodoRaiz.actualizar();

    return nodoRaiz;
}
