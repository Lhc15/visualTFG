export class TEntidad {
    nombre: string;

    constructor(nombre: string) {
        this.nombre = nombre;
    }

    actualizar(): void {
        console.log(`${this.nombre} se actualiza.`);
    }
}
