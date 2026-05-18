import { EnmPack } from './enm.types';

export const ENM_PACKS: EnmPack[] = [
  {
    id: 'pregunta-sin-particula',
    label: 'Pregunta sin partícula',
    descripcion: 'EJEMPLO: TÚ ESTUDIAR (¿Tú estudias?)\nCejas levantadas + inclinación de cabeza y hombros hacia delante.',
    imagen: 'assets/enm/psp.mp4',
    video: 'assets/enm/psp.mp4',
  },
  {
    id: 'pregunta-con-particula',
    label: 'Pregunta con partícula',
    descripcion: 'EJEMPLO: TÚ LLAMARSE CÓMO (¿Cómo te llamas?)\nCejas fruncidas + inclinación de cabeza hacia delante.',
    imagen: 'assets/pregunta-sin-particula-mujer.png',
    video: 'assets/enm/pcp2.mp4',
  },
];

export function getEnmPack(id: string): EnmPack | undefined {
  return ENM_PACKS.find(p => p.id === id);
}