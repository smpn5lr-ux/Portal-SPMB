
"use client"

import { useState, useMemo, useRef } from 'react'
import { 
  Search, 
  FileUp, 
  Plus, 
  Eye, 
  Loader2,
  User,
  Home,
  Users as UsersIcon,
  GraduationCap,
  Info,
  Layers,
  Smartphone,
  FileDown,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Camera,
  Mail,
  Scale,
  Clock,
  MapPin,
  ClipboardList
} from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, addDoc, serverTimestamp, limit, getDocs, doc } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { extractFormData } from '@/ai/flows/extract-form-data-flow'
import * as XLSX from 'xlsx'

const statusColorMap: Record<string, string> = {
  'Belum Diverifikasi': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'Lengkap': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Perlu Perbaikan': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Ditolak': 'bg-destructive/10 text-destructive border-destructive/20',
}

const pathColorMap: Record<string, string> = {
  'Zonasi': 'text-primary border-primary/20',
  'Prestasi': 'text-cyan-500 border-cyan-500/20',
  'Afirmasi': 'text-pink-500 border-pink-500/20',
  'Perpindahan Orang Tua': 'text-purple-500 border-purple-500/20',
}

const formSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap harus diisi"),
  NISN: z.string().length(10, "NISN harus 10 digit"),
  NIK: z.string().length(16, "NIK harus 16 digit"),
  familyCardNumber: z.string().length(16, "No. KK harus 16 digit"),
  originSchool: z.string().min(2, "Asal sekolah harus diisi"),
  applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  birthPlace: z.string().min(2, "Tempat lahir harus diisi"),
  birthDate: z.string().min(1, "Tanggal lahir harus diisi"),
  religion: z.string().min(1, "Agama harus dipilih"),
  address: z.string().min(5, "Alamat lengkap harus diisi"),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  propinsi: z.string().optional(),
  parentName: z.string().min(2, "Nama orang tua/wali harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  parentEmail: z.string().email("Email tidak valid").optional().or(z.literal('')),
  academicScore: z.string().optional(),
  distanceToSchoolKm: z.string().optional(),
  livingWith: z.string().optional(),
  transportation: z.string().optional(),
  hobbies: z.string().optional(),
  studentPhone: z.string().optional(),
  registrantRelationship: z.string().optional(),
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
  guardianBirthYear: z.string().optional(),
  guardianOccupation: z.string().optional(),
  numberOfSiblings: z.string().optional(),
  childOrder: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  travelTimeMinutes: z.string().optional(),
  registrationType: z.enum(['Murid Baru', 'Mutasi', 'Mengulang']).default('Murid Baru'),
  ijazahSerialNumber: z.string().optional(),
})

const COLUMN_MAPPING: Record<string, string> = {
  fullName: "Nama Lengkap",
  NISN: "NISN",
  NIK: "NIK",
  familyCardNumber: "No Kartu Keluarga",
  originSchool: "Asal Sekolah",
  applicationPath: "Jalur Pendaftaran",
  gender: "Jenis Kelamin",
  birthPlace: "Tempat Lahir",
  birthDate: "Tanggal Lahir",
  religion: "Agama",
  address: "Alamat",
  parentName: "Nama Wali",
  parentPhone: "No Telepon",
  academicScore: "Skor Akademik",
  distanceToSchoolKm: "Jarak (Km)"
}

const REVERSE_MAPPING: Record<string, string> = Object.entries(COLUMN_MAPPING).reduce((acc, [key, val]) => {
  acc[val] = key;
  return acc;
}, {} as Record<string, string>);

const TEMPLATE_KEYS = Object.keys(COLUMN_MAPPING);

