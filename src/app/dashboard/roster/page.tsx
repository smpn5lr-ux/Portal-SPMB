
"use client"

import { useState, useMemo } from 'react'
import { 
  CalendarClock, 
  Plus, 
  Settings2, 
  Save, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  Users, 
  BookOpen,
  CheckCircle2,
  Timer,
  Trash,
  Coffee,
  Sparkles,
  Info,
  Check,
  Zap,
  LayoutGrid,
  Download,
  ChevronDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, doc, setDoc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { RosterEntry, Staff, Classroom, Subject, TeacherAssignment } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, format, parse } from 'date-fns'

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MAX_PERIODS = 10 

const PALETTE = [
  [255, 182, 193], // Light Pink
  [173, 216, 230], // Light Blue
  [144, 238, 144], // Light Green
  [255, 255, 224], // Light Yellow
  [255, 218, 185], // Peach
  [221, 160, 221], // Plum
  [175, 238, 238], // Pale Turquoise
  [240, 230, 140], // Khaki
  [250, 128, 114], // Salmon
  [152, 251, 152], // Pale Green
  [219, 112, 147], // Pale Violet Red
  [176, 196, 222], // Steel Blue
  [255, 160, 122], // Light Salmon
  [102, 205, 170], // Medium Aquamarine
  [123, 104, 238], // Medium Slate Blue
  [244, 164, 96],  // Sandy Brown
];

