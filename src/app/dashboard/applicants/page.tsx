
"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  Search, Plus, Loader2, Camera, Eye, User, Home, MapPin, Phone, Users as UsersIcon, Pencil, Trash2, Scale, Ruler, Clock, Hash, FileUp, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, Upload, AlertCircle, Download, FileCode, Check, Settings2
} from "lucide-react"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from 'next/link'
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, orderBy, addDoc, limit, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { extractFormData } from '@/ai/flows/extract-form-data-flow'
import { extractFromFile } from '@/ai/flows/extract-from-file-flow'
import * as XLSX from 'xlsx'

const formSchema = z.object({
  registrationSequence: z.string().min(1, "No. Urut harus diisi"),
  fullName: z.string().min(2, "Nama minimal 2 karakter"),
  gender: z.enum(['Laki-laki', 'Perempuan']),
  NISN: z.string().optional(),
  NIK: z.string().optional(),
  familyCardNumber: z.string().optional(),
  birthPlace: z.string().optional(),
  birthDate: z.string().optional(),
  aktaLahirNumber: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  propinsi: z.string().optional(),
  livingWith: z.enum(['Bersama Orang Tua', 'Wali', 'Asrama', 'Kos']),
  transportation: z.enum(['Jalan Kaki', 'Motor', 'Mobil', 'Angkot/Kendaraan Umum']),
  childOrder: z.string().optional(),
  studentPhone: z.string().optional(),
  numberOfSiblings: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  travelTimeMinutes: z.string().optional(),
  welfareType: z.enum(['PIP', 'PKH', 'KKS', 'KPS', 'Tidak Ada']),
  welfareCardNumber: z.string().optional(),
  welfareCardName: z.string().optional(),
  fatherName: z.string().optional(),
  fatherNIK: z.string().optional(),
  fatherBirthYear: z.string().optional(),
  fatherEducation: z.string().optional(),
  fatherJob: z.string().optional(),
  fatherIncome: z.string().optional(),
  motherName: z.string().optional(),
  motherNIK: z.string().optional(),
  motherBirthYear: z.string().optional(),
  motherEducation: z.string().optional(),
  motherJob: z.string().optional(),
  motherIncome: z.string().optional(),
  guardianName: z.string().optional(),
  guardianNIK: z.string().optional(),
  guardianBirthYear: z.string().optional(),
  guardianEducation: z.string().optional(),
  guardianJob: z.string().optional(),
  guardianIncome: z.string().optional(),
  originSchool: z.string().optional(),
  applicationPath: z.enum(['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']),
})

const TEMPLATE_COLUMNS = [
  { id: 'registrationNumber', label: 'No. Urut Pendaftaran (No Reg)' },
  { id: 'NISN', label: 'NISN' },
  { id: 'NIK', label: 'NIK' },
  { id: 'fullName', label: 'Nama Lengkap' },
  { id: 'gender', label: 'Jenis Kelamin' },
  { id: 'originSchool', label: 'Sekolah Asal' },
  { id: 'applicationPath', label: 'Jalur Masuk' },
  { id: 'academicScore', label: 'Skor Akademik' },
  { id: 'distanceToSchoolKm', label: 'Jarak (Km)' },
  { id: 'verificationStatus', label: 'Status Verifikasi' },
  { id: 'admissionStatus', label: 'Hasil Seleksi' },
  { id: 'parentName', label: 'Nama Orang Tua' },
  { id: 'studentPhone', label: 'No. Telepon' },
  { id: 'address', label: 'Alamat' },
  { id: 'kelurahan', label: 'Kelurahan' },
  { id: 'kecamatan', label: 'Kecamatan' },
  { id: 'propinsi', label: 'Provinsi' },
  { id: 'birthDate', label: 'Tanggal Lahir' },
  { id: 'religion', label: 'Agama' },
]

