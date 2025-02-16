import { TEntidad } from "./TEntidad";

export class TMalla extends TEntidad {
    vertices: number[];
    indices: number[];

    constructor(nombre: string, x: number, y: number, z: number, vertices: number[], indices: number[]) {
        super(nombre);
        this.vertices = vertices;
        this.indices = indices;
    }

    override actualizar(): void {
        console.log(`Malla ${this.nombre} con ${this.vertices.length} vértices`);
    }
}
