import { Applicant, Classroom, AdmissionPath, VerificationStatus, AdmissionStatus } from './types';

const ADMISSION_PATHS: AdmissionPath[] = ['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua'];
const STATUSES: VerificationStatus[] = ['Belum Diverifikasi', 'Lengkap', 'Perlu Perbaikan', 'Ditolak'];
const ADMISSION: AdmissionStatus[] = ['accepted', 'waitlisted', 'rejected', 'pending'];

export const mockApplicants: Applicant[] = Array.from({ length: 45 }).map((_, i) => ({
  id: `app-${i + 1}`,
  registrationNumber: `REG-2024-${(i + 1).toString().padStart(4, '0')}`,
  NISN: `012345678${i}`,
  NIK: `320123456789000${i}`,
  fullName: i % 2 === 0 ? `Budi Santoso ${i}` : `Siti Aminah ${i}`,
  birthPlace: 'Jakarta',
  birthDate: '2012-05-15',
  gender: i % 2 === 0 ? 'Laki-laki' : 'Perempuan',
  religion: 'Islam',
  address: 'Jl. Merdeka No. ' + (i + 1),
  parentName: 'Orang Tua ' + i,
  parentPhone: '081234567890',
  originSchool: 'SDN Menteng 0' + (i % 5 + 1),
  familyCardNumber: '320123456789000' + i,
  applicationPath: ADMISSION_PATHS[i % 4],
  verificationStatus: STATUSES[i % 4],
  academicScore: 75 + (i % 25),
  distanceToSchoolKm: 0.5 + (i % 10) * 0.5,
  ageYears: 12 + (i % 2),
  admissionStatus: ADMISSION[i % 4],
  documents: [],
  createdAt: new Date().toISOString(),
}));

export const mockClasses: Classroom[] = [
  { id: 'c1', name: '7-A', gradeLevel: 7, homeroomTeacher: 'Drs. H. Mulyadi', capacity: 32, currentEnrollment: 0, students: [] },
  { id: 'c2', name: '7-B', gradeLevel: 7, homeroomTeacher: 'Siti Rahmawati, S.Pd', capacity: 32, currentEnrollment: 0, students: [] },
  { id: 'c3', name: '7-C', gradeLevel: 7, homeroomTeacher: 'Andi Wijaya, M.Pd', capacity: 32, currentEnrollment: 0, students: [] },
];
