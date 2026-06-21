
export type AdmissionPath = 'Zonasi' | 'Prestasi' | 'Afirmasi' | 'Perpindahan Orang Tua';
export type VerificationStatus = 'Belum Diverifikasi' | 'Lengkap' | 'Perlu Perbaikan' | 'Ditolak';
export type AdmissionStatus = 'accepted' | 'waitlisted' | 'rejected' | 'pending';

export interface Applicant {
  id: string;
  registrationNumber: string;
  registrationSequence: number;
  NISN: string;
  NIK: string;
  familyCardNumber: string;
  aktaLahirNumber?: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  address: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  parentName: string;
  parentPhone: string;
  originSchool: string;
  applicationPath: AdmissionPath;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  academicScore?: number;
  distanceToSchoolKm?: number;
  ageYears?: number;
  admissionStatus: AdmissionStatus;
  createdAt: string;
  
  // Dapodik Fields
  livingWith?: 'Bersama Orang Tua' | 'Wali' | 'Asrama' | 'Kos';
  transportation?: 'Jalan Kaki' | 'Motor' | 'Mobil' | 'Angkot/Kendaraan Umum';
  fatherName?: string;
  motherName?: string;
  ijazahSerialNumber?: string;
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
