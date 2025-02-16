import { TEntidad } from "./TEntidad";

export class TLuz extends TEntidad {
    intensidad: number;
    color: [number, number, number];

    constructor(nombre: string, x: number, y: number, z: number, intensidad: number, color: [number, number, number]) {
        super(nombre);
        this.intensidad = intensidad;
        this.color = color;
    }

    override actualizar(): void {
        console.log(`Luz ${this.nombre}  con intensidad ${this.intensidad}`);
    }
}
