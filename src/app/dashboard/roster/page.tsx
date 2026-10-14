
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
  ChevronDown,
  RefreshCw,
  Layers,
  LayoutTemplate
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
import { RosterEntry, Staff, Classroom, Subject, TeacherAssignment, RosterConfig } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, format, parse } from 'date-fns'

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MAX_PERIODS = 10 

const PALETTE = [
  [173, 216, 230], [255, 182, 193], [144, 238, 144], [255, 255, 224],
  [255, 218, 185], [221, 160, 221], [175, 238, 238], [240, 230, 140],
  [250, 128, 114], [152, 251, 152], [219, 112, 147], [176, 196, 222],
  [255, 160, 122], [102, 205, 170], [123, 104, 238], [244, 164, 96],
];

export default function RosterManagementPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("builder")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false)
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
  const { data: classes, loading: loadingClasses } = useCollection<Classroom>(classesQuery)
  const { data: subjects } = useCollection<Subject>(subjectsQuery)
  const { data: rosterConfig, loading: loadingConfigDoc } = useDoc<RosterConfig>(configRef)
  const { data: systemSettings } = useDoc<any>(systemSettingsRef)

  const teachers = staff?.filter(s => s.role === 'Guru') || []

  const config = useMemo(() => ({
    entryTime: rosterConfig?.entryTime || "07:00",
    jpDuration: rosterConfig?.jpDuration ?? 40,
    break1Active: rosterConfig?.break1Active ?? true,
    break1Period: rosterConfig?.break1Period ?? 4,
    break1Duration: rosterConfig?.break1Duration ?? 30,
    break2Active: rosterConfig?.break2Active ?? false,
    break2Period: rosterConfig?.break2Period ?? 6,
    break2Duration: rosterConfig?.break2Duration ?? 15
  }), [rosterConfig])

  const getTimeForPeriod = (period: number) => {
    let current = parse(config.entryTime, 'HH:mm', new Date())
    for (let i = 1; i < period; i++) {
      let duration = config.jpDuration
      if (config.break1Active && i === config.break1Period) duration = config.break1Duration
      if (config.break2Active && i === config.break2Period) duration = config.break2Duration
      current = addMinutes(current, duration)
    }
    let currentDuration = config.jpDuration
    if (config.break1Active && period === config.break1Period) currentDuration = config.break1Duration
    if (config.break2Active && period === config.break2Period) currentDuration = config.break2Duration
    
    const end = addMinutes(current, currentDuration)
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

  const teacherCoding = useMemo(() => {
    if (!assignments) return { teacherMap: new Map(), subjectColors: new Map() };
    
    const teacherMap = new Map();
    const subjectColors = new Map();
    
    const uniqueTeacherIds = Array.from(new Set(assignments.map(a => a.teacherId)))
      .sort((a, b) => {
        const nameA = assignments.find(x => x.teacherId === a)?.teacherName || "";
        const nameB = assignments.find(x => x.teacherId === b)?.teacherName || "";
        return nameA.localeCompare(nameB);
      });
      
    uniqueTeacherIds.forEach((id, idx) => {
      teacherMap.set(id, idx + 1);
    });

    const sortedAssignments = [...assignments].sort((a, b) => {
      const tComp = a.teacherName.localeCompare(b.teacherName);
      if (tComp !== 0) return tComp;
      return a.subjectName.localeCompare(b.subjectName);
    });

    sortedAssignments.forEach((asg, idx) => {
      const key = `${asg.teacherId}_${asg.subjectId}`;
      if (!subjectColors.has(key)) {
        subjectColors.set(key, PALETTE[idx % PALETTE.length]);
      }
    });

    return { teacherMap, subjectColors };
  }, [assignments]);

  const handleSyncGlobalBlocks = async () => {
    if (!db || !classes || !rosterEntries) return
    setIsSyncingGlobal(true)
    const batch = writeBatch(db)
    let addedCount = 0

    try {
      for (const cls of classes) {
        for (const day of DAYS) {
          if (config.break1Active) {
            const hasB1 = rosterEntries.some(e => e.classId === cls.id && e.day === day && e.period === config.break1Period)
            if (!hasB1) {
              const ref = doc(collection(db, 'rosterEntries'))
              batch.set(ref, {
                day, period: config.break1Period, classId: cls.id, className: cls.name,
                isActivity: true, activityName: "ISTIRAHAT 1", createdAt: new Date().toISOString()
              })
              addedCount++
            }
          }
          if (config.break2Active) {
            const hasB2 = rosterEntries.some(e => e.classId === cls.id && e.day === day && e.period === config.break2Period)
            if (!hasB2) {
              const ref = doc(collection(db, 'rosterEntries'))
              batch.set(ref, {
                day, period: config.break2Period, classId: cls.id, className: cls.name,
                isActivity: true, activityName: "ISTIRAHAT 2", createdAt: new Date().toISOString()
              })
              addedCount++
            }
          }
        }
      }
      await batch.commit()
      toast({ title: "Blok Global Diterapkan", description: `${addedCount} slot istirahat telah diisi ke seluruh kelas.` })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal" })
    } finally {
      setIsSyncingGlobal(false)
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
      let remaining = (job.totalJP || 0) - job.scheduled
      if (remaining <= 0) continue
      const targetClass = classes.find(c => c.id === job.classId)
      if (!targetClass) continue

      for (const day of DAYS) {
        for (let p = 1; p <= MAX_PERIODS; p++) {
          if (remaining <= 0) break

          const isBreak = (config.break1Active && p === config.break1Period) || (config.break2Active && p === config.break2Period)
          if (isBreak) continue

          const isSlotTaken = localRoster.some(e => e.day === day && e.period === p && e.classId === targetClass.id)
          if (isSlotTaken) continue

          const isTeacherBusy = localRoster.some(e => e.day === day && e.period === p && e.teacherId === job.teacherId)
          if (isTeacherBusy) continue

          let currentBatchSize = 1
          if (remaining >= 2 && p < MAX_PERIODS) {
            const nextP = p + 1
            const isNextBreak = (config.break1Active && nextP === config.break1Period) || (config.break2Active && nextP === config.break2Period)
            const isNextTaken = localRoster.some(e => e.day === day && e.period === nextP && e.classId === targetClass.id)
            const isTeacherBusyNext = localRoster.some(e => e.day === day && e.period === nextP && e.teacherId === job.teacherId)
            
            if (!isNextBreak && !isNextTaken && !isTeacherBusyNext) {
              currentBatchSize = 2
            }
          }

          for (let i = 0; i < currentBatchSize; i++) {
            const currentP = p + i
            const newRef = doc(collection(db, 'rosterEntries'))
            const entry = {
              day, period: currentP, classId: targetClass.id, className: targetClass.name,
              teacherId: job.teacherId, teacherName: job.teacherName,
              subjectId: job.subjectId, subjectName: job.subjectName,
              isActivity: false, createdAt: new Date().toISOString()
            }
            batch.set(newRef, entry)
            localRoster.push({ id: newRef.id, ...entry } as any)
            remaining--
            filledCount++
          }

          if (currentBatchSize > 1) p++
        }
        if (remaining <= 0) break
      }
    }

    if (filledCount > 0) {
      await batch.commit()
      toast({ title: "Generate Berhasil", description: `${filledCount} slot jadwal berhasil diisi otomatis.` })
    } else {
      toast({ title: "Selesai", description: "Tidak ada slot kosong lagi yang bisa diisi otomatis." })
    }
    setIsAutoGenerating(false)
  }

  const handleSaveConfig = async () => {
    if (!configRef) return
    setIsSaving(true)
    await setDoc(configRef, config, { merge: true })
    toast({ title: "Konfigurasi Disimpan" })
    setIsSaving(false)
  }

  const handleDeleteEntry = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'rosterEntries', id))
  }

  const handleAddEntry = async () => {
    if (!db || !newEntry.day || !newEntry.period || !newEntry.classId) {
      toast({ variant: "destructive", title: "Mohon lengkapi data" })
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

  const getEntry = (day: string, period: number, classId: string) => {
    return rosterEntries?.find(e => e.day === day && e.period === period && e.classId === classId)
  }

  const handleDownloadUnified = async () => {
    if (!rosterEntries || !classes || !assignments) return;
    setIsExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF('l', 'mm', 'a4');
      const { teacherMap, subjectColors } = teacherCoding;

      const schoolName = systemSettings?.schoolName || "SIS TERPADU";
      const dinasName = systemSettings?.dinasName || "DINAS PENDIDIKAN";

      doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(67, 97, 238);
      doc.text(dinasName.toUpperCase(), 148.5, 12, { align: "center" });
      doc.text(`MATRIKS JADWAL PELAJARAN TERPADU - ${schoolName.toUpperCase()}`, 148.5, 18, { align: "center" });
      
      const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const tableHead = [['HARI', 'JAM', 'WAKTU', ...sortedClasses.map(c => c.name)]];
      
      const tableBody: any[] = [];
      DAYS.forEach(day => {
        for (let p = 1; p <= MAX_PERIODS; p++) {
          const row: any[] = [];
          // Selalu masukkan 'HARI' di kolom 0 untuk stabilitas indeks, didParseCell akan mengosongkannya secara visual
          row.push(p === 1 ? day : ""); 
          row.push(p);
          row.push(getTimeForPeriod(p));
          sortedClasses.forEach(cls => {
            const entry = getEntry(day, p, cls.id);
            if (entry) {
              if (entry.isActivity) row.push(entry.activityName || "REHAT");
              else row.push(teacherMap.get(entry.teacherId) || "?");
            } else row.push("");
          });
          tableBody.push(row);
        }
      });

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [67, 97, 238], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 8 }, 2: { cellWidth: 15 } },
        didParseCell: (data) => {
          if (data.section === 'body') {
            // Rowspan HARI
            if (data.column.index === 0) {
              const isFirstRowOfDay = (data.row.index % MAX_PERIODS) === 0;
              if (isFirstRowOfDay) {
                data.cell.rowSpan = MAX_PERIODS;
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.halign = 'center';
                data.cell.styles.valign = 'middle';
              }
            }

            // Pewarnaan Jadwal & Penanganan Kebocoran Warna
            if (data.column.index >= 3) {
              // Reset background ke putih agar tidak bocor dari sel sebelumnya
              data.cell.styles.fillColor = [255, 255, 255]; 
              
              const currentDayIdx = Math.floor(data.row.index / MAX_PERIODS);
              const day = DAYS[currentDayIdx];
              const period = (data.row.index % MAX_PERIODS) + 1;
              const clsIdx = data.column.index - 3;
              const cls = sortedClasses[clsIdx];
              
              if (cls) {
                const entry = getEntry(day, period, cls.id);
                if (entry) {
                  if (entry.isActivity) {
                    data.cell.styles.fillColor = [220, 220, 220]; // Abu-abu untuk rehat
                  } else {
                    const color = subjectColors.get(`${entry.teacherId}_${entry.subjectId}`);
                    if (color) data.cell.styles.fillColor = color;
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 0, 0];
                  }
                }
              }
            }
          }
        },
      });

      doc.addPage();
      doc.setFontSize(14).setFont("helvetica", "bold").text("LEGENDA GURU & MATA PELAJARAN", 14, 20);
      
      const uniqueTeachers = Array.from(new Set(assignments.map(a => a.teacherId)))
        .map(id => {
          const tAsgs = assignments.filter(a => a.teacherId === id);
          // Gunakan Set untuk memastikan mata pelajaran tidak dobel tulis
          const distinctSubjects = Array.from(new Set(tAsgs.map(a => a.subjectName)));
          // Sinkronkan urutan ID mapel dengan urutan nama mapel untuk warna silang
          const distinctSubjectIds = distinctSubjects.map(name => tAsgs.find(a => a.subjectName === name)?.subjectId).filter(Boolean) as string[];
          
          return {
            id,
            name: tAsgs[0].teacherName,
            subjects: distinctSubjects,
            subjectIds: distinctSubjectIds,
            code: teacherMap.get(id)
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      autoTable(doc, {
        head: [['KODE', 'NAMA GURU', 'MATA PELAJARAN']],
        body: uniqueTeachers.map(t => ["", t.name, t.subjects.join(", ")]),
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, minCellHeight: 12, valign: 'middle' },
        headStyles: { fillColor: [67, 97, 238], halign: 'center' },
        columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 80 } },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const t = uniqueTeachers[data.row.index];
            const padding = 1.5;
            const size = data.cell.width - (padding * 2);
            // Posisikan kotak tepat di tengah sel secara horizontal & vertikal
            const x = data.cell.x + (data.cell.width - size) / 2;
            const y = data.cell.y + (data.cell.height - size) / 2;
            
            if (t.subjectIds.length >= 2) {
              const color1 = subjectColors.get(`${t.id}_${t.subjectIds[0]}`);
              const color2 = subjectColors.get(`${t.id}_${t.subjectIds[1]}`);
              if (color1) {
                doc.setFillColor(color1[0], color1[1], color1[2]);
                doc.triangle(x, y, x + size, y, x, y + size, 'F');
              }
              if (color2) {
                doc.setFillColor(color2[0], color2[1], color2[2]);
                doc.triangle(x + size, y, x + size, y + size, x, y + size, 'F');
              }
            } else {
              const color = subjectColors.get(`${t.id}_${t.subjectIds[0]}`);
              if (color) doc.setFillColor(color[0], color[1], color[2]);
              doc.rect(x, y, size, size, 'F');
            }
            
            doc.setDrawColor(0, 0, 0).setLineWidth(0.2).rect(x, y, size, size);
            doc.setTextColor(0, 0, 0).setFontSize(9).setFont("helvetica", "bold");
            doc.text(t.code.toString(), x + size / 2, y + size / 2 + 1, { align: 'center', baseline: 'middle' });
          }
        }
      });

      doc.save(`Roster_Matriks_Terpadu_${schoolName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal unduh" });
    } finally {
      setIsExporting(false);
    }
  };

  if (loadingR || loadingConfigDoc || loadingClasses) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Roster</h1>
          <p className="text-muted-foreground mt-1">Plotting jadwal mengajar sesuai beban JP Dapodik.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncGlobalBlocks} disabled={isSyncingGlobal} className="gap-2 border-primary/30 text-primary">
            {isSyncingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Sinkronkan Blok Global
          </Button>
          <Button variant="outline" onClick={handleAutoGenerate} disabled={isAutoGenerating} className="gap-2 border-accent/30 text-accent hover:bg-accent/5">
            {isAutoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Otomatis
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30">
                <Download className="w-4 h-4" /> Unduh Roster <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDownloadUnified}>Format Matriks Terpadu (2 Hal)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Fitur ini segera tersedia." })}>Format Per Kelas (PDF)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Plot Jadwal</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border p-1 mb-6">
          <TabsTrigger value="builder" className="gap-2"><LayoutGrid className="w-4 h-4" /> Jadwal Mingguan</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings2 className="w-4 h-4" /> Konfigurasi Waktu & Istirahat</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/50 bg-primary/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> Progress Dapodik</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
                  {workloadStats.map((w, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-primary truncate max-w-[120px]">{w.teacherName}</span><span className="text-[9px] text-muted-foreground">{w.subjectName} ({w.className})</span></div>
                        <span className="text-[10px] font-bold">{w.scheduled} / {w.totalJP || 0} JP</span>
                      </div>
                      <Progress value={w.percent} className={`h-1.5 ${w.isMet ? 'bg-green-500/20' : 'bg-amber-500/20'}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-8">
            {classes?.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(cls => (
              <Card key={cls.id} className="border-border/50 overflow-hidden shadow-md">
                <CardHeader className="bg-muted/20 border-b py-3 px-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 font-headline uppercase"><Users className="w-4 h-4 text-primary" /> Kelas {cls.name}</CardTitle>
                  <Badge variant="outline" className="font-mono">TINGKAT {cls.gradeLevel}</Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="border-collapse">
                    <TableHeader><TableRow className="bg-muted/10"><TableHead className="w-24 border-r font-bold text-center">WAKTU</TableHead>{DAYS.map(day => <TableHead key={day} className="text-center min-w-[150px] font-bold border-r last:border-r-0">{day.toUpperCase()}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {Array.from({ length: MAX_PERIODS }).map((_, i) => {
                        const period = i + 1
                        const isGlobalBreak = (config.break1Active && period === config.break1Period) || (config.break2Active && period === config.break2Period)
                        return (
                          <TableRow key={period} className={isGlobalBreak ? "bg-muted/5" : ""}>
                            <TableCell className="border-r font-medium text-[10px] text-center p-2">
                              <div className={`font-bold ${isGlobalBreak ? 'text-accent' : 'text-primary'}`}>{isGlobalBreak ? 'REHAT' : `JAM ${period}`}</div>
                              <div className="text-[9px] text-muted-foreground mt-0.5">{getTimeForPeriod(period)}</div>
                            </TableCell>
                            {DAYS.map(day => {
                              const entry = getEntry(day, period, cls.id)
                              return (
                                <TableCell key={day} className="p-1 border-r last:border-r-0 h-24 group relative">
                                  {entry ? (
                                    <div className={`h-full border rounded-lg p-2.5 flex flex-col justify-center transition-all shadow-sm ${entry.isActivity ? 'bg-accent/10 border-accent/20' : 'bg-primary/10 border-primary/20'}`}>
                                      <div className="text-[10px] font-bold truncate uppercase text-foreground leading-tight">{entry.isActivity ? (entry.activityName || "REHAT") : entry.subjectName}</div>
                                      {!entry.isActivity && <div className="text-[9px] text-muted-foreground truncate mt-1 italic">{entry.teacherName}</div>}
                                      <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteEntry(entry.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                    </div>
                                  ) : (
                                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/30 rounded-lg group-hover:border-primary/30 cursor-pointer bg-muted/5" onClick={() => { setNewEntry({...newEntry, day, period, classId: cls.id}); setIsAddOpen(true); }}>
                                      <Plus className="w-4 h-4 text-muted-foreground opacity-20" />
                                      <span className="text-[8px] uppercase tracking-tighter text-muted-foreground opacity-30">Kosong</span>
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
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="border-b bg-muted/5"><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Dasar Waktu Pelajaran</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Jam Masuk Sekolah (Jam Ke-1)</Label>
                  <Input type="time" value={config.entryTime || "07:00"} onChange={e => setDoc(configRef!, { ...config, entryTime: e.target.value || "07:00" }, { merge: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Durasi 1 JP (Menit)</Label>
                  <Input type="number" value={config.jpDuration || 0} onChange={e => setDoc(configRef!, { ...config, jpDuration: parseInt(e.target.value) || 0 }, { merge: true })} />
                </div>
                <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="border-b bg-muted/5"><CardTitle className="text-lg flex items-center gap-2"><Coffee className="w-5 h-5 text-accent" /> Konfigurasi Istirahat</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="p-4 rounded-xl border border-border/50 space-y-4 bg-accent/5">
                  <div className="flex items-center justify-between"><Label className="font-bold">Istirahat Pertama</Label><Switch checked={config.break1Active} onCheckedChange={v => setDoc(configRef!, { ...config, break1Active: v }, { merge: true })} /></div>
                  {config.break1Active && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Pada Jam Ke- (Pilih Jam Genap)</Label>
                        <Select value={config.break1Period?.toString() || "4"} onValueChange={v => setDoc(configRef!, { ...config, break1Period: parseInt(v) }, { merge: true })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="2">Jam Ke-2</SelectItem><SelectItem value="4">Jam Ke-4</SelectItem><SelectItem value="6">Jam Ke-6</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Durasi (Menit)</Label>
                        <Input type="number" value={config.break1Duration || 0} onChange={e => setDoc(configRef!, { ...config, break1Duration: parseInt(e.target.value) || 0 }, { merge: true })} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-border/50 space-y-4 bg-accent/5">
                  <div className="flex items-center justify-between"><Label className="font-bold">Istirahat Kedua</Label><Switch checked={config.break2Active} onCheckedChange={v => setDoc(configRef!, { ...config, break2Active: v }, { merge: true })} /></div>
                  {config.break2Active && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Pada Jam Ke- (Pilih Jam Genap)</Label>
                        <Select value={config.break2Period?.toString() || "6"} onValueChange={v => setDoc(configRef!, { ...config, break2Period: parseInt(v) }, { merge: true })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="4">Jam Ke-4</SelectItem><SelectItem value="6">Jam Ke-6</SelectItem><SelectItem value="8">Jam Ke-8</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Durasi (Menit)</Label>
                        <Input type="number" value={config.break2Duration || 0} onChange={e => setDoc(configRef!, { ...config, break2Duration: parseInt(e.target.value) || 0 }, { merge: true })} />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if(!v) setNewEntry({...newEntry, activityName: ""}); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Plot Jadwal Manual</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-xl">
               <div><Label className="font-bold">Mode Kegiatan Sekolah</Label><p className="text-[10px] text-muted-foreground italic">Agenda non-KBM (Upacara/Istirahat)</p></div>
               <Switch checked={newEntry.isActivity} onCheckedChange={v => setNewEntry({...newEntry, isActivity: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label>Hari</Label><Select value={newEntry.day || "Senin"} onValueChange={v => setNewEntry({...newEntry, day: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
               <div className="space-y-2"><Label>Jam Ke-</Label><Select value={newEntry.period?.toString() || "1"} onValueChange={v => setNewEntry({...newEntry, period: parseInt(v)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({length: MAX_PERIODS}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {newEntry.isActivity ? (
               <div className="space-y-2"><Label>Nama Kegiatan</Label><Input value={newEntry.activityName || ""} onChange={e => setNewEntry({...newEntry, activityName: e.target.value})} placeholder="Contoh: ISTIRAHAT" /></div>
            ) : (
               <div className="space-y-2">
                 <Label>Pilih Penugasan Guru</Label>
                 <Select value={newEntry.teacherId && newEntry.subjectId ? `${newEntry.teacherId}|${newEntry.subjectId}` : ""} onValueChange={v => { const [tId, sId] = v.split('|'); setNewEntry({...newEntry, teacherId: tId, subjectId: sId}); }}>
                   <SelectTrigger><SelectValue placeholder="Pilih Guru & Mapel" /></SelectTrigger>
                   <SelectContent>
                     {assignments?.filter(a => a.classId === newEntry.classId).map(a => (
                       <SelectItem key={a.id} value={`${a.teacherId}|${a.subjectId}`}>{a.teacherName} - {a.subjectName}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
            )}
          </div>
          <DialogFooter><Button onClick={handleAddEntry} disabled={submitting} className="w-full">Simpan ke Roster</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