export default function ApplicantsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null)
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
  const [selectedTemplateCols, setSelectedTemplateCols] = useState<string[]>(TEMPLATE_COLUMNS.map(c => c.id))
  
  const scanInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const db = useFirestore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      registrationSequence: "",
      fullName: "", gender: "Laki-laki", NISN: "", NIK: "", familyCardNumber: "",
      birthPlace: "", birthDate: "", aktaLahirNumber: "", religion: "Katolik",
      address: "", rt: "", rw: "", kelurahan: "", kecamatan: "", propinsi: "Jawa Barat",
      livingWith: "Bersama Orang Tua", transportation: "Jalan Kaki",
      childOrder: "1", studentPhone: "", numberOfSiblings: "0",
      heightCm: "", weightKg: "", travelTimeMinutes: "", welfareType: "Tidak Ada",
      welfareCardNumber: "", welfareCardName: "",
      originSchool: "", applicationPath: "Zonasi",
      fatherName: "", fatherNIK: "", fatherBirthYear: "", fatherEducation: "", fatherJob: "", fatherIncome: "",
      motherName: "", motherNIK: "", motherBirthYear: "", motherEducation: "", motherJob: "", motherIncome: "",
      guardianName: "", guardianNIK: "", guardianBirthYear: "", guardianEducation: "", guardianJob: "", guardianIncome: ""
    },
  })

  const watchLivingWith = form.watch("livingWith")

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: systemConfig } = useDoc<any>(settingsRef)

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), orderBy('createdAt', 'desc'), limit(2000))
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)

  const filteredApplicants = useMemo(() => {
    if (!applicants) return []
    return applicants.filter(a => 
      !a.isDeleted &&
      ((a.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.NISN || "").includes(searchTerm))
    )
  }, [applicants, searchTerm])

  const handleScanForm = async (fileInput: HTMLInputElement) => {
    const file = fileInput.files?.[0]
    if (!file) return
    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      try {
        const result = await extractFormData({ photoDataUri: base64 })
        if (result) {
          Object.entries(result).forEach(([key, value]) => {
            if (value && key in form.getValues()) form.setValue(key as any, value)
          });
          toast({ title: "Scan Berhasil", description: "Hanya data yang terbaca jelas yang diisi otomatis." })
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Scan Gagal", description: "Gagal memproses gambar." })
      } finally {
        setIsScanning(false)
        fileInput.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    
    const fileType = file.type
    const reader = new FileReader()

    reader.onload = async (event) => {
      const content = event.target?.result
      try {
        if (fileType.includes('spreadsheet') || fileType.includes('excel') || file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(content, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const data = XLSX.utils.sheet_to_json(sheet)
          
          const mappedData = data.map((row: any) => {
            return {
              fullName: row['NAMA'] || row['Nama Lengkap'] || row['Nama'] || "",
              NISN: row['NISN']?.toString() || "",
              gender: (row['Jenis Kelamin'] || row['JK'] || "").toString().toUpperCase().startsWith('P') ? 'Perempuan' : 'Laki-laki',
              originSchool: row['SEKOLAH ASAL'] || row['Sekolah Asal'] || "",
              fatherName: row['NAMA ORANG TUA'] || row['Orang Tua'] || row['Nama Orang Tua'] || "",
              kelurahan: row['KELURAHAN'] || row['Kelurahan'] || row['Kelurahan/Desa'] || "",
              kecamatan: row['KECAMATAN'] || row['Kecamatan'] || "",
              propinsi: row['PROVINSI'] || row['Provinsi'] || row['Propinsi'] || "",
              registrationSequence: Number(row['NO Daftar'] || row['No Daftar'] || row['No. Urut'] || row['No. Urut Pendaftaran (No Reg)'] || 0),
              applicationPath: row['Jalur'] || row['Jalur Masuk'] || 'Zonasi',
            }
          })
          setImportData(mappedData)
        } else if (fileType.includes('pdf')) {
          const result = await extractFromFile({ 
            fileDataUri: content as string,
            fileType: fileType
          })
          if (result && result.applicants) {
            setImportData(result.applicants)
          }
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Gagal Membaca File", description: "Format file tidak valid." })
      } finally {
        setIsImporting(false)
        e.target.value = ''
      }
    }

    if (fileType.includes('pdf')) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsBinaryString(file)
    }
  }

  const handleDownloadTemplate = async (format: 'csv' | 'excel' | 'pdf') => {
    const selectedHeaders = TEMPLATE_COLUMNS.filter(c => selectedTemplateCols.includes(c.id)).map(c => c.label)
    
    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet([])
      XLSX.utils.sheet_add_aoa(worksheet, [selectedHeaders], { origin: "A1" })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template")
      XLSX.writeFile(workbook, "Template_Pendaftaran_SPMB.xlsx")
    } else if (format === 'csv') {
      const csvContent = selectedHeaders.join(",")
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "Template_Pendaftaran_SPMB.csv")
      link.click()
    } else if (format === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF('l')
      doc.setFontSize(16)
      doc.text("FORMULIR PENDAFTARAN KOSONG", 148, 20, { align: "center" })
      autoTable(doc, {
        head: [selectedHeaders],
        body: Array.from({ length: 5 }).map(() => selectedHeaders.map(() => "")),
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8, minCellHeight: 10 }
      })
      doc.save("Formulir_Pendaftaran_Manual.pdf")
    }
    setIsTemplateDialogOpen(false)
  }

  const executeBulkImport = () => {
    if (!db || importData.length === 0) return
    setIsImporting(true)
    const batch = writeBatch(db)
    
    // Pastikan prefiks bersih dan memiliki dash yang konsisten
    let prefix = (systemConfig?.regPrefix || "").trim();
    if (prefix && !prefix.endsWith('-')) {
      prefix = prefix + '-';
    }
    
    importData.forEach((data, idx) => {
      const seq = Number(data.registrationSequence || idx + 1);
      const paddedSeq = seq.toString().padStart(2, '0');
      const regNumber = `${prefix}${paddedSeq}`;

      const newRef = doc(collection(db, 'applicants'))
      const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = (value === undefined || value === null) ? "" : value;
        return acc;
      }, {} as any);

      const pName = sanitizedData.parentName || sanitizedData.fatherName || sanitizedData.motherName || sanitizedData.guardianName || "";

      batch.set(newRef, {
        ...sanitizedData,
        parentName: pName,
        registrationSequence: seq,
        registrationNumber: regNumber,
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
        isDeleted: false,
        livingWith: sanitizedData.livingWith || 'Bersama Orang Tua',
        transportation: sanitizedData.transportation || 'Jalan Kaki',
        welfareType: sanitizedData.welfareType || 'Tidak Ada',
        religion: sanitizedData.religion || 'Katolik'
      })
    })
    
    batch.commit().then(() => {
      toast({ title: "Impor Berhasil", description: `${importData.length} data pendaftar ditambahkan.` })
      setIsImportDialogOpen(false)
      setImportData([])
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'applicants', operation: 'write' }))
    }).finally(() => {
      setIsImporting(false)
    })
  }

  const handleEdit = (applicant: Applicant) => {
    setEditingApplicant(applicant)
    form.reset({
      ...applicant,
      registrationSequence: applicant.registrationSequence?.toString() || "",
      childOrder: applicant.childOrder?.toString() || "",
      numberOfSiblings: applicant.numberOfSiblings?.toString() || "",
      heightCm: applicant.heightCm?.toString() || "",
      weightKg: applicant.weightKg?.toString() || "",
      travelTimeMinutes: applicant.travelTimeMinutes?.toString() || "",
    } as any)
    setIsDialogOpen(true)
  }

  const handleDeleteConfirm = (applicant: Applicant) => {
    setApplicantToDelete(applicant)
    setIsDeleteDialogOpen(true)
  }

  const executeDelete = () => {
    if (!db || !applicantToDelete) return
    const docRef = doc(db, 'applicants', applicantToDelete.id)
    updateDoc(docRef, { isDeleted: true, deletedAt: new Date().toISOString() })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update' }))
      })
      .then(() => {
        toast({ title: "Data dipindahkan ke sampah" })
        setApplicantToDelete(null)
      })
  }

  const executeDeleteAll = () => {
    if (!db || !filteredApplicants.length) return
    setSubmitting(true)
    const batch = writeBatch(db)
    const now = new Date().toISOString()

    filteredApplicants.forEach((applicant) => {
      const docRef = doc(db, 'applicants', applicant.id)
      batch.update(docRef, { isDeleted: true, deletedAt: now })
    })

    batch.commit().then(() => {
      toast({ title: "Berhasil", description: `${filteredApplicants.length} data dipindahkan ke sampah.` })
      setIsDeleteAllDialogOpen(false)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'applicants', operation: 'write' }))
    }).finally(() => {
      setSubmitting(false)
    })
  }

  const handleAddNew = () => {
    setEditingApplicant(null)
    const lastSeq = applicants?.reduce((max, a) => Math.max(max, a.registrationSequence || 0), 0) || 0
    form.reset({
      registrationSequence: (lastSeq + 1).toString(),
      fullName: "", gender: "Laki-laki", NISN: "", NIK: "", familyCardNumber: "",
      birthPlace: "", birthDate: "", aktaLahirNumber: "", religion: "Katolik",
      address: "", rt: "", rw: "", kelurahan: "", kecamatan: "", propinsi: "Jawa Barat",
      livingWith: "Bersama Orang Tua", transportation: "Jalan Kaki",
      childOrder: "1", studentPhone: "", numberOfSiblings: "0",
      heightCm: "", weightKg: "", travelTimeMinutes: "", welfareType: "Tidak Ada",
      welfareCardNumber: "", welfareCardName: "",
      originSchool: "", applicationPath: "Zonasi",
      fatherName: "", fatherNIK: "", fatherBirthYear: "", fatherEducation: "", fatherJob: "", fatherIncome: "",
      motherName: "", motherNIK: "", motherBirthYear: "", motherEducation: "", motherJob: "", motherIncome: "",
      guardianName: "", guardianNIK: "", guardianBirthYear: "", guardianEducation: "", guardianJob: "", guardianIncome: ""
    })
    setIsDialogOpen(true)
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || submitting) return
    setSubmitting(true)
    
    const seq = Number(values.registrationSequence) || 0;
    let prefix = (systemConfig?.regPrefix || "").trim();
    if (prefix && !prefix.endsWith('-')) {
      prefix = prefix + '-';
    }
    const paddedSeq = seq.toString().padStart(2, '0');
    const regNumber = `${prefix}${paddedSeq}`;

    const applicantData = {
      ...values,
      registrationSequence: seq,
      registrationNumber: regNumber,
      childOrder: Number(values.childOrder) || 0,
      numberOfSiblings: Number(values.numberOfSiblings) || 0,
      heightCm: Number(values.heightCm) || 0,
      weightKg: Number(values.weightKg) || 0,
      travelTimeMinutes: Number(values.travelTimeMinutes) || 0,
      parentName: values.livingWith === 'Wali' ? (values.guardianName || values.fatherName || values.motherName || "") : (values.fatherName || values.motherName || ""),
      parentPhone: values.studentPhone || "",
    }

    const sanitizedData = Object.entries(applicantData).reduce((acc, [key, value]) => {
      acc[key] = (value === undefined || value === null) ? "" : value;
      return acc;
    }, {} as any);

    if (editingApplicant) {
      const applicantRef = doc(db, 'applicants', editingApplicant.id)
      updateDoc(applicantRef, { ...sanitizedData, updatedAt: new Date().toISOString() })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: applicantRef.path, 
            operation: 'update',
            requestResourceData: sanitizedData
          }))
        })
    } else {
      const newApplicant = {
        ...sanitizedData,
        verificationStatus: 'Belum Diverifikasi',
        admissionStatus: 'pending',
        createdAt: new Date().toISOString(),
        isDeleted: false
      }
      addDoc(collection(db, 'applicants'), newApplicant)
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ 
            path: 'applicants', 
            operation: 'create',
            requestResourceData: newApplicant
          }))
        })
    }
    
    setIsDialogOpen(false)
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Data Calon Murid</h1>
          <p className="text-muted-foreground mt-1">Manajemen data pendaftaran murid baru sesuai standar Dapodik.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
            onClick={() => setIsDeleteAllDialogOpen(true)}
            disabled={filteredApplicants.length === 0}
          >
            <Trash2 className="w-4 h-4" /> Hapus Semua
          </Button>

          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-accent/20 text-accent">
                <Download className="w-4 h-4" /> Unduh Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" /> Kustomisasi Kolom Template
                </DialogTitle>
                <DialogDescription>Pilih kolom yang ingin disertakan dalam file template Anda.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 bg-muted/20 rounded-xl border border-border/50 max-h-[350px] overflow-y-auto">
                  {TEMPLATE_COLUMNS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-3">
                      <Checkbox 
                        id={`template-col-${col.id}`} 
                        checked={selectedTemplateCols.includes(col.id)} 
                        onCheckedChange={() => {
                          setSelectedTemplateCols(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                        }} 
                      />
                      <Label htmlFor={`template-col-${col.id}`} className="text-xs font-medium cursor-pointer">{col.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={() => handleDownloadTemplate('csv')} variant="outline" className="gap-2"><FileCode className="w-3 h-3" /> CSV</Button>
                <Button onClick={() => handleDownloadTemplate('excel')} variant="outline" className="gap-2 border-green-500/20 text-green-500"><FileSpreadsheet className="w-3 h-3" /> Excel</Button>
                <Button onClick={() => handleDownloadTemplate('pdf')} className="gap-2 bg-primary"><FileText className="w-3 h-3" /> PDF</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary">
                <FileUp className="w-4 h-4" /> Impor Data
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0">
              <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                <DialogTitle>Impor Data Murid</DialogTitle>
                <DialogDescription>Unggah file Excel atau PDF. Kami akan mengekstraksi data secara otomatis.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
                <div 
                  onClick={() => importInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/10 group"
                >
                  <input type="file" ref={importInputRef} onChange={handleImportFile} accept=".xlsx,.xls,.pdf" className="hidden" />
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Klik atau seret file ke sini</p>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">Excel (.xlsx) atau Dokumen PDF</p>
                </div>

                {isImporting && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Menganalisis file...</p>
                  </div>
                )}

                {importData.length > 0 && (
                  <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Pratinjau Data ({importData.length} Murid)
                    </h3>
                    <ScrollArea className="flex-1 border rounded-lg">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-[50px]">No Dftr</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>NISN</TableHead>
                            <TableHead>JK</TableHead>
                            <TableHead>Domisili</TableHead>
                            <TableHead>Sekolah Asal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importData.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs font-bold text-primary">{row.registrationSequence || "-"}</TableCell>
                              <TableCell className="font-medium text-xs">{row.fullName}</TableCell>
                              <TableCell className="text-xs font-mono">{row.NISN || "-"}</TableCell>
                              <TableCell className="text-xs">{row.gender === 'Perempuan' ? 'P' : 'L'}</TableCell>
                              <TableCell className="text-xs">{row.kelurahan}, {row.kecamatan}, {row.propinsi}</TableCell>
                              <TableCell className="text-xs">{row.originSchool || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <DialogFooter className="p-6 border-t bg-muted/20">
                <Button variant="ghost" onClick={() => { setImportData([]); setIsImportDialogOpen(false); }}>Batal</Button>
                <Button 
                  onClick={executeBulkImport} 
                  disabled={importData.length === 0 || isImporting}
                  className="gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Masukkan ke Database
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleAddNew} className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Murid Baru</Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[850px] h-[90vh] p-0 flex flex-col overflow-hidden border-border/50">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-2xl font-headline">
                {editingApplicant ? 'Edit Data Pendaftar' : 'Formulir Pendaftaran'}
              </DialogTitle>
              <DialogDescription>Input data murid baru atau gunakan Scan AI untuk mempercepat pengisian.</DialogDescription>
            </div>
            {!editingApplicant && (
              <Button onClick={() => scanInputRef.current?.click()} disabled={isScanning} variant="outline" size="sm" className="gap-2 border-primary/20 text-primary">
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Scan AI
              </Button>
            )}
          </DialogHeader>
          <input type="file" ref={scanInputRef} onChange={(e) => handleScanForm(e.target)} accept="image/*" className="hidden" />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 px-8">
                <div className="py-6 space-y-10">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <User className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">A. Data Murid Baru</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="registrationSequence" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="flex items-center gap-2">No. Urut Pendaftaran : <Badge variant="secondary" className="font-mono text-[10px]">Otomatis</Badge></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                              <Input type="number" placeholder="Contoh: 1, 2, 3..." {...field} className="pl-10 font-bold" />
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-[10px] text-muted-foreground italic mt-1">
                            Hasil No Reg: <strong>{(systemConfig?.regPrefix || '')}{field.value.toString().padStart(2, '0')}</strong>
                          </p>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Nama Lengkap :</FormLabel><FormControl><Input placeholder="SESUAI IJAZAH" {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem><FormLabel>Jenis Kelamin :</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Laki-laki">Laki-laki</SelectItem><SelectItem value="Perempuan">Perempuan</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="NISN" render={({ field }) => (
                        <FormItem><FormLabel>NISN :</FormLabel><FormControl><Input placeholder="10 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="NIK" render={({ field }) => (
                        <FormItem><FormLabel>NIK :</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="familyCardNumber" render={({ field }) => (
                        <FormItem><FormLabel>No. Kartu Keluarga (KK) :</FormLabel><FormControl><Input placeholder="16 Digit" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="birthPlace" render={({ field }) => (
                        <FormItem><FormLabel>Tempat Lahir :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="birthDate" render={({ field }) => (
                        <FormItem><FormLabel>Tanggal Lahir :</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="aktaLahirNumber" render={({ field }) => (
                        <FormItem><FormLabel>No. Reg Akta Lahir :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="religion" render={({ field }) => (
                        <FormItem><FormLabel>Agama :</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Katolik">Katolik</SelectItem><SelectItem value="Islam">Islam</SelectItem><SelectItem value="Kristen">Kristen</SelectItem><SelectItem value="Hindu">Hindu</SelectItem><SelectItem value="Budha">Budha</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                  </section>
                  
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Home className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">B. Alamat Tinggal</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Alamat Lengkap (Jl / Dusun) :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="rt" render={({ field }) => (
                        <FormItem><FormLabel>RT :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="rw" render={({ field }) => (
                        <FormItem><FormLabel>RW :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="kelurahan" render={({ field }) => (
                        <FormItem><FormLabel>Desa / Kelurahan :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="kecamatan" render={({ field }) => (
                        <FormItem><FormLabel>Kecamatan :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="propinsi" render={({ field }) => (
                        <FormItem><FormLabel>Provinsi :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="livingWith" render={({ field }) => (
                        <FormItem><FormLabel>Tempat Tinggal :</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Bersama Orang Tua">Tinggal Bersama Orang Tua</SelectItem><SelectItem value="Wali">Wali</SelectItem><SelectItem value="Asrama">Asrama</SelectItem><SelectItem value="Kos">Kos</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Phone className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">C. Kontak & Lainnya</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="transportation" render={({ field }) => (
                        <FormItem><FormLabel>Moda Transportasi :</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Jalan Kaki">Jalan Kaki</SelectItem><SelectItem value="Motor">Motor</SelectItem><SelectItem value="Mobil">Mobil</SelectItem><SelectItem value="Angkot/Kendaraan Umum">Angkot/Kendaraan Umum</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="studentPhone" render={({ field }) => (
                        <FormItem><FormLabel>No. HP Siswa :</FormLabel><FormControl><Input placeholder="0812345678" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="childOrder" render={({ field }) => (
                        <FormItem><FormLabel>Anak Ke- :</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="numberOfSiblings" render={({ field }) => (
                        <FormItem><FormLabel>Jumlah Saudara :</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Scale className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">D. Data Periodik</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="heightCm" render={({ field }) => (
                        <FormItem><FormLabel>Tinggi Badan (CM) :</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="weightKg" render={({ field }) => (
                        <FormItem><FormLabel>Berat Badan (KG) :</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="travelTimeMinutes" render={({ field }) => (
                        <FormItem><FormLabel>Waktu Tempuh (Menit) :</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="welfareType" render={({ field }) => (
                        <FormItem><FormLabel>Jenis Kesejahteraan :</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Tidak Ada">Tidak Ada / Umum</SelectItem><SelectItem value="PIP">PIP</SelectItem><SelectItem value="PKH">PKH</SelectItem><SelectItem value="KKS">KKS</SelectItem><SelectItem value="KPS">KPS</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="welfareCardNumber" render={({ field }) => (
                        <FormItem><FormLabel>Nomor Kartu :</FormLabel><FormControl><Input placeholder="Nomor Kartu Kesejahteraan" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="welfareCardName" render={({ field }) => (
                        <FormItem><FormLabel>Nama di Kartu :</FormLabel><FormControl><Input placeholder="Nama Sesuai Kartu" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <UsersIcon className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">E. Data Orang Tua</h3>
                    </div>
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="fatherName" render={({ field }) => (
                          <FormItem><FormLabel>Nama Ayah Kandung :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fatherNIK" render={({ field }) => (
                          <FormItem><FormLabel>NIK Ayah :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fatherBirthYear" render={({ field }) => (
                          <FormItem><FormLabel>Tahun Lahir Ayah :</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fatherEducation" render={({ field }) => (
                          <FormItem><FormLabel>Pendidikan Ayah :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fatherJob" render={({ field }) => (
                          <FormItem><FormLabel>Pekerjaan Ayah :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fatherIncome" render={({ field }) => (
                          <FormItem><FormLabel>Penghasilan Ayah :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="motherName" render={({ field }) => (
                          <FormItem><FormLabel>Nama Ibu Kandung :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherNIK" render={({ field }) => (
                          <FormItem><FormLabel>NIK Ibu :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherBirthYear" render={({ field }) => (
                          <FormItem><FormLabel>Tahun Lahir Ibu :</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherEducation" render={({ field }) => (
                          <FormItem><FormLabel>Pendidikan Ibu :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherJob" render={({ field }) => (
                          <FormItem><FormLabel>Pekerjaan Ibu :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="motherIncome" render={({ field }) => (
                          <FormItem><FormLabel>Penghasilan Ibu :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>

                    {watchLivingWith !== 'Bersama Orang Tua' && (
                      <div className="pt-10 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                          <UsersIcon className="w-5 h-5" />
                          <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">F. Data Wali</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="guardianName" render={({ field }) => (
                            <FormItem><FormLabel>Nama Wali :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianNIK" render={({ field }) => (
                            <FormItem><FormLabel>NIK Wali :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianBirthYear" render={({ field }) => (
                            <FormItem><FormLabel>Tahun Lahir Wali :</FormLabel><FormControl><Input placeholder="YYYY" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianEducation" render={({ field }) => (
                            <FormItem><FormLabel>Pendidikan Wali :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianJob" render={({ field }) => (
                            <FormItem><FormLabel>Pekerjaan Wali :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="guardianIncome" render={({ field }) => (
                            <FormItem><FormLabel>Penghasilan Wali :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <MapPin className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-widest border-b border-primary/20 pb-1 flex-1">G. Jalur & Asal Sekolah</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="originSchool" render={({ field }) => (
                        <FormItem><FormLabel>Asal Sekolah Dasar (SD/MI) :</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="applicationPath" render={({ field }) => (
                        <FormItem><FormLabel>Jalur Pendaftaran :</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Zonasi">Zonasi</SelectItem><SelectItem value="Prestasi">Prestasi</SelectItem><SelectItem value="Afirmasi">Afirmasi</SelectItem><SelectItem value="Perpindahan Orang Tua">Perpindahan Orang Tua</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                  </section>
                </div>
              </ScrollArea>
              <DialogFooter className="p-6 border-t bg-muted/20 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />} 
                  {editingApplicant ? 'Update Data Pendaftar' : 'Simpan Data Pendaftar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari Nama atau NISN..." className="pl-9 bg-muted/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="font-bold text-primary">No. Urut Pendaftaran (No Reg)</TableHead>
              <TableHead className="font-bold text-primary">Nama Lengkap</TableHead>
              <TableHead className="font-bold text-primary">Asal Sekolah</TableHead>
              <TableHead className="font-bold text-primary">Jalur</TableHead>
              <TableHead className="font-bold text-primary">Status</TableHead>
              <TableHead className="text-right font-bold text-primary">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredApplicants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada pendaftar ditemukan.</TableCell></TableRow>
            ) : filteredApplicants.map((applicant) => (
              <TableRow key={applicant.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="font-mono text-xs font-bold">{applicant.registrationNumber || applicant.registrationSequence}</TableCell>
                <TableCell className="font-medium">{applicant.fullName}</TableCell>
                <TableCell className="text-sm">{applicant.originSchool || "-"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase">{applicant.applicationPath}</Badge></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                    applicant.verificationStatus === 'Lengkap' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    applicant.verificationStatus === 'Ditolak' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    applicant.verificationStatus === 'Perlu Perbaikan' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {applicant.verificationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="hover:text-primary" onClick={() => handleEdit(applicant)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild className="hover:text-primary">
                      <Link href={`/dashboard/applicants/${applicant.id}`}><Eye className="w-4 h-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteConfirm(applicant)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindahkan ke Sampah?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin memindahkan data <strong>{applicantToDelete?.fullName}</strong> ke tempat sampah? Data dapat dipulihkan nanti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApplicantToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Pindahkan ke Sampah
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Hapus Semua Data Murid?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memindahkan <strong>{filteredApplicants.length}</strong> data murid yang sedang ditampilkan ke tempat sampah. Tindakan ini dapat dibatalkan melalui menu Sampah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ya, Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
