'use server';
/**
 * @fileOverview A Genkit flow for extracting student registration data from a manual form image.
 * 
 * This flow uses vision capabilities to read handwritten or printed school registration forms
 * and maps them to the Dapodik-compatible schema used in the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractFormDataOutputSchema = z.object({
  fullName: z.string().optional().describe("Nama lengkap sesuai Akte Kelahiran"),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional().describe("Jenis Kelamin"),
  NISN: z.string().optional().describe("10 digit Nomor Induk Siswa Nasional"),
  NIK: z.string().optional().describe("16 digit Nomor Induk Kependudukan Murid"),
  familyCardNumber: z.string().optional().describe("16 digit Nomor Kartu Keluarga"),
  aktaLahirNumber: z.string().optional().describe("Nomor Registrasi Akta Lahir"),
  birthPlace: z.string().optional().describe("Tempat lahir"),
  birthDate: z.string().optional().describe("Tanggal lahir format YYYY-MM-DD"),
  religion: z.string().optional().describe("Agama (Islam, Katolik, Kristen, dll)"),
  address: z.string().optional().describe("Alamat lengkap (Jalan/Kampung)"),
  rt: z.string().optional().describe("RT"),
  rw: z.string().optional().describe("RW"),
  kelurahan: z.string().optional().describe("Kelurahan/Desa"),
  kecamatan: z.string().optional().describe("Kecamatan"),
  propinsi: z.string().optional().describe("Provinsi"),
  livingWith: z.enum(['Bersama Orang Tua', 'Wali', 'Asrama', 'Kos']).optional().describe("Pilihan Tempat Tinggal"),
  transportation: z.enum(['Jalan Kaki', 'Motor', 'Mobil', 'Angkot/Kendaraan Umum']).optional().describe("Moda Transportasi"),
  childOrder: z.string().optional().describe("Anak ke berapa"),
  studentPhone: z.string().optional().describe("Nomor HP murid"),
  numberOfSiblings: z.string().optional().describe("Jumlah saudara kandung"),
  
  // Data Sekolah Asal
  originSchool: z.string().optional().describe("Nama SD Asal"),
  originSchoolAddress: z.string().optional().describe("Alamat Sekolah Asal"),
  originSchoolKelurahan: z.string().optional().describe("Kelurahan Sekolah Asal"),
  originSchoolKecamatan: z.string().optional().describe("Kecamatan Sekolah Asal"),
  originSchoolProvinsi: z.string().optional().describe("Provinsi Sekolah Asal"),
  usParticipantNumber: z.string().optional().describe("Nomor Peserta US sesuai Ijazah/SKL"),
  ijazahSerialNumber: z.string().optional().describe("Nomor Seri Ijazah"),

  // Data Orang Tua
  fatherName: z.string().optional().describe("Nama Ayah Kandung"),
  fatherNIK: z.string().optional().describe("NIK Ayah (16 digit)"),
  fatherBirthYear: z.string().optional().describe("Tahun Lahir Ayah (4 digit)"),
  fatherEducation: z.string().optional().describe("Pendidikan Ayah"),
  fatherOccupation: z.string().optional().describe("Pekerjaan Ayah"),
  fatherIncome: z.string().optional().describe("Penghasilan Ayah"),
  
  motherName: z.string().optional().describe("Nama Ibu Kandung"),
  motherNIK: z.string().optional().describe("NIK Ibu (16 digit)"),
  motherBirthYear: z.string().optional().describe("Tahun Lahir Ibu (4 digit)"),
  motherEducation: z.string().optional().describe("Pendidikan Ibu"),
  motherOccupation: z.string().optional().describe("Pekerjaan Ibu"),
  motherIncome: z.string().optional().describe("Penghasilan Ibu"),
  
  guardianName: z.string().optional().describe("Nama Wali"),
  guardianNIK: z.string().optional().describe("NIK Wali"),
  guardianBirthYear: z.string().optional().describe("Tahun Lahir Wali"),
  guardianEducation: z.string().optional().describe("Pendidikan Wali"),
  guardianOccupation: z.string().optional().describe("Pekerjaan Wali"),
  guardianIncome: z.string().optional().describe("Penghasilan Wali"),
  
  parentPhone: z.string().optional().describe("Nomor HP orang tua/wali"),
  parentEmail: z.string().optional().describe("Email orang tua/wali"),
  heightCm: z.string().optional().describe("Tinggi badan dalam cm"),
  weightKg: z.string().optional().describe("Berat badan dalam kg"),
  distanceToSchoolKm: z.string().optional().describe("Jarak tempuh ke sekolah dalam km"),
  travelTimeMinutes: z.string().optional().describe("Waktu tempuh ke sekolah dalam menit"),
  registrationType: z.enum(['Murid Baru', 'Mutasi', 'Mengulang']).optional().describe("Jenis pendaftaran"),
});

const ExtractFormDataInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the manual registration form, as a data URI."),
});

export async function extractFormData(input: { photoDataUri: string }) {
  return extractFormDataFlow(input);
}

const extractFormDataFlow = ai.defineFlow(
  {
    name: 'extractFormDataFlow',
    inputSchema: ExtractFormDataInputSchema,
    outputSchema: ExtractFormDataOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Anda adalah pakar Administrasi Sekolah dan OCR (Optical Character Recognition).
      Tugas Anda adalah mengekstrak data dari gambar formulir pendaftaran sekolah manual.

      PENTING:
      - Baca setiap bagian dengan teliti, terutama teks dalam kotak per-karakter.
      - Jika ada teks yang terlihat JELAS (seperti Nama atau NISN), pastikan Anda mengekstraknya.
      - JANGAN menyerah jika hanya sebagian data yang tidak jelas. Ambil semua data yang BISA dibaca.
      - Identifikasi spasi pada nama yang tertulis dalam kotak (kotak kosong = spasi).
      - Untuk checkbox atau pilihan, identifikasi tanda silang (X) atau centang (V).

      Photo: {{media url=photoDataUri}}`,
      input: input,
      output: { schema: ExtractFormDataOutputSchema },
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ]
      }
    });
    return output!;
  }
);