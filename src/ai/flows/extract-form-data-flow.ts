
'use server';
/**
 * @fileOverview Flow Genkit untuk ekstraksi data formulir pendaftaran murid.
 * Menggunakan Gemini 1.5 Flash dengan instruksi anti-halusinasi yang sangat ketat.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractFormDataOutputSchema = z.object({
  fullName: z.string().optional().describe("Nama lengkap pendaftar. Hanya isi jika terbaca sangat jelas."),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional().describe("Jenis Kelamin"),
  NISN: z.string().optional().describe("10 digit NISN. JANGAN MENEBAK ANGKA YANG BURAM."),
  NIK: z.string().optional().describe("16 digit NIK Murid. JANGAN MENEBAK ANGKA YANG BURAM."),
  birthPlace: z.string().optional().describe("Tempat lahir"),
  birthDate: z.string().optional().describe("Tanggal lahir format YYYY-MM-DD"),
  originSchool: z.string().optional().describe("Nama sekolah asal"),
  parentName: z.string().optional().describe("Nama Orang Tua"),
  parentPhone: z.string().optional().describe("Nomor HP orang tua"),
});

const ExtractFormDataInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI foto formulir manual."),
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
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        {
          text: `Anda adalah asisten administrasi sekolah yang bertugas memindahkan data dari formulir kertas ke sistem digital.
          
          ATURAN KRITIKAL:
          1. AKURASI ADALAH PRIORITAS UTAMA.
          2. DILARANG KERAS MENEBAK (HALLUCINATION). Jika tulisan tangan buram, terpotong, atau meragukan, biarkan kolom tersebut KOSONG (undefined).
          3. Untuk Identitas Angka (NISN/NIK): Jika ada satu angka pun yang tidak terbaca 100% jelas, kosongkan seluruh kolom nomor tersebut.
          4. Baca Nama pendaftar dari kotak-kotak karakter dengan sangat teliti.
          5. Pastikan format Tanggal Lahir adalah YYYY-MM-DD.
          
          Integritas data jauh lebih penting daripada kelengkapan data hasil scan.`
        },
        {
          media: {
            url: input.photoDataUri,
            contentType: 'image/jpeg'
          }
        }
      ],
      output: { schema: ExtractFormDataOutputSchema }
    });
    return output!;
  }
);
