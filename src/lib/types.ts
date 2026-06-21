
export type AdmissionPath = 'Zonasi' | 'Prestasi' | 'Afirmasi' | 'Perpindahan Orang Tua';

export type VerificationStatus = 'Belum Diverifikasi' | 'Lengkap' | 'Perlu Perbaikan' | 'Ditolak';

export type AdmissionStatus = 'accepted' | 'waitlisted' | 'rejected' | 'pending';

export type EducationLevel = 'Tidak Sekolah' | 'SD' | 'SMP' | 'SMA' | 'DIII' | 'S1' | 'S2' | 'S3';
export type OccupationType = 'Tidak Bekerja' | 'Petani/Nelayan' | 'ASN' | 'Peg. Swasta' | 'Pengusaha' | 'Pensiun';
export type IncomeRange = '< RP.500.000' | 'RP.500.000-1.000.000' | 'RP.1.000.000-3.000.000' | 'RP.4.000.000-5.000.000' | '> RP.5.000.000';

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
  kelurahan?: string;
  kecamatan?: string;
  propinsi?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
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
  
  // Bidang Tambahan Dapodik & Periodik
  livingWith?: string;
  transportation?: string;
  hobbies?: string;
  studentPhone?: string;
  numberOfSiblings?: number;
  childOrder?: number;
  heightCm?: number;
  weightKg?: number;
  travelTimeMinutes?: number;
  welfareType?: string;
  welfareCardNumber?: string;
  welfareCardName?: string;
  
  // Registrasi Khusus
  registrationType?: 'Murid Baru' | 'Mutasi' | 'Mengulang';
  NIPD?: string;
  registrationDate?: string;
  usParticipantNumber?: string;
  ijazahSerialNumber?: string;
  
  // Detail Orang Tua & Wali
  fatherName?: string;
  fatherNIK?: string;
  fatherBirthYear?: string;
  fatherEducation?: EducationLevel;
  fatherOccupation?: OccupationType;
  fatherIncome?: IncomeRange;
  
  motherName?: string;
  motherNIK?: string;
  motherBirthYear?: string;
  motherEducation?: EducationLevel;
  motherOccupation?: OccupationType;
  motherIncome?: IncomeRange;
  
  guardianName?: string;
  guardianNIK?: string;
  guardianBirthYear?: string;
  guardianEducation?: EducationLevel;
  guardianOccupation?: OccupationType;
  guardianIncome?: IncomeRange;
  registrantRelationship?: string;
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
