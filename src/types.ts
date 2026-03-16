export enum AppointmentSource {
  PROSPECT = 'PROSPECT',
  SETTER = 'SETTER'
}

export enum AttendanceStatus {
  SHOWED_UP = 'SHOWED_UP',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

export enum SignatureStatus {
  SIGNED = 'SIGNED',
  NOT_SIGNED = 'NOT_SIGNED',
  PENDING = 'PENDING'
}

export interface Client {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  createdAt: string;
  signedAt?: string;
  formulaId?: string;
  isActive: boolean;
  deactivatedAt?: string;
}

export interface Formula {
  id: string;
  name: string;
  price: number;
  period: 'week' | 'month' | 'year';
  almaCommission?: number; // Percentage commission for Alma (annual)
}

export interface WhatsAppContact {
  id: number;
  name: string;
  phone: string;
}

export interface Relance {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  dueDate: string;
  createdAt: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export interface DashboardStats {
  totalContacts: number;
  totalClients: number;
  totalAdherents: number;
  signatures: number;
  appointmentsTaken: number;
  appointmentSources: {
    prospect: number;
    setter: number;
  };
  attendance: {
    showedUp: number;
    noShow: number;
    cancelled: number;
  };
  conversions: {
    signed: number;
    notSigned: number;
  };
  churnRate: number;
  totalRevenueTTC: number;
  totalRevenueHT: number;
  averageBasketTTC: number;
  averageBasketHT: number;
  showUpRate: number;
  closingRate: number;
  appointmentRate: number;
  pickupRate: number;
  totalCalls: number;
  totalPickups: number;
  contactsDigital: number;
  contactsNonDigital: number;
  digitalPercentage: number;
  dailyStats: {
    date: string;
    prospects: number;
    signatures: number;
  }[];
}

export interface ManualStats {
  id?: string;
  period_start: string;
  period_type: 'day' | 'week' | 'month';
  totalContacts: number;
  appointmentsTaken: number;
  appointmentsProspect: number;
  appointmentsSetter: number;
  showedUp: number;
  noShow: number;
  cancelled: number;
  signed: number;
  notSigned: number;
  totalCalls: number;
  totalPickups: number;
  contactsDigital: number;
  contactsNonDigital: number;
  notes?: string;
}

export interface DailyLog {
  id?: string;
  date: string;
  appointments: number;
  showedUp: number;
  signed: number;
  notSigned: number;
  pending: number;
  noShow: number;
  digital: number;
  nonDigital: number;
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'total';
