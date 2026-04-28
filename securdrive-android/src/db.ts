import Dexie, { type Table } from 'dexie';

export type VehicleType =
  | 'Camioneta' | 'Cisterna de agua' | 'Cisterna de combustible'
  | 'Bus' | 'Minibús' | 'Excavadora' | 'Retroexcavadora'
  | 'Cargador frontal' | 'Tracto' | 'Sprinter' | 'Custer'
  | 'Plataforma' | 'Encapsulado';

export interface VehicleRecord {
  id?: number;
  plate: string;
  secondaryPlate?: string;
  type: VehicleType;
  driver: string;
  destination: string;
  shift: 'Día' | 'Noche';
  guard: string;
  exitTime: Date;
  exitMileage: number;
  exitPhotos: string[];
  returnTime?: Date;
  returnMileage?: number;
  returnPhotos?: string[];
  observations?: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface GuardSession {
  id?: number;
  name: string;
  shift: 'Día' | 'Noche';
  startTime: Date;
}

export class AppDatabase extends Dexie {
  records!: Table<VehicleRecord>;
  sessions!: Table<GuardSession>;

  constructor() {
    super('SecurDriveDB');
    this.version(2).stores({
      records: '++id, plate, status, exitTime, type, guard',
      sessions: '++id, name, startTime',
    });
  }
}

export const db = new AppDatabase();
