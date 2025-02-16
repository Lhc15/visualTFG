import { TEntidad } from "./TEntidad";

export class TCamara extends TEntidad {
    fov: number;
    aspecto: number;
    near: number;
    far: number;

    constructor(nombre: string, fov: number, aspecto: number, near: number, far: number) {
        super(nombre);
        this.fov = fov;
        this.aspecto = aspecto;
        this.near = near;
        this.far = far;
    }

    override actualizar(): void {
        console.log(`Cámara ${this.nombre}`);
    }
}
