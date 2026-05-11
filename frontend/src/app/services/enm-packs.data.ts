import { EnmPack } from './enm.types';

export const ENM_PACKS: EnmPack[] = [
  {
    id: 'pregunta-sin-particula',
    label: 'Pregunta sin partícula',
    descripcion: 'Cejas levantadas + inclinación de cabeza y hombros hacia delante.',
    imagen: 'assets/pregunta-sin-particula-hombre.png',
  },
  {
    id: 'pregunta-con-particula',
    label: 'Pregunta con partícula',
    descripcion: 'Cejas fruncidas + inclinación de cabeza hacia delante.',
    imagen: 'assets/pregunta-sin-particula-mujer.png',
    video: 'assets/enm/pcp.mp4',
  },
];

export function getEnmPack(id: string): EnmPack | undefined {
  return ENM_PACKS.find(p => p.id === id);
}