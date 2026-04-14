export interface CowProfile {
  id: string;
  name: string;
  breed: string;
  dob: string;
  numberOfCalves: number;
  lastCalvingDate?: string;
  status: 'active' | 'pregnant' | 'dry' | 'sick';
  remarks?: string;
}

export interface MilkRecord {
  id: string;
  cowId: string;
  date: string;
  morningLitres: number;
  noonLitres: number;
  eveningLitres: number;
  totalLitres: number;
  recordedBy?: string;
}

export interface FeedRecord {
  id: string;
  cowId: string;
  date: string;
  feedType: string;
  quantity: number;
  unit: 'kg' | 'bundles' | 'bags';
}

export interface HealthRecord {
  id: string;
  cowId: string;
  date: string;
  vaccinationDate?: string;
  sprayDate?: string;
  dewormingDate?: string;
  healthStatus: 'healthy' | 'sickness';
  attendedBy?: string;
  treatmentPeriod?: {
    from: string;
    to: string;
  };
  illness?: string;
}