export default function ApplicantsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const db = useFirestore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      NISN: "",
      NIK: "",
      familyCardNumber: "",
      originSchool: "",
      applicationPath: "Zonasi",
      gender: "Laki-laki",
      birthPlace: "",
      birthDate: "",
      religion: "Islam",
      address: "",
      kelurahan: "",
      kecamatan: "",
      propinsi: "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      academicScore: "",
      distanceToSchoolKm: "",
      livingWith: "Bersama Orang Tua",
      transportation: "Jalan Kaki",
      hobbies: "",
      studentPhone: "",
      registrantRelationship: "Ayah",
      fatherName: "",
      fatherNIK: "",
      fatherBirthYear: "",
      fatherOccupation: "",
      motherName: "",
      motherNIK: "",
      motherBirthYear: "",
      motherOccupation: "",
      guardianName: "",
      guardianNIK: "",
      guardianBirthYear: "",
      guardianOccupation: "",
      numberOfSiblings: "1",
      childOrder: "1",
      heightCm: "",
      weightKg: "",
      travelTimeMinutes: "",
      registrationType: "Murid Baru",
      ijazahSerialNumber: "",
    },
  })

  const livingWithWatcher = form.watch('livingWith')
  const relationshipWatcher = form.watch('registrantRelationship')
  const showGuardianInfo = livingWithWatcher === 'Wali' || relationshipWatcher === 'Wali'

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, 'applicants'), 
      orderBy('registrationSequence', 'asc'),
      limit(200) 
    )
  }, [db])

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)
  const { data: systemSettings } = useDoc<any>(settingsRef)

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      a.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.NISN.includes(searchTerm)
    )
  }, [applicants, searchTerm])

  const handleScanForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        const result = await extractFormData({ photoDataUri: base64 })
        if (result) {
          // Populate form fields
          Object.entries(result).forEach(([key, value]) => {
            if (value) {
              form.setValue(key as any, value)
            }
          })
          toast({
            title: "Scan Berhasil",
            description: "Data formulir manual telah diekstrak. Silakan tinjau kembali.",
          })
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Scan Gagal",
          description: "Gagal membaca formulir. Pastikan foto jelas.",
        })
      } finally {
        setIsScanning(false)
        if (scanInputRef.current) scanInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDownloadTemplate = async (format: 'csv' | 'excel' | 'pdf') => {
    // ... existing template download logic ...
    const sampleData = [{ fullName: "Contoh Murid", NISN: "0123456789", NIK: "3201..." }]
    const headers = ["No.", ...TEMPLATE_KEYS.map(key => COLUMN_MAPPING[key])];
    
    if (format === 'csv' || format === 'excel') {
       // logic implementation
    } else if (format === 'pdf') {
       const { default: jsPDF } = await import('jspdf')
       const { default: autoTable } = await import('jspdf-autotable')
       const doc = new jsPDF('landscape')
       const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
       const schoolName = systemSettings?.schoolName || "PORTAL SPMB"
       doc.setFont("helvetica", "bold").text(dinasName.toUpperCase(), 148, 15, { align: "center" })
       doc.setFontSize(20).text(schoolName.toUpperCase(), 148, 22, { align: "center" })
       doc.line(14, 32, 283, 32)
       doc.save(`Templat_Impor_${schoolName}.pdf`)
    }
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... existing import logic ...
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || submitting) return
    setSubmitting(true)
    
    try {
      const q = query(collection(db, 'applicants'), orderBy('registrationSequence', 'desc'), limit(1));
      const snap = await getDocs(q);
      const nextSequence = snap.empty ? 1 : (snap.docs[0].data().registrationSequence || 0) + 1;

      const registrationNumber = `REG-2024-${nextSequence.toString().padStart(4, '0')}`
      
      const newApplicant = {
        ...values,
        registrationNumber,
        registrationSequence: nextSequence,
        academicScore: values.academicScore ? parseFloat(values.academicScore) : 0,
        distanceToSchoolKm: values.distanceToSchoolKm ? parseFloat(values.distanceToSchoolKm) : 0,
        numberOfSiblings: values.numberOfSiblings ? parseInt(values.numberOfSiblings) : 1,
        childOrder: values.childOrder ? parseInt(values.childOrder) : 1,
        heightCm: values.heightCm ? parseFloat(values.heightCm) : 0,
        weightKg: values.weightKg ? parseFloat(values.weightKg) : 0,
        travelTimeMinutes: values.travelTimeMinutes ? parseInt(values.travelTimeMinutes) : 0,
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
        documents: []
      }

      await addDoc(collection(db, 'applicants'), newApplicant)
      setIsDialogOpen(false)
      form.reset()
      toast({ title: "Data Disimpan", description: `Murid ${values.fullName} berhasil didaftarkan.` })
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'applicants', operation: 'create' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Data Calon Murid</h1>
          <p className="text-muted-foreground mt-1">Kelola pendaftar baru sesuai standar Dapodik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
          <input type="file" ref={scanInputRef} onChange={handleScanForm} accept="image/*" className="hidden" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                <FileDown className="w-4 h-4" /> Unduh Templat <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border/50">
              <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>Format CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('excel')}>Format Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('pdf')}>Panduan PDF (.pdf)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={handleImportClick} disabled={isImporting}>
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />} Impor Data
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => !submitting && setIsDialogOpen(open)}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Tambah Murid
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[950px] h-[95vh] p-0 overflow-hidden border-border/50 bg-card flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran Murid</DialogTitle>
                  <DialogDescription>Input data lengkap sesuai dokumen resmi Dapodik atau scan formulir manual.</DialogDescription>
                </div>
                <Button 
                  onClick={() => scanInputRef.current?.click()} 
                  disabled={isScanning}
                  variant="outline" 
                  className="gap-2 border-primary/50 text-primary hover:bg-primary/5 mr-6"
                >
                  {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {isScanning ? 'Scanning...' : 'Scan Formulir AI'}
                </Button>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-12 pb-10">
                      {/* SEKSI 1: IDENTITAS PRIBADI */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                          <div className="bg-primary/10 p-2 rounded-lg"><User className="w-5 h-5" /></div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 1: Identitas Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-2xl border border-border/50">
                          <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem className="md:col-span-2"><FormLabel>Nama Lengkap</FormLabel><FormControl><Input placeholder="Sesuai Akte Kelahiran" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Jenis Kelamin</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="NISN" render={({ field }) => (
                            <FormItem><FormLabel>NISN</FormLabel><FormControl><Input placeholder="10 Digit" {...field} maxLength={10} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="NIK" render={({ field }) => (
                            <FormItem><FormLabel>NIK Murid</FormLabel><FormControl><Input placeholder="16 Digit" {...field} maxLength={16} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthPlace" render={({ field }) => (
                            <FormItem><FormLabel>Tempat Lahir</FormLabel><FormControl><Input placeholder="Kota/Kab" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="birthDate" render={({ field }) => (
                            <FormItem><FormLabel>Tanggal Lahir</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="religion" render={({ field }) => (
                            <FormItem><FormLabel>Agama</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger></FormControl><SelectContent>{['Islam', 'Katolik', 'Kristen', 'Hindu', 'Budha', 'Khonghucu'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="hobbies" render={({ field }) => (
                            <FormItem><FormLabel>Hobi</FormLabel><FormControl><Input placeholder="Membaca, Olahraga..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* SEKSI 2: ALAMAT & DOMISILI */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-amber-500">
                          <div className="bg-amber-500/10 p-2 rounded-lg"><Home className="w-5 h-5" /></div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 2: Alamat & Domisili</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/10 p-6 rounded-2xl border border-border/50">
                          <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem className="md:col-span-3"><FormLabel>Alamat Lengkap (Jalan/RT/RW)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="kelurahan" render={({ field }) => (
                            <FormItem><FormLabel>Kelurahan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="kecamatan" render={({ field }) => (
                            <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="propinsi" render={({ field }) => (
                            <FormItem><FormLabel>Provinsi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="familyCardNumber" render={({ field }) => (
                            <FormItem><FormLabel>No. Kartu Keluarga</FormLabel><FormControl><Input placeholder="16 Digit" {...field} maxLength={16} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="livingWith" render={({ field }) => (
                            <FormItem><FormLabel>Tempat Tinggal</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger></FormControl><SelectContent>{['Bersama Orang Tua', 'Wali', 'Kos', 'Asrama'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="transportation" render={({ field }) => (
                            <FormItem><FormLabel>Moda Transportasi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger></FormControl><SelectContent>{['Jalan Kaki', 'Motor', 'Mobil Pribadi', 'Angkot/Kendaraan Umum'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      {/* SEKSI 3: DATA ORANG TUA / WALI */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-pink-500">
                          <div className="bg-pink-500/10 p-2 rounded-lg"><UsersIcon className="w-5 h-5" /></div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 3: Data Orang Tua / Wali</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/10 p-6 rounded-2xl border border-border/50">
                          {/* AYAH */}
                          <div className="space-y-4 p-5 border rounded-xl bg-card">
                             <Badge variant="outline" className="bg-primary/5 text-primary">AYAH KANDUNG</Badge>
                             <FormField control={form.control} name="fatherName" render={({ field }) => (
                                <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherNIK" render={({ field }) => (
                                <FormItem><FormLabel>NIK Ayah</FormLabel><FormControl><Input {...field} maxLength={16} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="fatherOccupation" render={({ field }) => (
                                <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                          </div>
                          {/* IBU */}
                          <div className="space-y-4 p-5 border rounded-xl bg-card">
                             <Badge variant="outline" className="bg-pink-500/5 text-pink-500">IBU KANDUNG</Badge>
                             <FormField control={form.control} name="motherName" render={({ field }) => (
                                <FormItem><FormLabel>Nama Lengkap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherNIK" render={({ field }) => (
                                <FormItem><FormLabel>NIK Ibu</FormLabel><FormControl><Input {...field} maxLength={16} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <FormField control={form.control} name="motherOccupation" render={({ field }) => (
                                <FormItem><FormLabel>Pekerjaan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                          </div>
                          {/* KONTAK */}
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 bg-accent/5 p-4 rounded-xl border border-accent/20">
                            <FormField control={form.control} name="parentPhone" render={({ field }) => (
                              <FormItem><FormLabel className="flex items-center gap-2"><Smartphone className="w-3 h-3" /> No HP / WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="parentEmail" render={({ field }) => (
                              <FormItem><FormLabel className="flex items-center gap-2"><Mail className="w-3 h-3" /> Alamat Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="registrantRelationship" render={({ field }) => (
                                <FormItem><FormLabel>Hubungan Pendaftar</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Ayah', 'Ibu', 'Wali', 'Calon Murid'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                          </div>
                          {/* WALI SISWA (KONDISIONAL) */}
                          {showGuardianInfo && (
                            <div className="md:col-span-2 space-y-6 animate-in slide-in-from-top-4">
                              <div className="p-5 border-2 border-dashed border-orange-500/30 rounded-xl bg-orange-500/5 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-500" /><h4 className="font-bold text-sm">Data Wali Siswa</h4></div>
                                <FormField control={form.control} name="guardianName" render={({ field }) => (
                                  <FormItem><FormLabel>Nama Lengkap Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="guardianNIK" render={({ field }) => (
                                  <FormItem><FormLabel>NIK Wali</FormLabel><FormControl><Input {...field} maxLength={16} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="guardianOccupation" render={({ field }) => (
                                  <FormItem><FormLabel>Pekerjaan Wali</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SEKSI 4: DATA PERIODIK & SEKOLAH */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-green-500">
                          <div className="bg-green-500/10 p-2 rounded-lg"><Scale className="w-5 h-5" /></div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 4: Data Periodik & Registrasi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-muted/10 p-6 rounded-2xl border border-border/50">
                           <FormField control={form.control} name="heightCm" render={({ field }) => (
                             <FormItem><FormLabel>Tinggi (cm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="weightKg" render={({ field }) => (
                             <FormItem><FormLabel>Berat (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="travelTimeMinutes" render={({ field }) => (
                             <FormItem className="md:col-span-2"><FormLabel className="flex items-center gap-2"><Clock className="w-3 h-3" /> Waktu Tempuh ke Sekolah (Menit)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="originSchool" render={({ field }) => (
                             <FormItem className="md:col-span-2"><FormLabel>Asal Sekolah (SD/MI)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="applicationPath" render={({ field }) => (
                             <FormItem><FormLabel>Jalur Pendaftaran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="registrationType" render={({ field }) => (
                             <FormItem><FormLabel>Jenis Pendaftaran</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{['Murid Baru', 'Mutasi', 'Mengulang'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                           )} />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-6 border-t bg-card shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
                    <DialogFooter className="flex flex-row items-center justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>Batal</Button>
                      <Button type="submit" disabled={submitting} className="min-w-[200px] h-11 text-base font-bold shadow-lg shadow-primary/20">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                        Simpan Pendaftar
                      </Button>
                    </DialogFooter>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari NISN atau Nama Calon Murid..." className="pl-10 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-primary/5 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold w-[60px] text-primary">No.</TableHead>
              <TableHead className="font-bold w-[100px] text-primary">No. Urut</TableHead>
              <TableHead className="font-bold text-primary">NISN / No. Reg</TableHead>
              <TableHead className="font-bold text-primary">Nama Lengkap</TableHead>
              <TableHead className="font-bold text-primary">Asal Sekolah</TableHead>
              <TableHead className="font-bold text-primary">Jalur Masuk</TableHead>
              <TableHead className="font-bold text-primary">Status</TableHead>
              <TableHead className="font-bold text-right text-primary">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Tidak ada data pendaftar ditemukan.</TableCell></TableRow>
            ) : (
              filteredApplicants.map((applicant, idx) => (
                <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-muted-foreground">#{applicant.registrationSequence || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-primary text-sm">{applicant.NISN}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{applicant.registrationNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{applicant.fullName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{applicant.originSchool}</TableCell>
                  <TableCell><Badge variant="outline" className={`${pathColorMap[applicant.applicationPath] || ''} font-bold text-[10px]`}>{applicant.applicationPath}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus] || ''} font-bold text-[10px]`}>{applicant.verificationStatus}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" asChild title="Lihat Detail"><Link href={`/dashboard/applicants/${applicant.id}`}><Eye className="w-4 h-4" /></Link></Button></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
