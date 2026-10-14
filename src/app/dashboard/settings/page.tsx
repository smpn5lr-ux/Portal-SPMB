
"use client"

import { useState, useEffect, useRef } from "react"
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
  CalendarDays,
  Map,
  Hash,
  ImageIcon,
  Type,
  Upload,
  Fingerprint,
  ShieldAlert,
  Power,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const [schoolToRemove, setSchoolToRemove] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  
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
    appName: "SIS TERPADU",
    appLogoUrl: "",
    schoolName: "SMP Negeri 5 LR",
    dinasName: "DINAS PENDIDIKAN",
    npsn: "00000000",
    academicYear: "2024/2025",
    activeSemester: "1",
    totalQuota: 250,
    quotaZonasi: 50,
    quotaPrestasi: 30,
    quotaAfirmasi: 15,
    quotaPerpindahan: 5,
    maxDistance: 3.5,
    minScore: 75,
    regPrefix: "REG-2026-",
    enableSPMB: true
  })

  const [localSchools, setLocalSchools] = useState<string[]>([])

  useEffect(() => {
    if (config) {
      const filteredAppName = config.appName === "PORTAL SPMB" ? "SIS TERPADU" : (config.appName || "SIS TERPADU");
      setLocalConfig({
        ...localConfig,
        ...config,
        appName: filteredAppName
      })
    }
  }, [config])

  useEffect(() => {
    if (schoolsData && schoolsData.list) {
      setLocalSchools(schoolsData.list)
    }
  }, [schoolsData])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Format Tidak Didukung",
        description: "Gunakan JPG, PNG, WEBP, atau SVG.",
      })
      return
    }

    if (file.size > 512000) {
      toast({
        variant: "destructive",
        title: "File Terlalu Besar",
        description: "Maksimal ukuran logo adalah 500KB.",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setLocalConfig({ ...localConfig, appLogoUrl: base64 })
      toast({
        title: "Logo Diunggah",
        description: "Klik 'Simpan Profil' untuk menerapkan perubahan.",
      })
    }
    reader.readAsDataURL(file)
  }

  const handleQuotaChange = (key: string, newValue: number) => {
    const keys = ["quotaZonasi", "quotaPrestasi", "quotaAfirmasi", "quotaPerpindahan"];
    const otherKeys = keys.filter(k => k !== key);
    const remaining = 100 - newValue;
    const othersTotal = otherKeys.reduce((sum, k) => sum + (localConfig[k] || 0), 0);
    let updatedConfig = { ...localConfig, [key]: newValue };

    if (othersTotal === 0) {
      const share = Math.floor(remaining / otherKeys.length);
      otherKeys.forEach((k, i) => {
        updatedConfig[k] = i === otherKeys.length - 1 ? remaining - (share * (otherKeys.length - 1)) : share;
      });
    } else {
      let currentSum = newValue;
      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
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

  const handleRemoveSchoolConfirm = (name: string) => {
    setSchoolToRemove(name)
    setIsDeleteDialogOpen(true)
  }

  const executeRemoveSchool = () => {
    if (!schoolToRemove) return
    const updated = localSchools.filter(s => s !== schoolToRemove)
    setLocalSchools(updated)
    saveSchools(updated)
    setSchoolToRemove(null)
  }

  const saveSchools = (list: string[]) => {
    if (!schoolsRef) return
    setDoc(schoolsRef, { list }, { merge: true })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'settings/schools',
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
          <p className="text-muted-foreground mt-1">Konfigurasi global untuk identitas sekolah dan periode aktif.</p>
        </div>
        <Button 
          onClick={handleSaveConfig} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Perubahan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Power className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Mode Aplikasi</CardTitle>
              </div>
              <CardDescription>Aktifkan atau nonaktifkan fitur pendaftaran murid baru.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between p-4 bg-card border rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-base font-bold">Fitur Pendaftaran (PPDB)</Label>
                    <p className="text-xs text-muted-foreground">Jika nonaktif, menu pendaftaran akan disembunyikan.</p>
                  </div>
                  <Switch 
                    checked={localConfig.enableSPMB} 
                    onCheckedChange={(v) => setLocalConfig({...localConfig, enableSPMB: v})}
                  />
               </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                <CardTitle className="font-headline text-lg">Periode Akademik Aktif</CardTitle>
              </div>
              <CardDescription>Tentukan tahun ajaran dan semester yang berlaku saat ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tahun Ajaran</label>
                  <Input 
                    value={localConfig.academicYear}
                    onChange={(e) => setLocalConfig({...localConfig, academicYear: e.target.value})}
                    placeholder="Contoh: 2024/2025" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Semester Aktif</label>
                  <Select 
                    value={localConfig.activeSemester?.toString()} 
                    onValueChange={(v) => setLocalConfig({...localConfig, activeSemester: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1 (Ganjil)</SelectItem>
                      <SelectItem value="2">Semester 2 (Genap)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Branding Aplikasi</CardTitle>
              </div>
              <CardDescription>Sesuaikan nama dan logo aplikasi sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Type className="w-3 h-3" /> Nama Aplikasi
                  </label>
                  <Input 
                    value={localConfig.appName}
                    onChange={(e) => setLocalConfig({...localConfig, appName: e.target.value})}
                    placeholder="Contoh: SIS TERPADU" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Logo Aplikasi
                  </label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => logoInputRef.current?.click()}
                      className="shrink-0 gap-2 border-primary/20 text-primary hover:bg-primary/5 w-full"
                    >
                      <Upload className="w-4 h-4" /> Unggah Logo
                    </Button>
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      onChange={handleFileUpload} 
                      accept=".jpg,.jpeg,.png,.webp,.svg" 
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Identitas Sekolah</CardTitle>
              </div>
              <CardDescription>Informasi resmi sekolah untuk laporan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dinas Pendidikan</label>
                  <Input 
                    value={localConfig.dinasName}
                    onChange={(e) => setLocalConfig({...localConfig, dinasName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nama Sekolah</label>
                  <Input 
                    value={localConfig.schoolName}
                    onChange={(e) => setLocalConfig({...localConfig, schoolName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NPSN</label>
                  <Input 
                    value={localConfig.npsn}
                    onChange={(e) => setLocalConfig({...localConfig, npsn: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h4 className="font-bold text-sm">Penting: Semester Aktif</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Mengubah **Semester Aktif** akan mengarahkan semua input nilai guru ke buku nilai semester tersebut. Pastikan Anda mengubahnya hanya saat pergantian semester resmi.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" /> Hapus Sekolah?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{schoolToRemove}</strong> dari daftar sekolah zonasi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSchoolToRemove(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeRemoveSchool} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
