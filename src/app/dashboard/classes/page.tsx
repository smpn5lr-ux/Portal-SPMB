
"use client"

import { useState, useEffect, useMemo } from 'react'
import { 
  Users, 
  Trash2, 
  Printer, 
  Shuffle, 
  CheckCircle2, 
  Save,
  RotateCcw,
  LayoutGrid,
  Settings2,
  Loader2,
  Plus,
  Pencil,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText as FilePdf,
  ChevronDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, doc, updateDoc, writeBatch, addDoc, query, orderBy } from 'firebase/firestore'
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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as XLSX from 'xlsx'

const classFormSchema = z.object({
  name: z.string().min(1, "Nama kelas harus diisi"),
  gradeLevel: z.string().min(1, "Tingkat harus diisi"),
  homeroomTeacher: z.string().optional(),
  capacity: z.string().min(1, "Kapasitas harus diisi"),
})

export default function ClassesPage() {
  const [isShuffling, setIsShuffling] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Classroom | null>(null)
  const [selectedClassForView, setSelectedClassForView] = useState<Classroom | null>(null)
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

  const { data: classes, loading: loadingClasses } = useCollection<Classroom>(classesQuery)
  const { data: applicants } = useCollection<Applicant>(applicantsQuery)

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
        description: `Kelas dengan nama "${values.name}" sudah ada di sistem.`,
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
          toast({
            title: "Kelas Diperbarui",
            description: `Data kelas ${values.name} berhasil disimpan.`,
          })
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: classRef.path,
            operation: 'update',
            requestResourceData: classData
          }))
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
          toast({
            title: "Kelas Berhasil Dibuat",
            description: `Kelas ${values.name} telah ditambahkan ke sistem.`,
          })
        })
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'classes',
            operation: 'create',
            requestResourceData: newClass
          }))
        })
        .finally(() => setSubmitting(false))
    }
  }

  const handleEdit = (cls: Classroom) => {
    setEditingClass(cls)
    setIsDialogOpen(true)
  }

  const handleView = (cls: Classroom) => {
    setSelectedClassForView(cls)
    setIsViewOpen(true)
  }

  const getStudentsInClass = (studentIds: string[]) => {
    if (!applicants) return []
    return applicants.filter(a => studentIds.includes(a.id))
  }

  const handleShuffle = () => {
    if (!applicants || !classes || !db) return
    setIsShuffling(true)
    
    setTimeout(async () => {
      let acceptedStudents = applicants.filter(a => a.admissionStatus === 'accepted')
      acceptedStudents = [...acceptedStudents].sort(() => Math.random() - 0.5)
      
      const batch = writeBatch(db)
      
      classes.forEach((cls, idx) => {
        const perClass = Math.ceil(acceptedStudents.length / classes.length)
        const classStudents = acceptedStudents.slice(idx * perClass, (idx + 1) * perClass)
        const studentIds = classStudents.map(s => s.id)
        
        const classRef = doc(db, 'classes', cls.id)
        batch.update(classRef, {
          currentEnrollment: studentIds.length,
          students: studentIds
        })
      })

      batch.commit().then(() => {
        toast({
          title: "Distribusi Selesai",
          description: "Siswa telah berhasil diacak dan didistribusikan ke kelas.",
        })
      }).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'classes',
          operation: 'update'
        }))
      })
      setIsShuffling(false)
    }, 2000)
  }

  const handleExportClass = async (cls: Classroom, format: 'excel' | 'pdf') => {
    if (!applicants) return
    setIsExporting(true)
    const students = getStudentsInClass(cls.students)
    
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
        XLSX.writeFile(workbook, `Daftar_Siswa_Kelas_${cls.name}.xlsx`)
      } else {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.setTextColor(67, 97, 238)
        doc.text(`Daftar Siswa Kelas ${cls.name}`, 14, 15)
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Wali Kelas: ${cls.homeroomTeacher || '-'} | Total: ${students.length} Siswa`, 14, 22)
        
        const body = students.map((s, idx) => [idx + 1, s.fullName, s.NISN, s.gender, s.originSchool])
        autoTable(doc, {
          head: [['No.', 'Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Sekolah Asal']],
          body: body,
          startY: 30,
          headStyles: { fillColor: [67, 97, 238] }
        })
        doc.save(`Daftar_Siswa_Kelas_${cls.name}.pdf`)
      }
      toast({ title: "Export Berhasil", description: `Data kelas ${cls.name} telah diunduh.` })
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Gagal mengekspor data." })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAllClasses = async (format: 'excel' | 'pdf') => {
    if (!classes || !applicants) return
    setIsExporting(true)

    try {
      if (format === 'excel') {
        const workbook = XLSX.utils.book_new()
        classes.forEach(cls => {
          const students = getStudentsInClass(cls.students)
          const data = students.map((s, idx) => ({
            "No.": idx + 1,
            "Nama Lengkap": s.fullName,
            "NISN": s.NISN,
            "Jenis Kelamin": s.gender,
            "Sekolah Asal": s.originSchool
          }))
          const worksheet = XLSX.utils.json_to_sheet(data)
          XLSX.utils.book_append_sheet(workbook, worksheet, `Kelas ${cls.name}`)
        })
        XLSX.writeFile(workbook, `Rekap_Semua_Kelas_PPDB.xlsx`)
      } else {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        
        classes.forEach((cls, idx) => {
          if (idx > 0) doc.addPage()
          const students = getStudentsInClass(cls.students)
          doc.setFontSize(16)
          doc.setTextColor(67, 97, 238)
          doc.text(`Daftar Siswa Kelas ${cls.name}`, 14, 15)
          doc.setFontSize(10)
          doc.setTextColor(100)
          doc.text(`Wali Kelas: ${cls.homeroomTeacher || '-'} | Total: ${students.length} Siswa`, 14, 22)
          
          const body = students.map((s, idx) => [idx + 1, s.fullName, s.NISN, s.gender, s.originSchool])
          autoTable(doc, {
            head: [['No.', 'Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Sekolah Asal']],
            body: body,
            startY: 30,
            headStyles: { fillColor: [67, 97, 238] }
          })
        })
        doc.save(`Rekap_Semua_Kelas_PPDB.pdf`)
      }
      toast({ title: "Export Berhasil", description: "Laporan gabungan seluruh kelas telah diunduh." })
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Gagal mengekspor data." })
    } finally {
      setIsExporting(false)
    }
  }

  if (loadingClasses) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Kelas</h1>
          <p className="text-muted-foreground mt-1">Distribusi rombongan belajar otomatis menggunakan data real-time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                <FileDown className="w-4 h-4" />
                Download Semua Rombel
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border/50">
              <DropdownMenuItem onClick={() => handleExportAllClasses('excel')} className="cursor-pointer gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-500" /> Format Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportAllClasses('pdf')} className="cursor-pointer gap-2">
                <FilePdf className="w-4 h-4 text-destructive" /> Format PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Shuffle className="w-4 h-4" />
                Acak Kelas Otomatis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="font-headline">Pengaturan Distribusi Otomatis</DialogTitle>
                <DialogDescription>
                  Sistem akan mendistribusikan siswa yang diterima secara seimbang ke seluruh rombel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    'Keseimbangan Jenis Kelamin',
                    'Distribusi Nilai Akademik Seimbang',
                    'Distribusi Sekolah Asal Seimbang',
                    'Kapasitas Maksimal Kelas'
                  ].map((pref) => (
                    <div key={pref} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{pref}</span>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Batal</Button>
                <Button onClick={handleShuffle} disabled={isShuffling} className="bg-primary hover:bg-primary/90">
                  {isShuffling ? 'Proses...' : 'Mulai Distribusi'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setEditingClass(null)
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                Tambah Kelas Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {editingClass ? 'Edit Rombel' : 'Buat Rombel Baru'}
                </DialogTitle>
                <DialogDescription>
                  {editingClass ? 'Perbarui informasi kelompok belajar.' : 'Tambahkan kelompok belajar baru untuk tingkat yang tersedia.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onClassSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Kelas</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: 7-D" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gradeLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tingkat (Grade)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="homeroomTeacher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wali Kelas (Opsional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama Guru" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kapasitas Siswa</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Kelas'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes?.map((cls) => (
          <Card key={cls.id} className="border-border/50 hover:border-primary/30 transition-all duration-300 group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline text-2xl">Kelas {cls.name}</CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">Grade {cls.gradeLevel}</Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Users className="w-3 h-3" />
                {cls.currentEnrollment} / {cls.capacity} Siswa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-1000" 
                    style={{ width: `${(cls.currentEnrollment / cls.capacity) * 100}%` }}
                  ></div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wali Kelas</p>
                  <p className="text-sm font-medium mt-1">{cls.homeroomTeacher || "Belum ditentukan"}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleView(cls)}
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-9 text-xs gap-2 border-primary/20 text-primary hover:bg-primary/5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Daftar
                  </Button>
                  <Button 
                    onClick={() => handleEdit(cls)}
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-9 text-xs gap-2"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {classes?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
             <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
             <p className="text-muted-foreground">Belum ada kelas yang terdaftar. Silakan tambah kelas baru.</p>
          </div>
        )}
      </div>

      {/* DIALOG LIHAT DAFTAR SISWA */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 border-border/50 bg-card">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-headline text-2xl">Daftar Siswa Kelas {selectedClassForView?.name}</DialogTitle>
                <DialogDescription>
                  Wali Kelas: {selectedClassForView?.homeroomTeacher || '-'} | Total: {selectedClassForView?.students.length} Siswa
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Printer className="w-4 h-4" /> Cetak
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-border/50">
                    <DropdownMenuItem 
                      onClick={() => selectedClassForView && handleExportClass(selectedClassForView, 'excel')} 
                      className="cursor-pointer gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => selectedClassForView && handleExportClass(selectedClassForView, 'pdf')} 
                      className="cursor-pointer gap-2"
                    >
                      <FilePdf className="w-4 h-4 text-destructive" /> PDF (.pdf)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            <ScrollArea className="h-[50vh] pr-4">
              <Table>
                <TableHeader className="bg-primary/5 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[60px] font-bold text-primary">No.</TableHead>
                    <TableHead className="font-bold text-primary">Nama Lengkap</TableHead>
                    <TableHead className="font-bold text-primary">NISN</TableHead>
                    <TableHead className="font-bold text-primary">Gender</TableHead>
                    <TableHead className="font-bold text-primary">Sekolah Asal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClassForView && getStudentsInClass(selectedClassForView.students).map((student, idx) => (
                    <TableRow key={student.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{student.fullName}</TableCell>
                      <TableCell className="font-mono text-xs">{student.NISN}</TableCell>
                      <TableCell className="text-xs">{student.gender}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{student.originSchool}</TableCell>
                    </TableRow>
                  ))}
                  {selectedClassForView?.students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                        Belum ada siswa yang didistribusikan ke kelas ini.
                      </TableCell>
                    </TableRow>
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

      {isShuffling && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <Shuffle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold">Mengacak Distribusi Kelas...</h2>
              <p className="text-muted-foreground mt-2">Menyeimbangkan data siswa yang diterima di database.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
