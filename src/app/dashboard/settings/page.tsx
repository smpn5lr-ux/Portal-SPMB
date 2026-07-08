
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
  ShieldAlert
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
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
    appName: "PORTAL SPMB",
    appLogoUrl: "",
    schoolName: "SMP Negeri 1 Jakarta",
    dinasName: "DINAS PENDIDIKAN PROVINSI DKI JAKARTA",
    npsn: "20123456",
    academicYear: "2024/2025",
    totalQuota: 250,
    quotaZonasi: 50,
    quotaPrestasi: 30,
    quotaAfirmasi: 15,
    quotaPerpindahan: 5,
    maxDistance: 3.5,
    minScore: 75,
    regPrefix: "REG-2026-"
  })

  const [localSchools, setLocalSchools] = useState<string[]>([])

  useEffect(() => {
    if (config) {
      setLocalConfig({
        ...localConfig,
        ...config,
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
                <ShieldCheck className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Branding Aplikasi</CardTitle>
              </div>
              <CardDescription>Sesuaikan nama dan logo aplikasi untuk Login & Dashboard.</CardDescription>
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
                    placeholder="Contoh: PORTAL SPMB" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Logo Aplikasi
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      value={localConfig.appLogoUrl.startsWith('data:') ? 'Terunggah dari lokal' : localConfig.appLogoUrl}
                      onChange={(e) => setLocalConfig({...localConfig, appLogoUrl: e.target.value})}
                      placeholder="URL Gambar atau Unggah..." 
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => logoInputRef.current?.click()}
                      className="shrink-0 gap-2 border-primary/20 text-primary hover:bg-primary/5"
                    >
                      <Upload className="w-4 h-4" /> Unggah
                    </Button>
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      onChange={handleFileUpload} 
                      accept=".jpg,.jpeg,.png,.webp,.svg" 
                      className="hidden" 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Mendukung JPG, PNG, WEBP, SVG (Maks. 500KB).</p>
                </div>
              </div>
              {localConfig.appLogoUrl && (
                <div className="mt-2 p-6 border rounded-xl bg-muted/20 flex flex-col items-center justify-center border-dashed">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mb-4 tracking-widest">Pratinjau Branding</span>
                  <div className="flex items-center gap-4 bg-card p-4 rounded-lg shadow-sm border border-border/50">
                    <img src={localConfig.appLogoUrl} alt="Logo Preview" className="h-10 w-10 object-contain" />
                    <span className="font-headline font-bold text-lg">{localConfig.appName}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Identitas & Kapasitas Sekolah</CardTitle>
              </div>
              <CardDescription>Informasi dasar sekolah dan total daya tampung siswa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Map className="w-3 h-3" /> Dinas Pendidikan
                  </label>
                  <Input 
                    value={localConfig.dinasName}
                    onChange={(e) => setLocalConfig({...localConfig, dinasName: e.target.value})}
                    placeholder="Contoh: DINAS PENDIDIKAN PROVINSI DKI JAKARTA" 
                  />
                </div>
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
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Total Kuota Pendaftar
                  </label>
                  <Input 
                    type="number"
                    value={localConfig.totalQuota}
                    onChange={(e) => setLocalConfig({...localConfig, totalQuota: parseInt(e.target.value) || 0})}
                    placeholder="Contoh: 250" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Format Nomor Registrasi</CardTitle>
              </div>
              <CardDescription>Sesuaikan prefiks untuk penomoran otomatis pendaftar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Prefiks Registrasi</label>
                <Input 
                  value={localConfig.regPrefix}
                  onChange={(e) => setLocalConfig({...localConfig, regPrefix: e.target.value})}
                  placeholder="Contoh: REK atau REG-2026-" 
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Contoh Hasil: <strong>{localConfig.regPrefix || ''}01</strong>, <strong>{localConfig.regPrefix || ''}02</strong>, dst.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-accent" />
                <CardTitle className="font-headline text-lg">Daftar Sekolah Zonasi (SD/MI)</CardTitle>
              </div>
              <CardDescription>Kelola daftar sekolah yang dianggap berada di dalam zonasi sekolah ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={newSchool}
                  onChange={(e) => setNewSchool(e.target.value)}
                  placeholder="Masukkan nama sekolah zonasi..."
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
                      onClick={() => handleRemoveSchoolConfirm(school)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {localSchools.length === 0 && (
                  <p className="col-span-full text-center py-8 text-muted-foreground text-sm italic">Belum ada sekolah zonasi yang ditambahkan.</p>
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
