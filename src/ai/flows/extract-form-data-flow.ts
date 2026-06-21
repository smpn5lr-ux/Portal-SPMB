
'use server';
/**
 * @fileOverview A Genkit flow for extracting student registration data from a manual form image.
 * 
 * ATURAN KETAT: AI dilarang menebak data. Jika tidak jelas, biarkan kosong (undefined).
 * Karakter di dalam kotak harus dibaca dengan sangat teliti.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractFormDataOutputSchema = z.object({
  fullName: z.string().optional().describe("Nama lengkap sesuai Akte Kelahiran. Baca kotak per kotak dengan teliti."),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional().describe("Jenis Kelamin"),
  NISN: z.string().optional().describe("10 digit Nomor Induk Siswa Nasional"),
  NIK: z.string().optional().describe("16 digit Nomor Induk Kependudukan Murid"),
  familyCardNumber: z.string().optional().describe("16 digit Nomor Kartu Keluarga"),
  birthPlace: z.string().optional().describe("Tempat lahir"),
  birthDate: z.string().optional().describe("Tanggal lahir format YYYY-MM-DD"),
  religion: z.string().optional().describe("Agama"),
  address: z.string().optional().describe("Alamat lengkap"),
  originSchool: z.string().optional().describe("Nama SD Asal"),
  parentName: z.string().optional().describe("Nama Orang Tua/Wali"),
  parentPhone: z.string().optional().describe("Nomor HP orang tua"),
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
    const mimeMatch = input.photoDataUri.match(/^data:([^;]+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        {
          text: `Tugas Anda adalah mengekstrak data dari formulir pendaftaran sekolah manual.
          
          ATURAN KETAT:
          1. JANGAN PERNAH MENEBAK. Jika tulisan tidak terbaca jelas 100%, biarkan kolom tersebut KOSONG.
          2. Baca Nama dalam kotak karakter dengan sangat teliti.
          3. Akurasi data jauh lebih penting daripada kelengkapan. 
          4. Untuk Agama, pilih salah satu: Katolik, Islam, Kristen, Hindu, Budha.`
        },
        {
          media: {
            url: input.photoDataUri,
            contentType: contentType
          }
        }
      ],
      output: { schema: ExtractFormDataOutputSchema },
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      }
    });
    return output!;
  }
);
