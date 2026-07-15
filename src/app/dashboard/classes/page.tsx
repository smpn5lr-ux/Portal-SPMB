
"use client"

import { useState, useEffect } from 'react'
import { 
  Users, 
  Trash2, 
  Shuffle, 
  Plus,
  Pencil,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText as FilePdf,
  ChevronDown,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  DatabaseZap,
  Loader2,
  CheckCircle2,
  Settings2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, doc, updateDoc, writeBatch, addDoc, query, orderBy, deleteDoc } from 'firebase/firestore'
import { Applicant, Classroom } from '@/lib/types'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from 'xlsx'
import Link from 'next/link'

const classFormSchema = z.object({
  name: z.string().min(1, "Nama kelas harus diisi"),
  gradeLevel: z.string().min(1, "Tingkat harus diisi"),
  homeroomTeacher: z.string().optional(),
  capacity: z.string().min(1, "Kapasitas harus diisi"),
})

export default function ClassesPage() {
  const [isShuffling, setIsShuffling] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isShuffleDialogOpen, setIsShuffleDialogOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Classroom | null>(null)
  const [selectedClassForView, setSelectedClassForView] = useState<Classroom | null>(null)
  const [classToDelete, setClassToDelete] = useState<Classroom | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Shuffle Options State
  const [shuffleOptions, setShuffleOptions] = useState({
    balanceGender: true,
    balanceSchool: true
  })

  const [submitting, setSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const classesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'classes'), orderBy('name', 'asc'))
  }, [db])

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'applicants')
  }, [db])

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: classes, loading: loadingClasses } = useCollection<Classroom>(classesQuery)
  const { data: applicants } = useCollection<Applicant>(applicantsQuery)
  const { data: systemSettings } = useDoc<any>(settingsRef)

  const academicYear = systemSettings?.academicYear || "2024/2025"
  const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
  const schoolName = systemSettings?.schoolName || "PORTAL SPMB"
  const npsn = systemSettings?.npsn || "-"

  const form = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      gradeLevel: "7",
      homeroomTeacher: "",
      capacity: "32",
    },
  })

  useEffect(() => {
    if (editingClass) {
      form.reset({
        name: editingClass.name,
        gradeLevel: editingClass.gradeLevel.toString(),
        homeroomTeacher: editingClass.homeroomTeacher || "",
        capacity: editingClass.capacity.toString(),
      })
    } else {
      form.reset({
        name: "",
        gradeLevel: "7",
        homeroomTeacher: "",
        capacity: "32",
      })
    }
  }, [editingClass, form])

  const handleView = (cls: Classroom) => {
    setSelectedClassForView(cls)
    setIsViewOpen(true)
  }

  const handleSyncStudents = async () => {
    if (!applicants || !db || isSyncing) return
    setIsSyncing(true)
    
    const batch = writeBatch(db)
    let syncCount = 0
    
    const eligible = applicants.filter(a => 
      !a.isDeleted && 
      (a.verificationStatus === 'Lengkap' || a.verificationStatus === 'Perlu Perbaikan') &&
      a.admissionStatus !== 'accepted'
    )
    
    if (eligible.length === 0) {
      toast({
        title: "Sudah Sinkron",
        description: "Tidak ada data murid baru yang perlu ditarik."
      })
      setIsSyncing(false)
      return
    }

    try {
      eligible.forEach(a => {
        const docRef = doc(db, 'applicants', a.id)
        batch.update(docRef, { admissionStatus: 'accepted' })
        syncCount++
      })
      
      await batch.commit()
      toast({
        title: "Sinkronisasi Berhasil",
        description: `${syncCount} murid berhasil ditarik ke manajemen kelas.`
      })
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'applicants', operation: 'write' }))
    } finally {
      setIsSyncing(false)
    }
  }

  const onClassSubmit = (values: z.infer<typeof classFormSchema>) => {
    if (!db || submitting || !classes) return
    
    const isDuplicateName = classes.some(cls => 
      cls.name.toLowerCase() === values.name.toLowerCase() && 
      (!editingClass || cls.id !== editingClass.id)
    )
    
    if (isDuplicateName) {
      toast({
        variant: "destructive",
        title: "Nama Kelas Duplikat",
        description: `Kelas dengan nama "${values.name}" sudah ada.`,
      })
      return
    }

    setSubmitting(true)
    const classData = {
      name: values.name,
      gradeLevel: parseInt(values.gradeLevel),
      homeroomTeacher: values.homeroomTeacher || "",
      capacity: parseInt(values.capacity),
    }

    if (editingClass) {
      const classRef = doc(db, 'classes', editingClass.id)
      updateDoc(classRef, classData)
        .then(() => {
          setIsDialogOpen(false)
          setEditingClass(null)
          toast({ title: "Kelas Diperbarui" })
        })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: classRef.path, operation: 'update' }))
        })
        .finally(() => setSubmitting(false))
    } else {
      const newClass = {
        ...classData,
        currentEnrollment: 0,
        students: []
      }
      addDoc(collection(db, 'classes'), newClass)
        .then(() => {
          setIsDialogOpen(false)
          form.reset()
          toast({ title: "Kelas Berhasil Dibuat" })
        })
        .catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'classes', operation: 'create' }))
        })
        .finally(() => setSubmitting(false))
    }
  }

  const handleShuffle = () => {
    if (!applicants || !classes || !db || classes.length === 0) {
      toast({ variant: "destructive", title: "Gagal", description: "Buat rombel terlebih dahulu." })
      return
    }

    const acceptedStudents = applicants.filter(a => a.admissionStatus === 'accepted' && !a.isDeleted)
    
    if (acceptedStudents.length === 0) {
      toast({
        variant: "destructive",
        title: "Tidak ada data",
        description: "Belum ada murid dengan status 'Diterima'. Klik 'Ambil Data Murid' terlebih dahulu.",
      })
      return
    }

    setIsShuffling(true)
    setIsShuffleDialogOpen(false)
    
    setTimeout(async () => {
      try {
        const batch = writeBatch(db)
        
        // Logical Distribution Algorithm
        let studentPool = [...acceptedStudents]

        // 1. Sort by school first if school balancing is enabled
        if (shuffleOptions.balanceSchool) {
          studentPool.sort((a, b) => (a.originSchool || "").localeCompare(b.originSchool || ""))
        } else {
          // Pure random if school balance is off
          studentPool.sort(() => Math.random() - 0.5)
        }

        // 2. Prepare class buckets
        const classBuckets: string[][] = classes.map(() => [])

        if (shuffleOptions.balanceGender) {
          // Distribute males and females separately
          const males = studentPool.filter(s => s.gender === 'Laki-laki')
          const females = studentPool.filter(s => s.gender === 'Perempuan')

          // Distribute males
          males.forEach((student, idx) => {
            classBuckets[idx % classes.length].push(student.id)
          })
          // Distribute females (offsetting index if necessary, but modulo classes.length is usually fine)
          females.forEach((student, idx) => {
            classBuckets[idx % classes.length].push(student.id)
          })
        } else {
          // Basic round-robin distribution
          studentPool.forEach((student, idx) => {
            classBuckets[idx % classes.length].push(student.id)
          })
        }

        // 3. Commit to Firestore
        classes.forEach((cls, idx) => {
          const classRef = doc(db, 'classes', cls.id)
          batch.update(classRef, {
            currentEnrollment: classBuckets[idx].length,
            students: classBuckets[idx]
          })
        })
        
        await batch.commit()
        toast({ title: "Distribusi Berhasil", description: "Murid telah diacak ke dalam rombel secara merata." })
      } catch (err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'classes', operation: 'write' }))
      } finally {
        setIsShuffling(false)
      }
    }, 1500)
  }

  const handleExportClass = async (cls: Classroom, format: 'excel' | 'pdf' | 'attendance') => {
    if (!applicants) return
    setIsExporting(true)
    
    const students = applicants
      .filter(a => cls.students.includes(a.id))
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
    
    const maleCount = students.filter(s => s.gender === 'Laki-laki').length
    const femaleCount = students.filter(s => s.gender === 'Perempuan').length
    const genderSummary = `Total: ${students.length} (L: ${maleCount}, P: ${femaleCount})`

    try {
      if (format === 'excel') {
        const data = students.map((s, idx) => ({
          "No.": idx + 1,
          "Nama Lengkap": s.fullName,
          "NISN": s.NISN,
          "Jenis Kelamin": s.gender,
          "Sekolah Asal": s.originSchool
        }))
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, `Kelas ${cls.name}`)
        XLSX.writeFile(workbook, `Daftar_Murid_Kelas_${cls.name}.xlsx`)
      } else {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        
        doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(67, 97, 238).text(dinasName.toUpperCase(), 105, 12, { align: "center" })
        doc.text(schoolName.toUpperCase(), 105, 18, { align: "center" })
        doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(100).text(`NPSN: ${npsn} | Tahun Ajaran ${academicYear}`, 105, 23, { align: "center" })
        doc.line(14, 25, 196, 25)

        if (format === 'pdf') {
          doc.setFontSize(14).setTextColor(67, 97, 238).setFont("helvetica", "bold").text(`Daftar Murid Kelas ${cls.name}`, 14, 32)
          doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal").text(`Wali Kelas: ${cls.homeroomTeacher || '-'}`, 14, 38)
          doc.setFontSize(10).setFont("helvetica", "bold").text(genderSummary, 14, 43)
          
          autoTable(doc, {
            head: [['No.', 'Nama Lengkap', 'NISN', 'JK', 'Sekolah Asal']],
            body: students.map((s, idx) => [idx + 1, s.fullName, s.NISN, s.gender === 'Laki-laki' ? 'L' : 'P', s.originSchool]),
            startY: 48,
            headStyles: { fillColor: [67, 97, 238] }
          })
        } else {
          doc.setFontSize(14).setTextColor(67, 97, 238).setFont("helvetica", "bold").text(`DAFTAR HADIR MURID - KELAS ${cls.name}`, 14, 32)
          doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal").text(`Wali Kelas: ${cls.homeroomTeacher || '-'}`, 14, 38)
          doc.setFontSize(10).setFont("helvetica", "bold").text(genderSummary, 14, 43)
          
          autoTable(doc, {
            head: [['No.', 'Nama Lengkap', 'NISN', 'L/P', 'Tanda Tangan', '']],
            body: students.map((s, idx) => [idx + 1, s.fullName, s.NISN, s.gender === 'Laki-laki' ? 'L' : 'P', idx % 2 === 0 ? `${idx + 1}. ...............` : '', idx % 2 !== 0 ? `${idx + 1}. ...............` : '']),
            startY: 48,
            headStyles: { fillColor: [67, 97, 238], halign: 'center' },
            styles: { minCellHeight: 12, verticalAlign: 'middle' },
            columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 12 }, 4: { cellWidth: 35 }, 5: { cellWidth: 35 } }
          })
        }
        doc.save(`${format === 'attendance' ? 'Daftar_Hadir' : 'Daftar_Murid'}_${cls.name}.pdf`)
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAll = async (format: 'excel' | 'pdf' | 'attendance') => {
    if (!classes || !applicants) return
    setIsExporting(true)
    try {
      if (format === 'excel') {
        const workbook = XLSX.utils.book_new()
        classes.forEach(cls => {
          const students = applicants
            .filter(a => cls.students.includes(a.id))
            .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
          
          const data = students.map((s, idx) => ({ "No.": idx + 1, "Nama": s.fullName, "NISN": s.NISN, "JK": s.gender }))
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), `Kelas ${cls.name}`)
        })
        XLSX.writeFile(workbook, `Rekap_Semua_Kelas.xlsx`)
      } else {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        
        classes.forEach((cls, idx) => {
          if (idx > 0) doc.addPage()
          
          const students = applicants
            .filter(a => cls.students.includes(a.id))
            .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
          
          const maleCount = students.filter(s => s.gender === 'Laki-laki').length
          const femaleCount = students.filter(s => s.gender === 'Perempuan').length
          const genderSummary = `Total: ${students.length} (L: ${maleCount}, P: ${femaleCount})`

          doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(67, 97, 238).text(dinasName.toUpperCase(), 105, 12, { align: "center" })
          doc.text(schoolName.toUpperCase(), 105, 18, { align: "center" })
          doc.line(14, 25, 196, 25)
          
          doc.setFontSize(14).setTextColor(67, 97, 238).text(`${format === 'attendance' ? 'DAFTAR HADIR' : 'DAFTAR MURID'} - ${cls.name}`, 14, 32)
          doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal").text(`Wali Kelas: ${cls.homeroomTeacher || '-'}`, 14, 38)
          doc.setFontSize(10).setFont("helvetica", "bold").text(genderSummary, 14, 43)

          autoTable(doc, {
            head: format === 'attendance' ? [['No.', 'Nama', 'NISN', 'L/P', 'TTD', '']] : [['No.', 'Nama', 'NISN', 'JK', 'Sekolah Asal']],
            body: students.map((s, sIdx) => format === 'attendance' ? 
              [sIdx + 1, s.fullName, s.NISN, s.gender === 'Laki-laki' ? 'L' : 'P', sIdx % 2 === 0 ? `${sIdx + 1}. ...` : '', sIdx % 2 !== 0 ? `${sIdx + 1}. ...` : ''] : 
              [sIdx + 1, s.fullName, s.NISN, s.gender === 'Laki-laki' ? 'L' : 'P', s.originSchool]
            ),
            startY: 48,
            headStyles: { fillColor: [67, 97, 238] },
            styles: { minCellHeight: format === 'attendance' ? 12 : 8 }
          })
        })
        doc.save(`Rekap_Semua_Kelas.pdf`)
      }
      toast({ title: "Ekspor Berhasil" })
    } catch (err) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteClassConfirm = (cls: Classroom) => {
    setClassToDelete(cls)
    setIsDeleteDialogOpen(true)
  }

  const executeDeleteClass = async () => {
    if (!db || !classToDelete) return
    await deleteDoc(doc(db, 'classes', classToDelete.id))
    toast({ title: "Kelas Dihapus" })
    setClassToDelete(null)
  }

  const getStudentsInClass = (studentIds: string[]) => {
    if (!applicants) return []
    return applicants
      .filter(a => studentIds.includes(a.id) && !a.isDeleted)
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }

  const getSummary = (studentIds: string[]) => {
    const students = getStudentsInClass(studentIds)
    const male = students.filter(s => s.gender === 'Laki-laki').length
    const female = students.filter(s => s.gender === 'Perempuan').length
    return { total: students.length, male, female }
  }

  if (loadingClasses) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Kelas</h1>
          <p className="text-muted-foreground mt-1">Kelola rombongan belajar dan distribusi murid otomatis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary">
                <FileDown className="w-4 h-4" /> Laporan Massal
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportAll('attendance')} className="cursor-pointer gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Daftar Hadir Semua (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAll('excel')} className="cursor-pointer gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel Rekap Semua (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAll('pdf')} className="cursor-pointer gap-2">
                <FilePdf className="w-4 h-4 text-destructive" /> PDF Rekap Semua (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={handleSyncStudents} 
            disabled={isSyncing} 
            variant="outline" 
            className="gap-2 border-accent/20 text-accent hover:bg-accent/5"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
            Ambil Data Murid
          </Button>

          <Dialog open={isShuffleDialogOpen} onOpenChange={setIsShuffleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary">
                <Shuffle className="w-4 h-4" /> Acak Murid
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-primary" /> Atur Distribusi Acak
                </DialogTitle>
                <DialogDescription>Tentukan kriteria pembagian kelas otomatis.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <Checkbox 
                    id="balanceGender" 
                    checked={shuffleOptions.balanceGender}
                    onCheckedChange={(checked) => setShuffleOptions(prev => ({ ...prev, balanceGender: !!checked }))}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="balanceGender" className="text-sm font-bold cursor-pointer">Seimbangkan Jenis Kelamin</Label>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Membagi rata Laki-laki & Perempuan di setiap kelas.</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <Checkbox 
                    id="balanceSchool" 
                    checked={shuffleOptions.balanceSchool}
                    onCheckedChange={(checked) => setShuffleOptions(prev => ({ ...prev, balanceSchool: !!checked }))}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="balanceSchool" className="text-sm font-bold cursor-pointer">Seimbangkan Sekolah Asal</Label>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Menyebarkan murid dari sekolah yang sama ke kelas berbeda.</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsShuffleDialogOpen(false)}>Batal</Button>
                <Button onClick={handleShuffle} disabled={isShuffling} className="gap-2">
                  {isShuffling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                  Mulai Acak & Distribusi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if(!o) setEditingClass(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Tambah Rombel</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Rombel' : 'Buat Rombel Baru'}</DialogTitle>
                <DialogDescription>Masukkan detail kelompok belajar.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onClassSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nama Kelas</FormLabel><FormControl><Input placeholder="7-A" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="gradeLevel" render={({ field }) => (
                      <FormItem><FormLabel>Tingkat</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="homeroomTeacher" render={({ field }) => (
                    <FormItem><FormLabel>Wali Kelas</FormLabel><FormControl><Input placeholder="Nama Guru" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem><FormLabel>Kapasitas</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Kelas'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes?.map((cls) => {
          const summary = getSummary(cls.students)
          return (
            <Card key={cls.id} className="border-border/50 hover:border-primary/30 transition-all group relative">
              <Button 
                variant="outline" 
                size="icon" 
                className="absolute top-2 right-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                onClick={() => handleDeleteClassConfirm(cls)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between pr-8">
                  <CardTitle className="font-headline text-2xl">Kelas {cls.name}</CardTitle>
                  <Badge variant="outline">G-{cls.gradeLevel}</Badge>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-3 h-3" /> {cls.currentEnrollment} / {cls.capacity} Murid
                  </CardDescription>
                  <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">
                    Total: {summary.total} (L: {summary.male}, P: {summary.female})
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(100, (cls.currentEnrollment / cls.capacity) * 100)}%` }}></div>
                  </div>
                  <div className="text-sm bg-muted/30 p-2 rounded border border-border/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Wali Kelas</span>
                    <span className="font-medium truncate block">{cls.homeroomTeacher || "-"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleView(cls)} variant="outline" size="sm" className="flex-1 text-xs gap-2 border-primary/20 text-primary">
                      <Eye className="w-3 h-3" /> Daftar
                    </Button>
                    <Button onClick={() => setEditingClass(cls)} variant="outline" size="sm" className="flex-1 text-xs gap-2">
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {classes?.length === 0 && (
          <div className="col-span-full py-20 text-center bg-muted/20 border-2 border-dashed rounded-xl">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">Belum ada rombongan belajar. Tambahkan kelas baru.</p>
          </div>
        )}
      </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-headline text-2xl">Kelas {selectedClassForView?.name}</DialogTitle>
                <DialogDescription>Wali Kelas: {selectedClassForView?.homeroomTeacher || '-'}</DialogDescription>
                {selectedClassForView && (
                  <p className="text-[10px] font-bold text-primary uppercase mt-1 tracking-tight">
                    Total: {getSummary(selectedClassForView.students).total} (L: {getSummary(selectedClassForView.students).male}, P: {getSummary(selectedClassForView.students).female})
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileDown className="w-4 h-4" /> Unduh
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => selectedClassForView && handleExportClass(selectedClassForView, 'attendance')} className="gap-2">
                      <ClipboardList className="w-4 h-4" /> Daftar Hadir (.pdf)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedClassForView && handleExportClass(selectedClassForView, 'excel')} className="gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectedClassForView && handleExportClass(selectedClassForView, 'pdf')} className="gap-2">
                      <FilePdf className="w-4 h-4 text-destructive" /> PDF (.pdf)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            <ScrollArea className="h-[50vh]">
              <Table>
                <TableHeader className="bg-primary/5 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>JK</TableHead>
                    <TableHead>Asal Sekolah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClassForView && getStudentsInClass(selectedClassForView.students).map((s, idx) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">
                        <Link href={`/dashboard/applicants/${s.id}`} className="hover:text-primary transition-colors">
                          {s.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.NISN}</TableCell>
                      <TableCell className="text-xs">{s.gender === 'Laki-laki' ? 'L' : 'P'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.originSchool}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:text-primary">
                          <Link href={`/dashboard/applicants/${s.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedClassForView?.students.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">Belum ada murid di kelas ini.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="p-4 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" /> Konfirmasi Hapus Rombel
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>Kelas {classToDelete?.name}</strong>? Murid di dalamnya akan dikeluarkan dari rombel namun data murid tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus Kelas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
