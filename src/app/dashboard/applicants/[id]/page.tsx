
"use client"

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  School, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Sparkles,
  Printer,
  Loader2,
  Home,
  Briefcase,
  Users as UsersIcon,
  Layers,
  Smartphone,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import Link from 'next/link'
import { generateAdmissionJustification, AdmissionJustificationOutput } from '@/ai/flows/generate-admission-justification'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const db = useFirestore()
  
  const applicantRef = useMemoFirebase(() => {
    if (!db || !id) return null
    return doc(db, 'applicants', id as string)
  }, [db, id])

  const { data: applicant, loading } = useDoc<Applicant>(applicantRef)
  
  const [justification, setJustification] = useState<AdmissionJustificationOutput | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [notes, setNotes] = useState('')

  const handleUpdateStatus = (status: string) => {
    if (!applicantRef) return

    updateDoc(applicantRef, { verificationStatus: status, verificationNotes: notes })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: applicantRef.path,
          operation: 'update',
          requestResourceData: { verificationStatus: status, verificationNotes: notes }
        })
        errorEmitter.emit('permission-error', permissionError)
      })
  }

  const handleGenerateAI = async () => {
    if (!applicant) return
    setLoadingAI(true)
    try {
      const result = await generateAdmissionJustification({
        applicantData: {
          NISN: applicant.NISN,
          fullName: applicant.fullName,
          birthDate: applicant.birthDate,
          gender: applicant.gender,
          address: applicant.address,
          parentName: applicant.parentName,
          originSchool: applicant.originSchool,
          NIK: applicant.NIK,
          applicationPath: applicant.applicationPath,
          academicScore: applicant.academicScore,
          distanceToSchoolKm: applicant.distanceToSchoolKm,
          ageYears: applicant.ageYears,
        },
        selectionCriteria: {
          zonasiMaxDistanceKm: 5,
          prestasiMinScore: 80,
          affirmationCategoriesAllowed: ['Ekonomi Kurang Mampu', 'Disabilitas'],
        },
        quotaRules: {
          totalQuota: 250,
          quotaPerPath: {
            'Zonasi': 50,
            'Prestasi': 30,
            'Afirmasi': 15,
            'Perpindahan Orang Tua': 5
          },
          rombelCapacity: 32
        },
        admissionStatus: applicant.admissionStatus === 'pending' ? 'waitlisted' : applicant.admissionStatus as any,
        currentRomelEnrollment: 84
      })
      setJustification(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAI(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Memuat data pendaftar...</p>
    </div>
  )

  if (!applicant) return <div className="text-center py-12">Pendaftar tidak ditemukan.</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/applicants">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-headline font-bold">{applicant.fullName}</h1>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase font-bold text-[10px]">
                NO. URUT #{applicant.registrationSequence || '-'}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground border-border uppercase font-bold text-[10px]">
                {applicant.registrationNumber}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-3 h-3" /> {applicant.address}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="w-4 h-4" />
            Cetak Bukti
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-muted/20">
              <div>
                <CardTitle className="font-headline text-lg">Informasi Profil Murid</CardTitle>
                <CardDescription>Data lengkap calon murid sesuai standar Dapodik.</CardDescription>
              </div>
              <Badge className={`${
                applicant.verificationStatus === 'Lengkap' ? 'bg-green-500/10 text-green-500' :
                applicant.verificationStatus === 'Ditolak' ? 'bg-destructive/10 text-destructive' :
                'bg-slate-500/10 text-slate-400'
              } border-none font-bold`}>{applicant.verificationStatus}</Badge>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  {/* IDENTITAS PRIBADI */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary border-b pb-2">
                      <User className="w-4 h-4" />
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]">Identitas Pribadi</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">NISN</span>
                        <span className="text-sm font-mono font-bold">{applicant.NISN}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">NIK Murid</span>
                        <span className="text-sm font-mono">{applicant.NIK}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Jenis Kelamin</span>
                        <span className="text-sm">{applicant.gender}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Tempat, Tgl Lahir</span>
                        <span className="text-sm">{applicant.birthPlace}, {applicant.birthDate}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Agama</span>
                        <span className="text-sm">{applicant.religion}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* DATA KELUARGA & SAUDARA */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-cyan-500 border-b pb-2">
                      <Layers className="w-4 h-4" />
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]">Data Keluarga & Saudara</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Anak Ke</span>
                        <span className="text-sm font-bold">{applicant.childOrder || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Jumlah Saudara</span>
                        <span className="text-sm font-bold">{applicant.numberOfSiblings || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Hobi</span>
                        <span className="text-sm italic">{applicant.hobbies || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* DOMISILI */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-500 border-b pb-2">
                      <Home className="w-4 h-4" />
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]">Status Domisili</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">No. KK</span>
                        <span className="text-sm font-mono">{applicant.familyCardNumber}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Tinggal Dengan</span>
                        <span className="text-sm">{applicant.livingWith || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Transportasi</span>
                        <span className="text-sm">{applicant.transportation || '-'}</span>
                      </div>
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-primary uppercase">Jarak Tempuh</span>
                          <span className="text-sm font-bold text-primary">{applicant.distanceToSchoolKm || '0'} Km</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* DATA ORANG TUA / WALI */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-pink-500 border-b pb-2">
                      <UsersIcon className="w-4 h-4" />
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]">Data Orang Tua / Wali</h4>
                    </div>
                    <div className="space-y-4">
                      {applicant.guardianName && (
                        <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-2">
                             <ShieldCheck className="w-3 h-3 text-orange-500" />
                             <Badge variant="outline" className="text-[10px] bg-orange-500/5 text-orange-500">WALI SISWA</Badge>
                          </div>
                          <p className="text-sm font-bold">{applicant.guardianName}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">NIK: {applicant.guardianNIK || '-'}</p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                            <Briefcase className="w-3 h-3" /> {applicant.guardianOccupation || '-'}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <Badge variant="outline" className="mb-2 text-[10px] bg-primary/5 text-primary">AYAH</Badge>
                        <p className="text-sm font-bold">{applicant.fatherName || applicant.parentName}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">NIK: {applicant.fatherNIK || '-'}</p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> {applicant.fatherOccupation || '-'}
                        </p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <Badge variant="outline" className="mb-2 text-[10px] bg-pink-500/5 text-pink-500">IBU</Badge>
                        <p className="text-sm font-bold">{applicant.motherName || '-'}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">NIK: {applicant.motherNIK || '-'}</p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> {applicant.motherOccupation || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-accent/5 p-3 rounded-xl border border-accent/20">
                        <Smartphone className="w-4 h-4 text-accent" />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Kontak Darurat ({applicant.registrantRelationship || 'Wali'})</p>
                          <p className="text-sm font-bold text-accent">{applicant.parentPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PENDIDIKAN */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-500 border-b pb-2">
                      <School className="w-4 h-4" />
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]">Pendidikan & Jalur</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Sekolah Asal</p>
                        <p className="text-sm font-semibold">{applicant.originSchool}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Jalur</p>
                          <p className="text-sm font-bold text-primary">{applicant.applicationPath}</p>
                        </div>
                        <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Skor Rapor</p>
                          <p className="text-sm font-bold text-green-500">{applicant.academicScore || '0'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ANALISIS AI */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Analisis Seleksi AI</CardTitle>
                <CardDescription>Justifikasi otomatis berdasarkan kriteria sistem.</CardDescription>
              </div>
              <Button 
                onClick={handleGenerateAI} 
                disabled={loadingAI}
                variant="outline" 
                className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
              >
                <Sparkles className="w-4 h-4" />
                {loadingAI ? 'Menganalisis...' : 'Generate Justifikasi'}
              </Button>
            </CardHeader>
            <CardContent>
              {justification ? (
                <div className="space-y-4 bg-primary/5 border border-primary/20 rounded-xl p-6 animate-in zoom-in-95 duration-300">
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Ringkasan AI</p>
                    <p className="text-sm font-semibold italic">"{justification.summary}"</p>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Justifikasi Detail</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {justification.justification}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">Klik tombol di atas untuk membuat analisis seleksi otomatis.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDE PANEL */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Dokumen Pendukung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Kartu Keluarga', 'Akte Kelahiran', 'Ijazah SD', 'Sertifikat Prestasi'].map((docName) => (
                <div key={docName} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">{docName}</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 text-[10px] border-none">TERVERIFIKASI</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Panel Verifikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleUpdateStatus('Lengkap')}
                  variant="outline" 
                  className="gap-2 border-green-500/20 text-green-500 hover:bg-green-500/5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Lengkap
                </Button>
                <Button 
                  onClick={() => handleUpdateStatus('Ditolak')}
                  variant="outline" 
                  className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
                >
                  <XCircle className="w-4 h-4" /> Ditolak
                </Button>
              </div>
              <Button 
                onClick={() => handleUpdateStatus('Perlu Perbaikan')}
                variant="outline" 
                className="w-full gap-2 border-amber-500/20 text-amber-500 hover:bg-amber-500/5"
              >
                <AlertCircle className="w-4 h-4" /> Perlu Perbaikan
              </Button>
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Catatan Verifikator</label>
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan khusus verifikasi di sini..." 
                  className="h-24 bg-muted/20" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
