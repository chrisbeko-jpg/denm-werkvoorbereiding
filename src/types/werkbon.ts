export interface WerkbonData {
  klantNaam: string;
  klantAdres: string;
  klantTelefoon: string;
  klantEmail: string;
  werkzaamheden: string;
  aandachtspunten: string;
}

export interface UploadedPhoto {
  id: string;
  dataUrl: string;
  name: string;
}
