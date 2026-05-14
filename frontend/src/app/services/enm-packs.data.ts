import { EnmPack } from './enm.types';

export const ENM_PACKS: EnmPack[] = [
  {
    id: 'pregunta-sin-particula',
    label: 'Pregunta sin partícula',
    descripcion: 'EJEMPLO: TÚ NOMBRE QUÉ (¿Cómo te llamas?)\nCejas levantadas + inclinación de cabeza y hombros hacia delante.',
    imagen: 'assets/pregunta-sin-particula-hombre.png',
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