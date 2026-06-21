
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
  ChevronDown
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
  parentName: z.string().min(2, "Nama orang tua/wali harus diisi"),
  parentPhone: z.string().min(10, "No. Telepon minimal 10 digit"),
  academicScore: z.string().optional(),
  distanceToSchoolKm: z.string().optional(),
  livingWith: z.string().optional(),
  transportation: z.string().optional(),
  hobbies: z.string().optional(),
  registrantRelationship: z.string().optional(),
  fatherName: z.string().optional(),
  fatherNIK: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().optional(),
  motherNIK: z.string().optional(),
  motherOccupation: z.string().optional(),
  numberOfSiblings: z.string().optional(),
  childOrder: z.string().optional(),
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
  distanceToSchoolKm: "Jarak (Km)",
  livingWith: "Tinggal Dengan",
  transportation: "Transportasi",
  hobbies: "Hobi",
  registrantRelationship: "Hubungan Pendaftar",
  fatherName: "Nama Ayah",
  fatherNIK: "NIK Ayah",
  fatherOccupation: "Pekerjaan Ayah",
  motherName: "Nama Ibu",
  motherNIK: "NIK Ibu",
  motherOccupation: "Pekerjaan Ibu",
  numberOfSiblings: "Jumlah Saudara",
  childOrder: "Anak Ke"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      parentName: "",
      parentPhone: "",
      academicScore: "",
      distanceToSchoolKm: "",
      livingWith: "",
      transportation: "",
      hobbies: "",
      registrantRelationship: "",
      fatherName: "",
      fatherNIK: "",
      fatherOccupation: "",
      motherName: "",
      motherNIK: "",
      motherOccupation: "",
      numberOfSiblings: "",
      childOrder: "",
    },
  })

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

  function calculateAge(birthDate: string): number {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    if (isNaN(birth.getTime())) return 0
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const handleDownloadTemplate = async (format: 'csv' | 'excel' | 'pdf') => {
    const sampleData = [
      {
        fullName: "Budi Santoso",
        NISN: "0123456789",
        NIK: "3201234567890001",
        familyCardNumber: "3201234567890002",
        originSchool: "SDN Menteng 01",
        applicationPath: "Zonasi",
        gender: "Laki-laki",
        birthPlace: "Jakarta",
        birthDate: "2012-05-15",
        religion: "Islam",
        address: "Jl. Merdeka No. 10",
        parentName: "Agus Santoso",
        parentPhone: "081234567890",
        academicScore: "85.5",
        distanceToSchoolKm: "1.2",
        livingWith: "Bersama Orang Tua",
        transportation: "Jalan Kaki",
        hobbies: "Membaca",
        registrantRelationship: "Ayah",
        fatherName: "Agus Santoso",
        fatherNIK: "3201234567890003",
        fatherOccupation: "Karyawan Swasta",
        motherName: "Siti Aminah",
        motherNIK: "3201234567890004",
        motherOccupation: "Ibu Rumah Tangga",
        numberOfSiblings: "2",
        childOrder: "1"
      }
    ]

    const headers = ["No.", ...TEMPLATE_KEYS.map(key => COLUMN_MAPPING[key])];

    if (format === 'csv') {
      const csvContent = [
        headers.join(","),
        ...sampleData.map((row, idx) => [idx + 1, ...TEMPLATE_KEYS.map(key => `"${(row as any)[key] || ""}"`)].join(","))
      ].join("\n")
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "Templat_Impor_Murid.csv")
      link.click()
    } else if (format === 'excel') {
      const mappedData = sampleData.map((row, idx) => {
        const newRow: any = { "No.": idx + 1 };
        TEMPLATE_KEYS.forEach(key => {
          newRow[COLUMN_MAPPING[key]] = (row as any)[key];
        });
        return newRow;
      });
      const worksheet = XLSX.utils.json_to_sheet(mappedData, { header: headers })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Templat Impor")
      XLSX.writeFile(workbook, "Templat_Impor_Murid.xlsx")
    } else if (format === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF('landscape')
      
      const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
      const schoolName = systemSettings?.schoolName || "PORTAL SPMB"
      const npsn = systemSettings?.npsn || "-"
      const academicYear = systemSettings?.academicYear || "2024/2025"

      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.text(dinasName.toUpperCase(), 148, 15, { align: "center" })
      
      doc.setFontSize(20)
      doc.text(schoolName.toUpperCase(), 148, 22, { align: "center" })
      
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`NPSN: ${npsn} | Tahun Ajaran ${academicYear}`, 148, 28, { align: "center" })
      doc.setLineWidth(0.5)
      doc.line(14, 32, 283, 32)
      doc.setLineWidth(0.1)
      doc.line(14, 33, 283, 33)

      doc.setFontSize(14)
      doc.setTextColor(67, 97, 238)
      doc.setFont("helvetica", "bold")
      doc.text("PANDUAN TEMPLAT IMPOR DATA CALON MURID", 148, 42, { align: "center" })
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.setFont("helvetica", "normal")
      doc.text("Gunakan kolom-kolom berikut dalam file CSV atau Excel Anda agar sistem dapat membaca data dengan baik.", 14, 50)
      
      const tableBody = TEMPLATE_KEYS.map(col => [
        COLUMN_MAPPING[col], 
        "Teks/Angka", 
        ["fullName", "NISN", "NIK", "birthDate"].includes(col) ? "Wajib" : "Opsional"
      ])
      
      autoTable(doc, {
        head: [['Nama Kolom', 'Tipe Data', 'Status']],
        body: tableBody,
        startY: 57,
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { 
          fillColor: [67, 97, 238],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 80, halign: 'center' },
          2: { cellWidth: 60, halign: 'center' }
        }
      })
      doc.save(`Panduan_Templat_Impor_Murid_${schoolName.replace(/\s+/g, '_')}.pdf`)
    }
    
    toast({
      title: "Templat Diunduh",
      description: `Contoh templat format ${format.toUpperCase()} berhasil diunduh.`,
    })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !db) return

    setIsImporting(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const dataBuffer = event.target?.result
        if (!dataBuffer) return

        const workbook = XLSX.read(dataBuffer, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          toast({ variant: "destructive", title: "File Kosong", description: "Tidak ada data pendaftar dalam file." })
          setIsImporting(false)
          return
        }

        const q = query(collection(db, 'applicants'), orderBy('registrationSequence', 'desc'), limit(1));
        const snap = await getDocs(q);
        let currentMax = snap.empty ? 0 : snap.docs[0].data().registrationSequence || 0;

        let successCount = 0
        let errorCount = 0

        for (const row of jsonData as any[]) {
          const mappedData: any = {}
          Object.entries(row).forEach(([label, value]) => {
            const dbKey = REVERSE_MAPPING[label.trim()]
            if (dbKey) mappedData[dbKey] = value?.toString().trim()
          })

          if (!mappedData.NISN || !mappedData.fullName) {
            errorCount++
            continue
          }

          currentMax++
          const registrationNumber = `REG-2024-${currentMax.toString().padStart(4, '0')}`
          const ageYears = calculateAge(mappedData.birthDate)

          const newApplicant = {
            ...mappedData,
            registrationNumber,
            registrationSequence: currentMax,
            ageYears,
            academicScore: mappedData.academicScore ? parseFloat(mappedData.academicScore) : 0,
            distanceToSchoolKm: mappedData.distanceToSchoolKm ? parseFloat(mappedData.distanceToSchoolKm) : 0,
            numberOfSiblings: mappedData.numberOfSiblings ? parseInt(mappedData.numberOfSiblings) : 1,
            childOrder: mappedData.childOrder ? parseInt(mappedData.childOrder) : 1,
            verificationStatus: 'Belum Diverifikasi',
            admissionStatus: 'pending',
            createdAt: new Date().toISOString(),
            serverCreatedAt: serverTimestamp(),
            documents: []
          }

          await addDoc(collection(db, 'applicants'), newApplicant)
          successCount++
        }

        toast({
          title: "Impor Selesai",
          description: `Berhasil mengimpor ${successCount} murid. Gagal: ${errorCount}.`,
        })
      } catch (err) {
        console.error(err)
        toast({ variant: "destructive", title: "Error", description: "Gagal memproses file impor." })
      } finally {
        setIsImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    reader.readAsBinaryString(file)
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || submitting) return
    setSubmitting(true)
    
    try {
      const q = query(collection(db, 'applicants'), orderBy('registrationSequence', 'desc'), limit(1));
      const snap = await getDocs(q);
      const nextSequence = snap.empty ? 1 : (snap.docs[0].data().registrationSequence || 0) + 1;

      const registrationNumber = `REG-2024-${nextSequence.toString().padStart(4, '0')}`
      const ageYears = calculateAge(values.birthDate)
      
      const newApplicant = {
        ...values,
        registrationNumber,
        registrationSequence: nextSequence,
        ageYears,
        academicScore: values.academicScore ? parseFloat(values.academicScore) : 0,
        distanceToSchoolKm: values.distanceToSchoolKm ? parseFloat(values.distanceToSchoolKm) : 0,
        numberOfSiblings: values.numberOfSiblings ? parseInt(values.numberOfSiblings) : 1,
        childOrder: values.childOrder ? parseInt(values.childOrder) : 1,
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
        documents: []
      }

      await addDoc(collection(db, 'applicants'), newApplicant)
      
      setIsDialogOpen(false)
      form.reset()
      toast({
        title: "Data Disimpan",
        description: `Murid ${values.fullName} berhasil didaftarkan.`,
      })
    } catch (error: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'applicants',
        operation: 'create'
      }))
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
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv,.xlsx,.xls" 
            className="hidden" 
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                <FileDown className="w-4 h-4" />
                Unduh Templat
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border/50">
              <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')} className="cursor-pointer">
                Format CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('excel')} className="cursor-pointer">
                Format Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadTemplate('pdf')} className="cursor-pointer">
                Panduan PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            className="gap-2 border-primary/20 text-primary hover:bg-primary/5" 
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            Impor Data
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!submitting) setIsDialogOpen(open)
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Tambah Murid
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px] h-[95vh] p-0 overflow-hidden border-border/50 bg-card flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                <DialogTitle className="font-headline text-2xl">Formulir Pendaftaran Murid</DialogTitle>
                <DialogDescription>Input data lengkap calon murid baru sesuai dokumen resmi Dapodik.</DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                  <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-10 pb-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <User className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 1: Identitas Pribadi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nama Lengkap</FormLabel>
                                <FormControl>
                                  <Input placeholder="Sesuai Akte Kelahiran" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jenis Kelamin</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih Jenis Kelamin" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="NISN"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>NISN (10 Digit)</FormLabel>
                                <FormControl>
                                  <Input placeholder="0123456789" {...field} maxLength={10} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="NIK"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>NIK (16 Digit)</FormLabel>
                                <FormControl>
                                  <Input placeholder="3201..." {...field} maxLength={16} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="birthPlace"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tempat Lahir</FormLabel>
                                <FormControl>
                                  <Input placeholder="Kota/Kabupaten" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="birthDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tanggal Lahir</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="religion"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agama</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih Agama" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {['Islam', 'Katolik', 'Kristen', 'Hindu', 'Budha', 'Khonghucu', 'Lainnya'].map(r => (
                                      <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="hobbies"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hobi / Kegemaran</FormLabel>
                                <FormControl>
                                  <Input placeholder="Seni, Olahraga, Membaca..." {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-cyan-500">
                          <div className="bg-cyan-500/10 p-2 rounded-lg">
                            <Layers className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 2: Data Keluarga & Saudara</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <FormField
                            control={form.control}
                            name="childOrder"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Anak Ke-berapa</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="numberOfSiblings"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jumlah Saudara Kandung</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-amber-500">
                          <div className="bg-amber-500/10 p-2 rounded-lg">
                            <Home className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 3: Alamat & Domisili</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Alamat Lengkap (Sesuai KK)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Jl. Raya No..., RT/RW, Kelurahan, Kecamatan" {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="familyCardNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>No. Kartu Keluarga (16 Digit)</FormLabel>
                                <FormControl>
                                  <Input placeholder="3201..." {...field} maxLength={16} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="livingWith"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tinggal Dengan</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {['Bersama Orang Tua', 'Wali', 'Kost', 'Asrama', 'Lainnya'].map(v => (
                                      <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="transportation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Transportasi ke Sekolah</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {['Jalan Kaki', 'Motor', 'Mobil Pribadi', 'Ojek/Jemputan', 'Kendaraan Umum'].map(v => (
                                      <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="distanceToSchoolKm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jarak ke Sekolah (Km)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" placeholder="Contoh: 1.5" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-pink-500">
                          <div className="bg-pink-500/10 p-2 rounded-lg">
                            <UsersIcon className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 4: Data Orang Tua / Wali</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <div className="space-y-5 p-5 border rounded-2xl bg-card/50">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">AYAH</Badge>
                            </div>
                            <FormField
                              control={form.control}
                              name="fatherName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nama Lengkap Ayah</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Sesuai KTP" {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="fatherNIK"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>NIK Ayah</FormLabel>
                                  <FormControl>
                                    <Input placeholder="16 Digit" {...field} maxLength={16} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="fatherOccupation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pekerjaan Ayah</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Contoh: Karyawan, TNI, Petani..." {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="space-y-5 p-5 border rounded-2xl bg-card/50">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Badge variant="outline" className="text-pink-500 border-pink-500/20 bg-pink-500/5">IBU</Badge>
                            </div>
                            <FormField
                              control={form.control}
                              name="motherName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nama Lengkap Ibu</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Sesuai KTP" {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="motherNIK"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>NIK Ibu</FormLabel>
                                  <FormControl>
                                    <Input placeholder="16 Digit" {...field} maxLength={16} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="motherOccupation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pekerjaan Ibu</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Contoh: IRT, Guru, Perawat..." {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-accent/5 p-4 rounded-xl border border-accent/20">
                            <FormField
                              control={form.control}
                              name="registrantRelationship"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2"><Info className="w-3 h-3" /> Hubungan Pendaftar</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Hubungan" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {['Ayah', 'Ibu', 'Wali', 'Calon Murid', 'Lainnya'].map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="parentPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2"><Smartphone className="w-3 h-3" /> No. HP WhatsApp</FormLabel>
                                  <FormControl>
                                    <Input placeholder="08..." {...field} disabled={submitting} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-3 text-green-500">
                          <div className="bg-green-500/10 p-2 rounded-lg">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Bagian 5: Jalur Masuk & Sekolah Asal</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-2xl border border-border/50">
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name="originSchool"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Asal Sekolah (SD/MI)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ketik sekolah asal..." 
                                      {...field} 
                                      disabled={submitting} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="applicationPath"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jalur Pendaftaran</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={submitting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih Jalur" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Zonasi">Zonasi</SelectItem>
                                    <SelectItem value="Prestasi">Prestasi</SelectItem>
                                    <SelectItem value="Afirmasi">Afirmasi</SelectItem>
                                    <SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="academicScore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rata-rata Nilai Rapor</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="85.50" {...field} disabled={submitting} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-6 border-t bg-card shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
                    <DialogFooter className="flex flex-row items-center justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={submitting} className="min-w-[200px] shadow-lg shadow-primary/20 h-11 text-base font-bold">
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
          <Input 
            placeholder="Cari NISN atau Nama Calon Murid..." 
            className="pl-10 h-11 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Tidak ada data pendaftar ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplicants.map((applicant, idx) => (
                <TableRow key={applicant.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-muted-foreground">
                    #{applicant.registrationSequence || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-primary text-sm">{applicant.NISN}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {applicant.registrationNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{applicant.fullName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{applicant.originSchool}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${pathColorMap[applicant.applicationPath] || ''} font-bold text-[10px]`}>
                      {applicant.applicationPath}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColorMap[applicant.verificationStatus] || ''} font-bold text-[10px]`}>
                      {applicant.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild title="Lihat Detail">
                      <Link href={`/dashboard/applicants/${applicant.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
