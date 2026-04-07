export type EnmPackId =
  | 'pregunta-sin-particula'
  | 'pregunta-con-particula'
  | 'negacion'
  | 'afirmacion';

export interface EnmPack {
  id: EnmPackId;
  label: string;
  descripcion: string;
  imagen?: string;
  video?: string;
}