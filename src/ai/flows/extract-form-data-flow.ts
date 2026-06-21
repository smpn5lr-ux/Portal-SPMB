
'use server';
/**
 * @fileOverview A Genkit flow for extracting student registration data from a manual form image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractFormDataInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the manual registration form, as a data URI."),
});

const ExtractFormDataOutputSchema = z.object({
  fullName: z.string().optional(),
  NISN: z.string().optional(),
  NIK: z.string().optional(),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  propinsi: z.string().optional(),
  familyCardNumber: z.string().optional(),
  livingWith: z.string().optional(),
  transportation: z.string().optional(),
  childOrder: z.string().optional(),
  studentPhone: z.string().optional(),
  numberOfSiblings: z.string().optional(),
  fatherName: z.string().optional(),
  fatherNIK: z.string().optional(),
  fatherBirthYear: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherNIK: z.string().optional(),
  motherBirthYear: z.string().optional(),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  guardianNIK: z.string().optional(),
  guardianOccupation: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  travelTimeMinutes: z.string().optional(),
  originSchool: z.string().optional(),
  registrationType: z.string().optional(),
  ijazahSerialNumber: z.string().optional(),
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
      prompt: `Extract data from this manual school registration form. 
      Return the data in a structured JSON format according to the output schema.
      If a field is not clear, leave it empty.
      Look specifically for:
      - Student Personal Identity (Name, NISN, NIK, Birth info)
      - Address details (Kecamatan, Propinsi, Kelurahan)
      - Parent info (Father, Mother, Guardian)
      - Periodic data (Height, Weight)
      - Registration details.
      Photo: {{media url=photoDataUri}}`,
      input: input,
      output: { schema: ExtractFormDataOutputSchema }
    });
    return output!;
  }
);
