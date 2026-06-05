# **App Name**: EduEnroll Pro

## Core Features:

- Live Institutional Dashboard: Visual overview of applicant statistics, selection paths (Zonasi, Prestasi), and real-time seat availability across all rombels.
- Unified Student Vault: Comprehensive CRUD system for applicant data utilizing Firestore for real-time synchronization with NISN, parent info, and document storage.
- Dapodik Porter Engine: Bulk import/export utility supporting Excel and CSV formats mapped directly to Dapodik schema requirements.
- AI Selection Decision Tool: An AI-powered reasoning tool that analyzes multiple variables (distance, grades, and age) to suggest optimal rankings and justify student placement in specific selection tracks.
- Intelligent Class Distributor: Algorithmic shuffling of accepted students into classrooms based on balanced parameters such as gender, origin school, and academic distribution.
- Secure Multi-Role Access Control: Robust authentication and RBAC for Super Admins, Operators, and Principals to manage verification workflows and logs.
- Dynamic QR Report Generator: Automated generation of PDF registration proofs featuring unique QR codes for instant verification by staff.

## Style Guidelines:

- Primary Color: Modern Cobalt (#4361EE) representing academic stability and professionalism.
- Background: A deep, midnight-toned Slate (#0E1117) to provide a sophisticated dark mode environment for data-heavy administrative tasks.
- Accent Color: Vibrant Cyan (#00B4D8) used for secondary UI elements, highlights, and status indicators.
- Font pairing: 'Space Grotesk' for a high-tech, precise header style, paired with 'Inter' for body text to maintain optimal readability for data tables and long lists.
- Sharp, 2px stroke linear icons for a refined and clean look, categorized by status (e.g., success, pending, warning) using consistent semantic colors.
- Modular bento-grid dashboard layout designed for clarity, allowing high density of statistical widgets without clutter.
- Subtle, low-latency transitions between navigation states and micro-interactions for list-filtering updates.