export default function RosterManagementPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("builder")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const [newEntry, setNewEntry] = useState<Partial<RosterEntry>>({
    day: "Senin",
    period: 1,
    teacherId: "",
    classId: "",
    subjectId: "",
    isActivity: false,
    activityName: ""
  })

  const rosterQuery = useMemoFirebase(() => db ? collection(db, 'rosterEntries') : null, [db])
  const assignmentsQuery = useMemoFirebase(() => db ? collection(db, 'teacherAssignments') : null, [db])
  const staffQuery = useMemoFirebase(() => db ? collection(db, 'staff') : null, [db])
  const classesQuery = useMemoFirebase(() => db ? collection(db, 'classes') : null, [db])
  const subjectsQuery = useMemoFirebase(() => db ? collection(db, 'subjects') : null, [db])
  const configRef = useMemoFirebase(() => db ? doc(db, 'settings', 'roster') : null, [db])
  const systemSettingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'system') : null, [db])

  const { data: rosterEntries, loading: loadingR } = useCollection<RosterEntry>(rosterQuery)
  const { data: assignments } = useCollection<TeacherAssignment>(assignmentsQuery)
  const { data: staff } = useCollection<Staff>(staffQuery)
  const { data: classes, loading: loadingC } = useCollection<Classroom>(classesQuery)
  const { data: subjects } = useCollection<Subject>(subjectsQuery)
  const { data: rosterConfig, loading: loadingConfigDoc } = useDoc<any>(configRef)
  const { data: systemSettings } = useDoc<any>(systemSettingsRef)

  const teachers = staff?.filter(s => s.role === 'Guru') || []

  const config = rosterConfig || {
    entryTime: "07:00",
    jpDuration: 40,
    breakTimes: [
      { periodAfter: 4, duration: 15 },
      { periodAfter: 8, duration: 15 }
    ]
  }

  const getTimeForPeriod = (period: number) => {
    let current = parse(config.entryTime, 'HH:mm', new Date())
    for (let i = 1; i < period; i++) {
      current = addMinutes(current, config.jpDuration)
      const isBreak = config.breakTimes?.find((b: any) => b.periodAfter === i)
      if (isBreak) current = addMinutes(current, isBreak.duration)
    }
    const end = addMinutes(current, config.jpDuration)
    return `${format(current, 'HH:mm')} - ${format(end, 'HH:mm')}`
  }

  const workloadStats = useMemo(() => {
    if (!assignments || !rosterEntries) return []
    return assignments.map(a => {
      const scheduledCount = rosterEntries.filter(e => 
        e.teacherId === a.teacherId && 
        e.subjectId === a.subjectId && 
        e.classId === a.classId
      ).length
      return {
        ...a,
        scheduled: scheduledCount,
        isMet: scheduledCount >= (a.totalJP || 0),
        percent: Math.min(100, Math.round((scheduledCount / (a.totalJP || 1)) * 100))
      }
    })
  }, [assignments, rosterEntries])

  const assignmentCodes = useMemo(() => {
    if (!assignments) return new Map<string, { code: number; color: number[] }>();
    const map = new Map<string, { code: number; color: number[] }>();
    
    const uniquePairs = assignments.reduce((acc, curr) => {
      const key = `${curr.teacherId}_${curr.subjectId}`;
      if (!acc.find(i => i.key === key)) {
        acc.push({ key, name: curr.teacherName, subject: curr.subjectName });
      }
      return acc;
    }, [] as any[]).sort((a, b) => a.name.localeCompare(b.name));

    uniquePairs.forEach((pair, idx) => {
      map.set(pair.key, {
        code: idx + 1,
        color: PALETTE[idx % PALETTE.length]
      });
    });
    return map;
  }, [assignments]);

  const handleDownloadRoster = async (mode: 'consolidated' | 'per-class') => {
    if (!classes || !rosterEntries || !assignments) return
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN"
      const schoolName = systemSettings?.schoolName || "SIS TERPADU"
      const brandBlue = [67, 97, 238] as [number, number, number]

      if (mode === 'consolidated') {
        const doc = new jsPDF('l', 'mm', 'a4')
        
        doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
        doc.text(`MATRIKS ROSTER JADWAL PELAJARAN TERPADU`, 148.5, 15, { align: "center" })
        doc.setFontSize(9).setTextColor(100).setFont("helvetica", "normal")
        doc.text(`${dinasName} | ${schoolName}`, 148.5, 21, { align: "center" })
        doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]).setLineWidth(0.3).line(14, 25, 283, 25)

        const sortedClasses = [...classes].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        const headers = [['HARI', 'JAM', 'WAKTU', ...sortedClasses.map(c => c.name)]]
        
        const body: any[] = []
        DAYS.forEach(day => {
          for (let p = 1; p <= MAX_PERIODS; p++) {
            const row: any[] = []
            
            // Kolom HARI dengan rowSpan
            if (p === 1) {
              row.push({ content: day.toUpperCase(), rowSpan: MAX_PERIODS, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [240, 240, 240] } })
            }
            
            row.push(p)
            row.push(getTimeForPeriod(p))

            sortedClasses.forEach(cls => {
              const entry = rosterEntries.find(e => e.day === day && e.period === p && e.classId === cls.id)
              if (!entry) {
                row.push("-")
              } else if (entry.isActivity) {
                row.push(entry.activityName || "KEG")
              } else {
                const key = `${entry.teacherId}_${entry.subjectId}`
                const codeData = assignmentCodes.get(key)
                row.push(codeData ? codeData.code.toString() : "?")
              }
            })
            body.push(row)
          }
        })

        autoTable(doc, {
          head: headers,
          body: body,
          startY: 30,
          theme: 'grid',
          headStyles: { fillColor: brandBlue, textColor: [255, 255, 255], halign: 'center', fontSize: 7, cellPadding: 1.5 },
          styles: { fontSize: 6, cellPadding: 1, halign: 'center', valign: 'middle' },
          columnStyles: { 
            0: { cellWidth: 15 }, 
            1: { cellWidth: 8, fontStyle: 'bold' },
            2: { cellWidth: 20 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 2) {
              const val = data.cell.text[0]
              if (val && val !== "-" && !isNaN(Number(val))) {
                const codeNum = parseInt(val)
                const match = Array.from(assignmentCodes.values()).find(v => v.code === codeNum)
                if (match) {
                  data.cell.styles.fillColor = match.color as [number, number, number]
                  data.cell.styles.fontStyle = 'bold'
                  data.cell.styles.fontSize = 7
                }
              } else if (val && val !== "-" && isNaN(Number(val))) {
                data.cell.styles.fillColor = [235, 245, 255]
                data.cell.styles.fontSize = 5
              }
            }
          }
        })

        // HALAMAN 2: LEGENDA
        doc.addPage()
        doc.setFontSize(14).setFont("helvetica", "bold").setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
        doc.text(`LEGENDA KODE GURU & MATA PELAJARAN`, 148.5, 15, { align: "center" })
        doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]).setLineWidth(0.5).line(14, 20, 283, 20)

        const legendBody = Array.from(assignmentCodes.entries()).map(([key, val]) => {
          const asg = assignments.find(a => `${a.teacherId}_${a.subjectId}` === key)
          return [val.code, asg?.teacherName || "-", asg?.subjectName || "-"]
        }).sort((a, b) => (a[0] as number) - (b[0] as number))

        autoTable(doc, {
          head: [['KODE', 'NAMA GURU', 'MATA PELAJARAN']],
          body: legendBody,
          startY: 30,
          theme: 'striped',
          headStyles: { fillColor: brandBlue },
          columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const codeNum = data.cell.raw as number
              const match = Array.from(assignmentCodes.values()).find(v => v.code === codeNum)
              if (match) {
                data.cell.styles.fillColor = match.color as [number, number, number]
              }
            }
          }
        })

        doc.save(`Roster_Matriks_Terpadu.pdf`)
      } else {
        // MODE PER KELAS
        const doc = new jsPDF('l', 'mm', 'a4')
        const sortedClasses = [...classes].sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

        sortedClasses.forEach((cls, idx) => {
          if (idx > 0) doc.addPage()
          
          doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
          doc.text(dinasName.toUpperCase(), 148.5, 15, { align: "center" })
          doc.text(schoolName.toUpperCase(), 148.5, 22, { align: "center" })
          doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]).setLineWidth(0.5).line(14, 26, 283, 26)

          doc.setFontSize(14).setTextColor(0).text(`JADWAL PELAJARAN - KELAS ${cls.name}`, 14, 35)
          doc.setFontSize(10).setTextColor(100).text(`Wali Kelas: ${cls.homeroomTeacher || '-'}`, 14, 42)

          const headers = [['JAM', 'WAKTU', ...DAYS]]
          const body: any[] = []

          for (let p = 1; p <= MAX_PERIODS; p++) {
            const row = [p, getTimeForPeriod(p)]
            DAYS.forEach(day => {
              const entry = rosterEntries.find(e => e.day === day && e.period === p && e.classId === cls.id)
              if (!entry) {
                row.push("-")
              } else if (entry.isActivity) {
                row.push(entry.activityName || "KEGIATAN")
              } else {
                row.push(`${entry.subjectName}\n(${entry.teacherName})`)
              }
            })
            body.push(row)
          }

          autoTable(doc, {
            head: headers,
            body: body,
            startY: 48,
            theme: 'grid',
            headStyles: { fillColor: brandBlue, halign: 'center' },
            styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 25 } }
          })
        })

        doc.save(`Roster_Per_Kelas.pdf`)
      }
      
      toast({ title: "Unduh Berhasil", description: "Laporan roster telah disimpan." })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Gagal Mengunduh" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleSaveConfig = async (e: any) => {
    e.preventDefault()
    if (!configRef) return
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const newConfig = {
      ...config,
      entryTime: formData.get('entryTime'),
      jpDuration: parseInt(formData.get('jpDuration') as string),
    }
    await setDoc(configRef, newConfig, { merge: true })
    toast({ title: "Konfigurasi Disimpan" })
    setIsSaving(false)
  }

  const handleAddBreak = async () => {
    if (!configRef) return
    const updatedBreaks = [...(config.breakTimes || []), { periodAfter: 1, duration: 15 }]
      .sort((a, b) => a.periodAfter - b.periodAfter)
    await setDoc(configRef, { ...config, breakTimes: updatedBreaks }, { merge: true })
  }

  const handleUpdateBreak = async (index: number, field: string, value: any) => {
    if (!configRef) return
    const updatedBreaks = [...config.breakTimes]
    updatedBreaks[index] = { ...updatedBreaks[index], [field]: parseInt(value) }
    await setDoc(configRef, { ...config, breakTimes: updatedBreaks }, { merge: true })
  }

  const handleRemoveBreak = async (index: number) => {
    if (!configRef) return
    const updatedBreaks = config.breakTimes.filter((_: any, i: number) => i !== index)
    await setDoc(configRef, { ...config, breakTimes: updatedBreaks }, { merge: true })
  }

  const handleAddEntry = async () => {
    if (!db || !newEntry.day || !newEntry.period || !newEntry.classId) {
      toast({ variant: "destructive", title: "Pilih Hari, Jam, dan Kelas" })
      return
    }

    if (!newEntry.isActivity && (!newEntry.teacherId || !newEntry.subjectId)) {
      toast({ variant: "destructive", title: "Pilih Guru dan Mata Pelajaran" })
      return
    }

    if (!newEntry.isActivity) {
      const teacherConflict = rosterEntries?.find(e => 
        e.day === newEntry.day && 
        e.period === newEntry.period && 
        e.teacherId === newEntry.teacherId
      )
      if (teacherConflict) {
        toast({ variant: "destructive", title: "Guru Bentrok!", description: `Guru tersebut sudah mengajar di Kelas ${teacherConflict.className} pada jam ini.` })
        return
      }
    }

    const classConflict = rosterEntries?.find(e => e.day === newEntry.day && e.period === newEntry.period && e.classId === newEntry.classId)
    if (classConflict) {
      toast({ variant: "destructive", title: "Kelas Bentrok!", description: `Rombel ini sudah terisi ${classConflict.isActivity ? 'kegiatan' : classConflict.subjectName} pada jam ini.` })
      return
    }

    setSubmitting(true)
    const t = teachers.find(t => t.id === newEntry.teacherId)
    const c = classes?.find(c => c.id === newEntry.classId)
    const s = subjects?.find(s => s.id === newEntry.subjectId)

    try {
      await addDoc(collection(db, 'rosterEntries'), {
        ...newEntry,
        teacherName: newEntry.isActivity ? null : t?.fullName,
        className: c?.name,
        subjectName: newEntry.isActivity ? null : s?.name,
        createdAt: new Date().toISOString()
      })
      toast({ title: "Jadwal Ditambahkan" })
      setIsAddOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAutoGenerate = async () => {
    if (!db || !assignments || !rosterEntries || !classes) return
    
    setIsAutoGenerating(true)
    const batch = writeBatch(db)
    let filledCount = 0
    const localRoster = [...rosterEntries]

    const unfinished = workloadStats
      .filter(w => !w.isMet)
      .sort(() => Math.random() - 0.5)

    for (const job of unfinished) {
      let remaining = job.totalJP - job.scheduled
      if (remaining <= 0) continue

      const targetClass = classes.find(c => c.id === job.classId)
      if (!targetClass) continue

      for (const day of DAYS) {
        for (let p = 1; p <= MAX_PERIODS; p++) {
          if (remaining <= 0) break
          const isSlotTaken = localRoster.some(e => e.day === day && e.period === p && e.classId === targetClass.id)
          if (isSlotTaken) continue
          const isTeacherBusy = localRoster.some(e => e.day === day && e.period === p && e.teacherId === job.teacherId)
          if (isTeacherBusy) continue

          const newRef = doc(collection(db, 'rosterEntries'))
          const entry = {
            day,
            period: p,
            classId: targetClass.id,
            className: targetClass.name,
            teacherId: job.teacherId,
            teacherName: job.teacherName,
            subjectId: job.subjectId,
            subjectName: job.subjectName,
            isActivity: false,
            createdAt: new Date().toISOString()
          }

          batch.set(newRef, entry)
          localRoster.push({ id: newRef.id, ...entry })
          remaining--
          filledCount++
        }
        if (remaining <= 0) break
      }
    }

    if (filledCount > 0) {
      await batch.commit()
      toast({ title: "Generate Berhasil", description: `${filledCount} slot jadwal berhasil diisi otomatis.` })
    } else {
      toast({ title: "Tidak Ada Slot Cocok", description: "Semua slot penuh atau tidak ditemukan slot bebas bentrok untuk guru yang tersisa." })
    }
    setIsAutoGenerating(false)
  }

  const handleDeleteEntry = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'rosterEntries', id))
  }

  const getEntry = (day: string, period: number, classId: string) => {
    return rosterEntries?.find(e => e.day === day && e.period === period && e.classId === classId)
  }

  if (loadingR || loadingC || loadingConfigDoc) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Roster</h1>
          <p className="text-muted-foreground mt-1">Plotting jadwal mengajar sesuai beban JP Dapodik (Senin - Sabtu).</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isExporting}
                className="gap-2 border-primary/30"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Unduh Roster <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownloadRoster('consolidated')}>
                Format Matriks Terpadu (2 Halaman)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadRoster('per-class')}>
                Format Per Kelas (Satu Halaman/Kelas)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            onClick={handleAutoGenerate} 
            disabled={isAutoGenerating}
            className="gap-2 border-accent/30 text-accent hover:bg-accent/5"
          >
            {isAutoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Otomatis
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Plot Jadwal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 bg-primary/5">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" /> Tracking Beban Jam
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 pt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Progres Plotting per Penugasan:</p>
                <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
                   {workloadStats.map((w, idx) => (
                      <div key={idx} className="space-y-1.5">
                         <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-primary truncate max-w-[120px]">{w.teacherName}</span>
                               <span className="text-[9px] text-muted-foreground">{w.subjectName} ({w.className})</span>
                            </div>
                            <span className="text-[10px] font-bold">{w.scheduled} / {w.totalJP} JP</span>
                         </div>
                         <Progress value={w.percent} className={`h-1.5 ${w.isMet ? 'bg-green-500/20' : 'bg-amber-500/20'}`} />
                      </div>
                   ))}
                   {workloadStats.length === 0 && <p className="text-[10px] text-muted-foreground italic">Belum ada data penugasan.</p>}
                </div>
             </CardContent>
          </Card>

          <Card className="border-border/50">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Operasional</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 pt-2">
                <div className="space-y-1">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">Mulai Pelajaran</span>
                   <p className="text-sm font-bold">{config.entryTime} WIB</p>
                </div>
                <div className="space-y-1">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">Durasi per JP</span>
                   <p className="text-sm font-bold">{config.jpDuration} Menit</p>
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab("settings")}>Ubah Konfigurasi</Button>
             </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 border border-border/50 p-1">
              <TabsTrigger value="builder" className="gap-2"><LayoutGrid className="w-4 h-4" /> Jadwal Mingguan</TabsTrigger>
              <TabsTrigger value="settings" className="gap-2"><Settings2 className="w-4 h-4" /> Konfigurasi Waktu</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-8 mt-6">
              {classes?.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(cls => (
                <Card key={cls.id} className="border-border/50 overflow-hidden shadow-md">
                  <CardHeader className="bg-muted/20 border-b py-3 px-6 flex flex-row items-center justify-between">
                     <CardTitle className="text-lg flex items-center gap-2 font-headline uppercase"><Users className="w-4 h-4 text-primary" /> Kelas {cls.name}</CardTitle>
                     <Badge variant="outline" className="font-mono">TINGKAT {cls.gradeLevel}</Badge>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="bg-muted/10">
                          <TableHead className="w-24 border-r font-bold text-center">WAKTU</TableHead>
                          {DAYS.map(day => <TableHead key={day} className="text-center min-w-[150px] font-bold border-r last:border-r-0">{day.toUpperCase()}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: MAX_PERIODS }).map((_, i) => {
                          const period = i + 1
                          return (
                            <TableRow key={period} className="hover:bg-transparent">
                              <TableCell className="border-r font-medium text-[10px] bg-muted/5 text-center p-2">
                                 <div className="font-bold text-primary">JAM {period}</div>
                                 <div className="text-[9px] text-muted-foreground mt-0.5">{getTimeForPeriod(period)}</div>
                              </TableCell>
                              {DAYS.map(day => {
                                const entry = getEntry(day, period, cls.id)
                                return (
                                  <TableCell key={day} className="p-1 border-r last:border-r-0 h-24 group relative">
                                    {entry ? (
                                      <div className={`h-full border rounded-lg p-2.5 flex flex-col justify-center transition-all shadow-sm ${entry.isActivity ? 'bg-accent/10 border-accent/20' : 'bg-primary/10 border-primary/20'}`}>
                                        <div className="text-[10px] font-bold truncate uppercase text-foreground leading-tight">{entry.isActivity ? entry.activityName : entry.subjectName}</div>
                                        {!entry.isActivity && <div className="text-[9px] text-muted-foreground truncate mt-1 italic">{entry.teacherName}</div>}
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                          onClick={() => handleDeleteEntry(entry.id)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-lg group-hover:border-primary/30 transition-all cursor-pointer bg-muted/5 hover:bg-primary/5" 
                                        onClick={() => {
                                          setNewEntry({...newEntry, day, period, classId: cls.id});
                                          setIsAddOpen(true);
                                        }}
                                      >
                                        <Plus className="w-4 h-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                        <span className="text-[8px] uppercase tracking-tighter text-muted-foreground opacity-30 group-hover:opacity-100 mt-1">Kosong</span>
                                      </div>
                                    )}
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="border-border/50">
                    <CardHeader className="border-b bg-muted/5"><CardTitle className="text-lg">Parameter Jam Sekolah</CardTitle></CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSaveConfig} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                           <div className="space-y-2">
                             <Label className="text-xs font-bold uppercase text-muted-foreground">Jam Pelajaran Ke-1 Dimulai</Label>
                             <Input name="entryTime" type="time" defaultValue={config.entryTime} />
                           </div>
                           <div className="space-y-2">
                             <Label className="text-xs font-bold uppercase text-muted-foreground">Durasi Pelajaran (per JP) - Menit</Label>
                             <Input name="jpDuration" type="number" defaultValue={config.jpDuration} />
                             <p className="text-[10px] text-muted-foreground italic">Contoh: 40 menit per satu jam pelajaran.</p>
                           </div>
                        </div>
                        <Button type="submit" disabled={isSaving} className="w-full h-11 gap-2">
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Simpan Konfigurasi
                        </Button>
                      </form>
                    </CardContent>
                 </Card>

                 <Card className="border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5">
                       <CardTitle className="text-lg">Jeda Istirahat</CardTitle>
                       <Button size="sm" variant="outline" onClick={handleAddBreak} className="h-8 gap-1"><Plus className="w-3.5 h-3.5" /> Tambah</Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                       {(!config.breakTimes || config.breakTimes.length === 0) && (
                         <div className="text-center py-10 text-muted-foreground text-sm italic">Belum ada pengaturan istirahat.</div>
                       )}
                       {config.breakTimes?.map((b: any, i: number) => (
                         <div key={i} className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border border-border/50 animate-in fade-in">
                            <div className="flex-1 space-y-1.5">
                               <Label className="text-[10px] font-bold uppercase text-muted-foreground">Setelah Jam Ke</Label>
                               <Input type="number" value={b.periodAfter} onChange={e => handleUpdateBreak(i, 'periodAfter', e.target.value)} className="h-9" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                               <Label className="text-[10px] font-bold uppercase text-muted-foreground">Durasi (Menit)</Label>
                               <Input type="number" value={b.duration} onChange={e => handleUpdateBreak(i, 'duration', e.target.value)} className="h-9" />
                            </div>
                            <Button variant="ghost" size="icon" className="mt-5 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveBreak(i)}><Trash2 className="w-4 h-4" /></Button>
                         </div>
                       ))}
                    </CardContent>
                 </Card>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Plot Jadwal Manual</DialogTitle><DialogDescription>Pilih hari, jam, dan penugasan yang ingin di-plot.</DialogDescription></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-xl">
               <div className="space-y-0.5">
                  <Label className="font-bold text-sm">Mode Kegiatan Sekolah</Label>
                  <p className="text-[10px] text-muted-foreground italic">Gunakan untuk agenda non-KBM (Upacara, Sholat, Literasi)</p>
               </div>
               <Switch checked={newEntry.isActivity} onCheckedChange={v => setNewEntry({...newEntry, isActivity: v})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase">Hari</Label>
                 <Select value={newEntry.day} onValueChange={v => setNewEntry({...newEntry, day: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase">Jam Ke-</Label>
                 <Select value={newEntry.period?.toString()} onValueChange={v => setNewEntry({...newEntry, period: parseInt(v)})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{Array.from({length: MAX_PERIODS}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
            </div>

            {newEntry.isActivity ? (
               <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase">Nama Kegiatan</Label>
                 <Input placeholder="Contoh: Upacara Bendera / Literasi" value={newEntry.activityName} onChange={e => setNewEntry({...newEntry, activityName: e.target.value})} />
               </div>
            ) : (
               <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-primary">Pilih Penugasan Guru (Sesuai Rombel)</Label>
                  <Select value={`${newEntry.teacherId}|${newEntry.subjectId}`} onValueChange={v => {
                     const [tId, sId] = v.split('|');
                     setNewEntry({...newEntry, teacherId: tId, subjectId: sId});
                  }}>
                     <SelectTrigger className="h-12">
                       <SelectValue placeholder="Pilih Guru & Mata Pelajaran" />
                     </SelectTrigger>
                     <SelectContent>
                        {assignments?.filter(a => a.classId === newEntry.classId).map(a => (
                           <SelectItem key={a.id} value={`${a.teacherId}|${a.subjectId}`}>
                             <div className="flex flex-col items-start text-xs py-1">
                               <span className="font-bold">{a.teacherName}</span>
                               <span className="text-[10px] text-muted-foreground">{a.subjectName} (Target: {a.totalJP} JP)</span>
                             </div>
                           </SelectItem>
                        ))}
                        {assignments?.filter(a => a.classId === newEntry.classId).length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground italic">Belum ada penugasan guru di kelas ini.</div>
                        )}
                     </SelectContent>
                  </Select>
               </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddEntry} disabled={submitting} className="w-full h-11 gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Simpan ke Roster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
