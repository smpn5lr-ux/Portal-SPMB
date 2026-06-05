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
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { useFirestore, useDoc } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function SettingsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  
  const settingsRef = doc(db, "settings", "system")
  const { data: config, loading } = useDoc<any>(settingsRef)

  const [localConfig, setLocalConfig] = useState<any>({
    schoolName: "SMP Negeri 1 Jakarta",
    npsn: "20123456",
    totalQuota: 250,
    quotaZonasi: 50,
    quotaPrestasi: 30,
    quotaAfirmasi: 15,
    quotaPerpindahan: 5,
    maxDistance: 3.5,
    minScore: 75
  })

  useEffect(() => {
    if (config) {
      setLocalConfig(config)
    }
  }, [config])

  const handleSave = () => {
    if (!db) return
    setIsSaving(true)

    setDoc(settingsRef, localConfig, { merge: true })
      .then(() => {
        toast({
          title: "Pengaturan Disimpan",
          description: "Konfigurasi sistem berhasil diperbarui di seluruh platform.",
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'write',
          requestResourceData: localConfig
        })
        errorEmitter.emit('permission-error', permissionError)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  if (loading) return (
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
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Semua Perubahan
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
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-accent" />
                <CardTitle className="font-headline text-lg">Distribusi Kuota</CardTitle>
              </div>
              <CardDescription>Atur persentase alokasi untuk masing-masing jalur pendaftaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: "Jalur Zonasi (%)", key: "quotaZonasi", icon: MapPin },
                  { label: "Jalur Prestasi (%)", key: "quotaPrestasi", icon: Trophy },
                  { label: "Jalur Afirmasi (%)", key: "quotaAfirmasi", icon: Users },
                  { label: "Pindahan Orang Tua (%)", key: "quotaPerpindahan", icon: School },
                ].map((item) => (
                  <div key={item.key} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-3 h-3 text-muted-foreground" />
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.label}</label>
                      </div>
                      <span className="text-sm font-bold text-primary">{localConfig[item.key]}%</span>
                    </div>
                    <Slider 
                      value={[localConfig[item.key]]} 
                      max={100} 
                      step={1}
                      onValueChange={([v]) => setLocalConfig({...localConfig, [item.key]: v})}
                    />
                  </div>
                ))}
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border border-border flex items-center justify-between">
                <span className="text-sm font-medium">Total Akumulasi Kuota</span>
                <Badge variant={localConfig.quotaZonasi + localConfig.quotaPrestasi + localConfig.quotaAfirmasi + localConfig.quotaPerpindahan === 100 ? "default" : "destructive"}>
                  {localConfig.quotaZonasi + localConfig.quotaPrestasi + localConfig.quotaAfirmasi + localConfig.quotaPerpindahan}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-500" />
                <CardTitle className="font-headline text-lg">Default Seleksi</CardTitle>
              </div>
              <CardDescription>Ambang batas awal yang digunakan saat menjalankan seleksi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Total Kuota (Siswa)</label>
                  <span className="text-sm font-bold">{localConfig.totalQuota}</span>
                </div>
                <Input 
                  type="number" 
                  value={localConfig.totalQuota}
                  onChange={(e) => setLocalConfig({...localConfig, totalQuota: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Max Jarak Default</label>
                  <span className="text-sm font-bold">{localConfig.maxDistance} km</span>
                </div>
                <Slider 
                  value={[localConfig.maxDistance]} 
                  max={10} 
                  step={0.1}
                  onValueChange={([v]) => setLocalConfig({...localConfig, maxDistance: v})}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Min Nilai Default</label>
                  <span className="text-sm font-bold">{localConfig.minScore}</span>
                </div>
                <Slider 
                  value={[localConfig.minScore]} 
                  max={100} 
                  step={1}
                  onValueChange={([v]) => setLocalConfig({...localConfig, minScore: v})}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h4 className="font-bold text-sm">Keamanan Konfigurasi</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Setiap perubahan pada pengaturan ini akan berdampak langsung pada perhitungan otomatis di seluruh modul seleksi.
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
