"use client"

import { useState } from 'react'
import { 
  Target, 
  Settings2, 
  Play, 
  ShieldCheck, 
  Info,
  Trophy,
  MapPin,
  Heart,
  Truck,
  ArrowUpDown,
  History
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { mockApplicants } from "@/lib/mock-data"

export default function SelectionPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRankings, setShowRankings] = useState(false)
  const [selectionParams, setSelectionParams] = useState({
    maxDistance: 3.5,
    minScore: 78,
    priorityAge: true
  })

  const handleRunSelection = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setShowRankings(true)
    }, 2500)
  }

  const sortedApplicants = [...mockApplicants].sort((a, b) => {
    // Basic sorting logic for mock UI
    if (a.applicationPath === 'Prestasi') return (b.academicScore || 0) - (a.academicScore || 0)
    return (a.distanceToSchoolKm || 0) - (b.distanceToSchoolKm || 0)
  }).slice(0, 15)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Sistem Seleksi</h1>
          <p className="text-muted-foreground mt-1">Konfigurasi algoritma dan eksekusi kelulusan siswa.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <History className="w-4 h-4" />
          Riwayat Seleksi
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <CardTitle className="font-headline text-lg">Parameter Seleksi</CardTitle>
              </div>
              <CardDescription>Sesuaikan ambang batas kelulusan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Jarak Maksimum (Zonasi)</label>
                  <span className="text-sm font-bold text-primary">{selectionParams.maxDistance} km</span>
                </div>
                <Slider 
                  value={[selectionParams.maxDistance]} 
                  max={10} 
                  step={0.1} 
                  onValueChange={([v]) => setSelectionParams(p => ({...p, maxDistance: v}))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nilai Minimal (Prestasi)</label>
                  <span className="text-sm font-bold text-primary">{selectionParams.minScore}</span>
                </div>
                <Slider 
                  value={[selectionParams.minScore]} 
                  max={100} 
                  step={1} 
                  onValueChange={([v]) => setSelectionParams(p => ({...p, minScore: v}))}
                />
              </div>

              <Separator className="bg-border/50" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Prioritas Usia</label>
                  <p className="text-[10px] text-muted-foreground">Gunakan usia sebagai pemecah nilai sama.</p>
                </div>
                <Switch 
                  checked={selectionParams.priorityAge} 
                  onCheckedChange={(v) => setSelectionParams(p => ({...p, priorityAge: v}))}
                />
              </div>

              <Button 
                onClick={handleRunSelection}
                disabled={isProcessing}
                className="w-full bg-primary hover:bg-primary/90 h-11 gap-2 shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Eksekusi Seleksi
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-accent/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-accent mt-1" />
                <div>
                  <h4 className="font-bold text-sm">Integritas Data Seleksi</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Sistem memastikan tidak ada data ganda dan seluruh pendaftar telah diverifikasi dokumennya sebelum proses seleksi dijalankan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!showRankings && !isProcessing ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-xl bg-muted/10">
              <Target className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-xl font-bold">Siap Menjalankan Seleksi</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Atur parameter di panel kiri dan klik Eksekusi untuk melihat simulasi hasil kelulusan sementara.
              </p>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-border rounded-xl bg-card animate-pulse">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Play className="w-8 h-8 text-primary animate-ping" />
              </div>
              <h3 className="text-xl font-bold">Memproses Data Pendaftar...</h3>
              <p className="text-muted-foreground mt-2">Melakukan kalkulasi jarak dan pembobotan nilai akademik.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Zonasi', value: '112/125', icon: MapPin, color: 'text-blue-500' },
                  { label: 'Prestasi', value: '68/75', icon: Trophy, color: 'text-amber-500' },
                  { label: 'Afirmasi', value: '30/38', icon: Heart, color: 'text-pink-500' },
                  { label: 'Pindahan', value: '12/12', icon: Truck, color: 'text-purple-500' },
                ].map((s) => (
                  <Card key={s.label} className="border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`w-3 h-3 ${s.color}`} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
                      <div className={`h-full bg-primary`} style={{ width: '85%' }}></div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-headline text-lg">Pratinjau Hasil Kelulusan</CardTitle>
                    <CardDescription>Peringkat sementara berdasarkan parameter aktif.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowUpDown className="w-3 h-3" /> Urutkan
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[80px]">Rank</TableHead>
                        <TableHead>Nama Calon Siswa</TableHead>
                        <TableHead>Jalur</TableHead>
                        <TableHead>Skor/Jarak</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedApplicants.map((a, idx) => (
                        <TableRow key={a.id} className="hover:bg-muted/20">
                          <TableCell className="font-bold text-muted-foreground">#{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{a.fullName}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{a.NISN}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-bold">{a.applicationPath}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {a.applicationPath === 'Zonasi' ? `${a.distanceToSchoolKm} km` : `${a.academicScore}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px] uppercase font-bold">LULUS</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-muted/30 border-t border-border/50 text-center">
                    <Button variant="link" className="text-xs text-primary font-bold">Lihat Seluruh Peringkat (1.284 Pendaftar)</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
