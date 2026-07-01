
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
  aktaLahirNumber: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  gender: 'Laki-laki' | 'Perempuan';
  religion: string;
  address: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  propinsi: string;
  livingWith: 'Bersama Orang Tua' | 'Wali' | 'Asrama' | 'Kos';
  transportation: 'Jalan Kaki' | 'Motor' | 'Mobil' | 'Angkot/Kendaraan Umum';
  childOrder: number;
  numberOfSiblings: number;
  studentPhone: string;
  parentName: string; // Contact person
  parentPhone: string; // Contact phone
  originSchool: string;
  applicationPath: AdmissionPath;
  verificationStatus: VerificationStatus;
  admissionStatus: AdmissionStatus;
  createdAt: string;
  
  // Parent/Guardian Details
  fatherName?: string;
  fatherNIK?: string;
  motherName?: string;
  motherNIK?: string;
  guardianName?: string;
  guardianNIK?: string;
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
