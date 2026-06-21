
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
  NISN: z.string().optional().describe("10 digit Nomor Induk Siswa Nasional"),
  NIK: z.string().optional().describe("16 digit Nomor Induk Kependudukan Murid"),
  familyCardNumber: z.string().optional().describe("16 digit Nomor Kartu Keluarga"),
  birthPlace: z.string().optional().describe("Tempat lahir"),
  birthDate: z.string().optional().describe("Tanggal lahir format YYYY-MM-DD atau DD-MM-YYYY"),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional().describe("Jenis Kelamin"),
  religion: z.string().optional().describe("Agama (Islam, Kristen, dll)"),
  address: z.string().optional().describe("Alamat lengkap"),
  kelurahan: z.string().optional().describe("Kelurahan/Desa"),
  kecamatan: z.string().optional().describe("Kecamatan"),
  propinsi: z.string().optional().describe("Provinsi"),
  livingWith: z.string().optional().describe("Tinggal dengan (Orang Tua, Wali, dll)"),
  transportation: z.string().optional().describe("Alat transportasi ke sekolah"),
  childOrder: z.string().optional().describe("Anak ke berapa"),
  studentPhone: z.string().optional().describe("Nomor HP murid"),
  numberOfSiblings: z.string().optional().describe("Jumlah saudara kandung"),
  
  // Data Orang Tua (Lengkap Sesuai Gambar)
  fatherName: z.string().optional().describe("Nama Ayah Kandung"),
  fatherNIK: z.string().optional().describe("NIK Ayah"),
  fatherBirthYear: z.string().optional().describe("Tahun Lahir Ayah"),
  fatherEducation: z.string().optional().describe("Pendidikan Ayah (format: 01, Tidak Sekolah, dst)"),
  fatherOccupation: z.string().optional().describe("Pekerjaan Ayah (format: 01, Tidak bekerja, dst)"),
  fatherIncome: z.string().optional().describe("Penghasilan Ayah (format: 01, < Rp. 500,000, dst)"),
  
  motherName: z.string().optional().describe("Nama Ibu Kandung"),
  motherNIK: z.string().optional().describe("NIK Ibu"),
  motherBirthYear: z.string().optional().describe("Tahun Lahir Ibu"),
  motherEducation: z.string().optional().describe("Pendidikan Ibu (format: 01, Tidak Sekolah, dst)"),
  motherOccupation: z.string().optional().describe("Pekerjaan Ibu (format: 01, Tidak bekerja, dst)"),
  motherIncome: z.string().optional().describe("Penghasilan Ibu (format: 01, < Rp. 500,000, dst)"),
  
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
  originSchool: z.string().optional().describe("Nama sekolah asal (SD/MI)"),
  registrationType: z.enum(['Murid Baru', 'Mutasi', 'Mengulang']).optional().describe("Jenis pendaftaran"),
  ijazahSerialNumber: z.string().optional().describe("Nomor Seri Ijazah sebelumnya"),
  welfareType: z.string().optional().describe("Jenis kesejahteraan (PIP, PKH, KKS, KPS)"),
  welfareCardNumber: z.string().optional().describe("Nomor kartu kesejahteraan"),
  welfareCardName: z.string().optional().describe("Nama di kartu kesejahteraan"),
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
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are an expert OCR and school administration assistant. 
      Your task is to extract all student registration information from the provided image of a manual school registration form.
      
      The form follows the Indonesian Dapodik (Data Pokok Pendidikan) standard and includes sections for:
      1. Identitas Peserta Didik
      2. Data Alamat
      3. Data Orang Tua / Wali (Lengkap: Nama, NIK, Tahun Lahir, Pendidikan, Pekerjaan, Penghasilan)
      4. DATA PERIODIK
      5. KESEJAHTERAAN
      6. Registrasi

      Instructions:
      - Read the handwriting or printed text with high accuracy.
      - For "Pendidikan", "Pekerjaan", and "Penghasilan", look for checkmarks in the boxes.
      - Map the values carefully to the provided JSON schema.
      - Convert dates to YYYY-MM-DD format if possible.
      - Be extremely precise with ID numbers like NIK (16 digits) and NISN (10 digits).
      - For labels like Education/Occupation/Income, return the full text from the schema options if possible.

      Photo: {{media url=photoDataUri}}`,
      input: input,
      output: { schema: ExtractFormDataOutputSchema }
    });
    return output!;
  }
);
