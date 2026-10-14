
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
  Check
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore'
import { RosterEntry, Staff, Classroom, Subject, TeacherAssignment } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, format, parse } from 'date-fns'

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MAX_PERIODS = 12

export default function RosterManagementPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("builder")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [newEntry, setNewEntry] = useState<Partial<RosterEntry>>({
    day: "Senin",
    period: 1,
    teacherId: "",
    classId: "",
    subjectId: "",
    isActivity: false,
    activityName: ""
  })

  // Queries
  const rosterQuery = useMemoFirebase(() => db ? collection(db, 'rosterEntries') : null, [db])
  const assignmentsQuery = useMemoFirebase(() => db ? collection(db, 'teacherAssignments') : null, [db])
  const staffQuery = useMemoFirebase(() => db ? collection(db, 'staff') : null, [db])
  const classesQuery = useMemoFirebase(() => db ? collection(db, 'classes') : null, [db])
  const subjectsQuery = useMemoFirebase(() => db ? collection(db, 'subjects') : null, [db])
  const configRef = useMemoFirebase(() => db ? doc(db, 'settings', 'roster') : null, [db])

  const { data: rosterEntries, loading: loadingR } = useCollection<RosterEntry>(rosterQuery)
  const { data: assignments } = useCollection<TeacherAssignment>(assignmentsQuery)
  const { data: staff } = useCollection<Staff>(staffQuery)
  const { data: classes } = useCollection<Classroom>(classesQuery)
  const { data: subjects } = useCollection<Subject>(subjectsQuery)
  const { data: rosterConfig, loading: loadingC } = useDoc<any>(configRef)

  const teachers = staff?.filter(s => s.role === 'Guru') || []

  // Load Config
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
      const isBreak = config.breakTimes.find((b: any) => b.periodAfter === i)
      if (isBreak) current = addMinutes(current, isBreak.duration)
    }
    const end = addMinutes(current, config.jpDuration)
    return `${format(current, 'HH:mm')} - ${format(end, 'HH:mm')}`
  }

  // Workload tracking per assignment
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
        isMet: scheduledCount >= (a.totalJP || 0)
      }
    })
  }, [assignments, rosterEntries])

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
    const updatedBreaks = [...config.breakTimes, { periodAfter: 1, duration: 15 }]
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

    // Bentrokan Guru
    if (!newEntry.isActivity) {
      const teacherConflict = rosterEntries?.find(e => 
        e.day === newEntry.day && 
        e.period === newEntry.period && 
        e.teacherId === newEntry.teacherId
      )
      if (teacherConflict) {
        toast({ variant: "destructive", title: "Bentrok!", description: `Guru tersebut sudah ada jadwal di kelas ${teacherConflict.className}.` })
        return
      }
    }

    // Bentrokan Kelas
    const classConflict = rosterEntries?.find(e => e.day === newEntry.day && e.period === newEntry.period && e.classId === newEntry.classId)
    if (classConflict) {
      toast({ variant: "destructive", title: "Bentrok!", description: `Kelas ini sudah terisi jadwal pada jam ini.` })
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

  const handleDeleteEntry = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'rosterEntries', id))
  }

  const getEntry = (day: string, period: number, classId: string) => {
    return rosterEntries?.find(e => e.day === day && e.period === period && e.classId === classId)
  }

  if (loadingR || loadingC) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Roster</h1>
          <p className="text-muted-foreground mt-1">Plotting jadwal mengajar sesuai beban JP Dapodik.</p>
        </div>
        <div className="flex gap-2">
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
             <CardContent className="space-y-3 pt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Target Dapodik per Kelas:</p>
                <div className="max-height-[400px] overflow-y-auto space-y-2 pr-2">
                   {workloadStats.map((w, idx) => (
                      <div key={idx} className={`p-2 rounded border text-[10px] ${w.isMet ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                         <div className="flex justify-between items-start">
                            <span className="font-bold text-primary truncate max-w-[120px]">{w.teacherName}</span>
                            <Badge variant={w.isMet ? 'default' : 'outline'} className="text-[8px] h-4 scale-90">
                               {w.scheduled} / {w.totalJP} JP
                            </Badge>
                         </div>
                         <div className="flex justify-between mt-1 text-muted-foreground">
                            <span>{w.subjectName}</span>
                            <span className="font-mono">Kelas {w.className}</span>
                         </div>
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
                   <span className="text-[10px] font-bold text-muted-foreground">MULAI PELAJARAN</span>
                   <p className="text-sm font-bold">{config.entryTime}</p>
                </div>
                <div className="space-y-1">
                   <span className="text-[10px] font-bold text-muted-foreground">DURASI PER JP</span>
                   <p className="text-sm font-bold">{config.jpDuration} Menit</p>
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab("settings")}>Ubah Konfigurasi</Button>
             </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 border border-border/50">
              <TabsTrigger value="builder" className="gap-2">Jadwal Mingguan</TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">Konfigurasi Waktu</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-6 mt-6">
              {classes?.sort((a,b) => a.name.localeCompare(b.name)).map(cls => (
                <Card key={cls.id} className="border-border/50 overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b py-3 px-6 flex flex-row items-center justify-between">
                     <CardTitle className="text-lg flex items-center gap-2"><Users className="w-4 h-4" /> Jadwal Kelas {cls.name}</CardTitle>
                     <Badge variant="outline">Tingkat {cls.gradeLevel}</Badge>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="w-24 border-r">Jam Ke</TableHead>
                          {DAYS.map(day => <TableHead key={day} className="text-center min-w-[140px]">{day}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: MAX_PERIODS }).map((_, i) => {
                          const period = i + 1
                          return (
                            <TableRow key={period}>
                              <TableCell className="border-r font-medium text-[10px] bg-muted/10 text-center">
                                 <div className="font-bold text-primary">Jam {period}</div>
                                 <div className="text-[9px] text-muted-foreground">{getTimeForPeriod(period)}</div>
                              </TableCell>
                              {DAYS.map(day => {
                                const entry = getEntry(day, period, cls.id)
                                return (
                                  <TableCell key={day} className="p-1 border-r last:border-r-0 h-20 group relative">
                                    {entry ? (
                                      <div className={`h-full border rounded-md p-2 flex flex-col justify-center transition-all ${entry.isActivity ? 'bg-accent/10 border-accent/20' : 'bg-primary/5 border-primary/20'}`}>
                                        <div className="text-[10px] font-bold truncate uppercase">{entry.isActivity ? entry.activityName : entry.subjectName}</div>
                                        {!entry.isActivity && <div className="text-[9px] text-muted-foreground truncate">{entry.teacherName}</div>}
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                                          onClick={() => handleDeleteEntry(entry.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-30 cursor-pointer" onClick={() => {
                                        setNewEntry({...newEntry, day, period, classId: cls.id});
                                        setIsAddOpen(true);
                                      }}>
                                        <Plus className="w-4 h-4" />
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
                 <Card>
                    <CardHeader><CardTitle className="text-lg">Jam Sekolah</CardTitle></CardHeader>
                    <CardContent>
                      <form onSubmit={handleSaveConfig} className="space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-2">
                             <Label>Jam Pelajaran Ke-1 Dimulai</Label>
                             <Input name="entryTime" type="time" defaultValue={config.entryTime} />
                           </div>
                           <div className="space-y-2">
                             <Label>Durasi Pelajaran (JP) - Menit</Label>
                             <Input name="jpDuration" type="number" defaultValue={config.jpDuration} />
                           </div>
                        </div>
                        <Button type="submit" disabled={isSaving} className="w-full">Simpan Konfigurasi</Button>
                      </form>
                    </CardContent>
                 </Card>

                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <CardTitle className="text-lg">Waktu Istirahat</CardTitle>
                       <Button size="sm" variant="outline" onClick={handleAddBreak}><Plus className="w-3 h-3 mr-1" /> Tambah</Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {config.breakTimes.map((b: any, i: number) => (
                         <div key={i} className="flex items-center gap-2 bg-muted/20 p-2 rounded-lg border">
                            <div className="flex-1 space-y-1">
                               <Label className="text-[10px]">Setelah Jam Ke</Label>
                               <Input type="number" value={b.periodAfter} onChange={e => handleUpdateBreak(i, 'periodAfter', e.target.value)} className="h-8" />
                            </div>
                            <div className="flex-1 space-y-1">
                               <Label className="text-[10px]">Durasi (Menit)</Label>
                               <Input type="number" value={b.duration} onChange={e => handleUpdateBreak(i, 'duration', e.target.value)} className="h-8" />
                            </div>
                            <Button variant="ghost" size="icon" className="mt-4 text-destructive" onClick={() => handleRemoveBreak(i)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>Plot Jadwal</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-3 bg-accent/5 border rounded-xl">
               <div className="space-y-0.5">
                  <Label className="font-bold">Mode Kegiatan Sekolah</Label>
                  <p className="text-[10px] text-muted-foreground italic">Aktifkan untuk agenda non-KBM (Upacara, Sholat, dll)</p>
               </div>
               <Switch checked={newEntry.isActivity} onCheckedChange={v => setNewEntry({...newEntry, isActivity: v})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2"><Label>Hari</Label><Select value={newEntry.day} onValueChange={v => setNewEntry({...newEntry, day: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
               <div className="space-y-2"><Label>Jam Ke-</Label><Select value={newEntry.period?.toString()} onValueChange={v => setNewEntry({...newEntry, period: parseInt(v)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({length: MAX_PERIODS}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent></Select></div>
            </div>

            {newEntry.isActivity ? (
               <div className="space-y-2"><Label>Nama Kegiatan</Label><Input placeholder="Contoh: Upacara Bendera" value={newEntry.activityName} onChange={e => setNewEntry({...newEntry, activityName: e.target.value})} /></div>
            ) : (
               <>
                 <div className="space-y-2">
                    <Label>Pilih Penugasan Guru (Dapodik)</Label>
                    <Select value={`${newEntry.teacherId}|${newEntry.subjectId}`} onValueChange={v => {
                       const [tId, sId] = v.split('|');
                       setNewEntry({...newEntry, teacherId: tId, subjectId: sId});
                    }}>
                       <SelectTrigger><SelectValue placeholder="Pilih Guru & Mapel" /></SelectTrigger>
                       <SelectContent>
                          {assignments?.filter(a => a.classId === newEntry.classId).map(a => (
                             <SelectItem key={a.id} value={`${a.teacherId}|${a.subjectId}`}>{a.teacherName} - {a.subjectName} ({a.totalJP} JP)</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
               </>
            )}
          </div>
          <DialogFooter><Button onClick={handleAddEntry} disabled={submitting} className="w-full">Simpan ke Roster</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
