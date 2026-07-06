
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-admission-justification.ts';
import '@/ai/flows/extract-form-data-flow.ts';
import '@/ai/flows/extract-from-file-flow.ts';
