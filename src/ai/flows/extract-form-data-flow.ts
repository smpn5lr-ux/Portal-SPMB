
'use server';
/**
 * @fileOverview A Genkit flow for extracting student registration data from a manual form image.
 * 
 * ATURAN KETAT: AI dilarang menebak data. Jika tidak jelas atau meragukan, biarkan kosong (undefined).
 * Akurasi pembacaan karakter adalah prioritas utama.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractFormDataOutputSchema = z.object({
  fullName: z.string().optional().describe("Nama lengkap pendaftar. Baca karakter per kotak dengan sangat teliti."),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional().describe("Jenis Kelamin"),
  NISN: z.string().optional().describe("10 digit Nomor Induk Siswa Nasional"),
  NIK: z.string().optional().describe("16 digit Nomor Induk Kependudukan Murid"),
  familyCardNumber: z.string().optional().describe("16 digit Nomor Kartu Keluarga"),
  birthPlace: z.string().optional().describe("Tempat lahir"),
  birthDate: z.string().optional().describe("Tanggal lahir format YYYY-MM-DD"),
  religion: z.string().optional().describe("Agama"),
  address: z.string().optional().describe("Alamat lengkap"),
  originSchool: z.string().optional().describe("Nama sekolah asal (SD/MI)"),
  parentName: z.string().optional().describe("Nama Ayah atau Ibu Kandung"),
  parentPhone: z.string().optional().describe("Nomor HP orang tua yang aktif"),
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
          text: `Anda adalah pakar OCR yang sangat teliti. Tugas Anda adalah mengekstrak data dari formulir pendaftaran sekolah manual.
          
          ATURAN KRITIKAL:
          1. JANGAN PERNAH MENEBAK. Jika tulisan tangan buram, terpotong, atau meragukan, biarkan kolom tersebut KOSONG (undefined).
          2. Baca Nama dalam kotak karakter per kotak. Pastikan spasi antar kata terbaca dengan benar.
          3. Untuk Identitas Angka (NISN, NIK, KK): Jika ada satu digit pun yang tidak terbaca jelas, kosongkan seluruh kolom nomor tersebut.
          4. Agama harus dipilih dari: Islam, Kristen, Katolik, Hindu, Budha, Khonghucu.
          5. Tanggal lahir harus dalam format YYYY-MM-DD.
          
          Data yang tidak terbaca 100% jelas harus diabaikan demi integritas database.`
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
