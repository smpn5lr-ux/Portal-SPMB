
export type AdmissionPath = 'Zonasi' | 'Prestasi' | 'Afirmasi' | 'Perpindahan Orang Tua';

export type VerificationStatus = 'Belum Diverifikasi' | 'Lengkap' | 'Perlu Perbaikan' | 'Ditolak';

export type AdmissionStatus = 'accepted' | 'waitlisted' | 'rejected' | 'pending';

export interface Applicant {
  id: string;
  registrationNumber: string;
  registrationSequence: number;
  NISN: string;
  NIK: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  address: string;
  parentName: string;
  parentPhone: string;
  originSchool: string;
  familyCardNumber: string;
  applicationPath: AdmissionPath;
  photoUrl?: string;
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  academicScore?: number;
  distanceToSchoolKm?: number;
  ageYears?: number;
  affirmationCategory?: string;
  admissionStatus: AdmissionStatus;
  rankingInPath?: number;
  assignedClassId?: string;
  createdAt: string;
  
  // Bidang Tambahan Dapodik
  livingWith?: string;
  transportation?: string;
  hobbies?: string;
  specialNeeds?: string;
  registrantRelationship?: string;
  numberOfSiblings?: number;
  childOrder?: number;
  
  // Detail Orang Tua
  fatherName?: string;
  fatherNIK?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherNIK?: string;
  motherOccupation?: string;
  parentIncomeRange?: string;
}

export interface Classroom {
  id: string;
  name: string;
  gradeLevel: number;
  homeroomTeacher: string;
  capacity: number;
  currentEnrollment: number;
  students: string[];
}

export interface SelectionSettings {
  zonasiMaxDistanceKm: number;
  prestasiMinScore: number;
  affirmationCategoriesAllowed: string[];
  totalQuota: number;
  quotaPerPath: Record<AdmissionPath, number>;
}
