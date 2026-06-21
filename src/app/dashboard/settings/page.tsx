
"use client"

import { useState, useEffect } from "react"
import { 
  Settings, 
  School, 
  Target, 
  Users, 
  Save, 
  ShieldCheck, 
  Building2, 
  Percent, 
  MapPin, 
  Trophy, 
  Loader2,
  Plus,
  Trash2,
  CalendarDays
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function SettingsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [newSchool, setNewSchool] = useState("")
  
  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "system")
  }, [db])

  const schoolsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "schools")
  }, [db])

  const { data: config, loading: loadingConfig } = useDoc<any>(settingsRef)
  const { data: schoolsData, loading: loadingSchools } = useDoc<any>(schoolsRef)

  const [localConfig, setLocalConfig] = useState<any>({
    schoolName: "SMP Negeri 1 Jakarta",
    npsn: "20123456",
    academicYear: "2024/2025",
    totalQuota: 250,
    quotaZonasi: 50,
    quotaPrestasi: 30,
    quotaAfirmasi: 15,
    quotaPerpindahan: 5,
    maxDistance: 3.5,
    minScore: 75
  })

  const [localSchools, setLocalSchools] = useState<string[]>([])

  useEffect(() => {
    if (config) {
      setLocalConfig({
        ...localConfig,
        ...config,
        academicYear: config.academicYear || "2024/2025"
      })
    }
  }, [config])

  useEffect(() => {
    if (schoolsData && schoolsData.list) {
      setLocalSchools(schoolsData.list)
    }
  }, [schoolsData])

  const handleQuotaChange = (key: string, newValue: number) => {
    const keys = ["quotaZonasi", "quotaPrestasi", "quotaAfirmasi", "quotaPerpindahan"];
    const otherKeys = keys.filter(k => k !== key);
    
    // Sisa persentase yang harus dibagi ke yang lain
    const remaining = 100 - newValue;
    
    // Total nilai saat ini dari slider lainnya untuk perhitungan proporsional
    const othersTotal = otherKeys.reduce((sum, k) => sum + (localConfig[k] || 0), 0);
    
    let updatedConfig = { ...localConfig, [key]: newValue };

    if (othersTotal === 0) {
      // Jika semua yang lain 0, bagi rata sisa persentase
      const share = Math.floor(remaining / otherKeys.length);
      otherKeys.forEach((k, i) => {
        updatedConfig[k] = i === otherKeys.length - 1 ? remaining - (share * (otherKeys.length - 1)) : share;
      });
    } else {
      // Distribusi proporsional berdasarkan nilai saat ini
      let currentSum = newValue;
      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
          // Elemen terakhir mengambil sisa untuk memastikan total tepat 100
          updatedConfig[k] = Math.max(0, 100 - currentSum);
        } else {
          const share = Math.round((localConfig[k] / othersTotal) * remaining);
          updatedConfig[k] = share;
          currentSum += share;
        }
      });
    }

    setLocalConfig(updatedConfig);
  };

  const handleSaveConfig = () => {
    if (!db || !settingsRef) return
    setIsSaving(true)

    setDoc(settingsRef, localConfig, { merge: true })
      .then(() => {
        toast({
          title: "Pengaturan Disimpan",
          description: "Konfigurasi sistem berhasil diperbarui.",
        })
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'write',
          requestResourceData: localConfig
        }))
      })
      .finally(() => setIsSaving(false))
  }

  const handleAddSchool = () => {
    if (!newSchool.trim()) return
    const updated = [...localSchools, newSchool.trim()].sort()
    setLocalSchools(updated)
    setNewSchool("")
    saveSchools(updated)
  }

  const handleRemoveSchool = (name: string) => {
    const updated = localSchools.filter(s => s !== name)
    setLocalSchools(updated)
    saveSchools(updated)
  }

  const saveSchools = (list: string[]) => {
    if (!schoolsRef) return
    setDoc(schoolsRef, { list }, { merge: true })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: schoolsRef.path,
          operation: 'write',
          requestResourceData: { list }
        }))
      })
  }

  if (loadingConfig || loadingSchools) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Memuat pengaturan sistem...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Pengaturan Sistem</h1>
          <p className="text-muted-foreground mt-1">Konfigurasi global untuk identitas sekolah dan aturan seleksi.</p>
        </div>
        <Button 
          onClick={handleSaveConfig} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Profil & Kuota
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Identitas Sekolah</CardTitle>
              </div>
              <CardDescription>Informasi dasar sekolah yang akan muncul di bukti pendaftaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nama Sekolah</label>
                  <Input 
                    value={localConfig.schoolName}
                    onChange={(e) => setLocalConfig({...localConfig, schoolName: e.target.value})}
                    placeholder="Contoh: SMP Negeri 1 Jakarta" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NPSN</label>
                  <Input 
                    value={localConfig.npsn}
                    onChange={(e) => setLocalConfig({...localConfig, npsn: e.target.value})}
                    placeholder="Contoh: 20123456" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Tahun Ajaran
                  </label>
                  <Input 
                    value={localConfig.academicYear}
                    onChange={(e) => setLocalConfig({...localConfig, academicYear: e.target.value})}
                    placeholder="Contoh: 2024/2025" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-accent" />
                <CardTitle className="font-headline text-lg">Daftar Sekolah Asal (SD/MI)</CardTitle>
              </div>
              <CardDescription>Kelola daftar sekolah yang akan muncul di pendaftaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  placeholder="Masukkan nama sekolah baru..."
                  className="flex-1"
                />
                <Button onClick={handleAddSchool} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Tambah
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-lg bg-muted/20">
                {localSchools.map((school) => (
                  <div key={school} className="flex items-center justify-between p-2 rounded bg-card border group">
                    <span className="text-sm truncate mr-2">{school}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveSchool(school)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {localSchools.length === 0 && (
                  <p className="col-span-full text-center py-8 text-muted-foreground text-sm italic">Belum ada sekolah yang ditambahkan.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-accent" />
                <CardTitle className="font-headline text-lg">Distribusi Kuota</CardTitle>
                <CardDescription>Total distribusi harus 100%.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
               {[
                  { label: "Zonasi (%)", key: "quotaZonasi", icon: MapPin },
                  { label: "Prestasi (%)", key: "quotaPrestasi", icon: Trophy },
                  { label: "Afirmasi (%)", key: "quotaAfirmasi", icon: Users },
                  { label: "Pindahan (%)", key: "quotaPerpindahan", icon: School },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</label>
                      <span className="text-sm font-bold text-primary">{localConfig[item.key]}%</span>
                    </div>
                    <Slider 
                      value={[localConfig[item.key]]} 
                      max={100} 
                      step={1}
                      onValueChange={([v]) => handleQuotaChange(item.key, v)}
                    />
                  </div>
                ))}
                
                <div className="pt-4 border-t">
                   <div className="flex justify-between items-center">
                     <span className="text-xs font-bold uppercase text-muted-foreground">Total Kuota</span>
                     <Badge variant={Object.keys(localConfig).filter(k => k.startsWith('quota')).reduce((s, k) => s + localConfig[k], 0) === 100 ? "default" : "destructive"} className="font-mono">
                        {Object.keys(localConfig).filter(k => k.startsWith('quota')).reduce((s, k) => s + localConfig[k], 0)}%
                     </Badge>
                   </div>
                </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h4 className="font-bold text-sm">Validitas Data</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Sistem akan otomatis menyeimbangkan kuota lain saat Anda mengubah satu parameter untuk menjaga total tetap 100%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
