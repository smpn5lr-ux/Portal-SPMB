
"use client"

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, User, Download, MapPin, Briefcase, Info, Loader2, Sparkles, CheckCircle2, XCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Link from 'next/link'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { Applicant } from '@/lib/types'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const db = useFirestore()
  const { toast } = useToast()
  
  const applicantRef = useMemoFirebase(() => {
    if (!db || !id) return null
    return doc(db, 'applicants', id as string)
  }, [db, id])

  const { data: applicant, loading } = useDoc<Applicant>(applicantRef)

  const handleUpdateStatus = (status: string) => {
    if (!applicantRef) return
    updateDoc(applicantRef, { verificationStatus: status })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: applicantRef.path, operation: 'update' }))
      })
  }

  const handleDownloadPDF = async () => {
    if (!applicant) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text("FORMULIR PENDAFTARAN PESERTA DIDIK BARU", 105, 20, { align: "center" })
    doc.line(20, 25, 190, 25)

    const data = [
      ["No. Registrasi", applicant.registrationNumber || "-"],
      ["NISN", applicant.NISN || "-"],
      ["NIK", applicant.NIK || "-"],
      ["Nama Lengkap", (applicant.fullName || "-").toUpperCase()],
      ["Tempat, Tgl Lahir", `${applicant.birthPlace || "-"}, ${applicant.birthDate || "-"}`],
      ["Jenis Kelamin", applicant.gender || "-"],
      ["Agama", applicant.religion || "-"],
      ["Alamat", `${applicant.address || "-"}, RT ${applicant.rt || "-"} RW ${applicant.rw || "-"}, Kel. ${applicant.kelurahan || "-"}, Kec. ${applicant.kecamatan || "-"}, ${applicant.propinsi || "-"}`],
      ["Nama Orang Tua/Wali", applicant.parentName || "-"],
      ["No. HP", applicant.parentPhone || "-"],
      ["Sekolah Asal", applicant.originSchool || "-"],
      ["Jalur Pendaftaran", applicant.applicationPath || "-"],
    ]

    autoTable(doc, {
      body: data,
      startY: 35,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    })

    doc.save(`Formulir_${applicant.fullName}.pdf`)
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div>
  if (!applicant) return <div className="text-center py-24">Data tidak ditemukan.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard/applicants"><ArrowLeft className="w-5 h-5" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{applicant.fullName}</h1>
            <p className="text-muted-foreground text-sm font-mono">{applicant.registrationNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2"><Download className="w-4 h-4" /> Cetak Formulir</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Profil Calon Murid</CardTitle>
              <CardDescription>Informasi lengkap sesuai standar Dapodik.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">I. Data Pribadi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">NISN</span><span className="font-mono">{applicant.NISN || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">NIK</span><span className="font-mono">{applicant.NIK || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">JK</span><span>{applicant.gender || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Agama</span><span>{applicant.religion || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">TTL</span><span>{applicant.birthPlace || "-"}, {applicant.birthDate || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Anak Ke-</span><span>{applicant.childOrder || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Saudara</span><span>{applicant.numberOfSiblings || "-"}</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">II. Alamat & Kontak</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col"><span className="text-muted-foreground">Alamat</span><span>{applicant.address || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">RT/RW</span><span>{applicant.rt || "-"} / {applicant.rw || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kelurahan</span><span>{applicant.kelurahan || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kecamatan</span><span>{applicant.kecamatan || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Provinsi</span><span>{applicant.propinsi || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">HP Siswa</span><span>{applicant.studentPhone || "-"}</span></div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b pb-1">III. Data Orang Tua</h4>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between font-bold text-xs text-muted-foreground uppercase"><span className="text-accent">Data Ayah</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span className="font-medium">{applicant.fatherName || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">NIK</span><span className="font-mono">{applicant.fatherNIK || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Thn Lahir</span><span>{applicant.fatherBirthYear || "-"}</span></div>
                    </div>
                    <div className="space-y-2 text-sm pt-4">
                      <div className="flex justify-between"><span className="text-muted-foreground">Pendidikan</span><span>{applicant.fatherEducation || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pekerjaan</span><span>{applicant.fatherJob || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Penghasilan</span><span>{applicant.fatherIncome || "-"}</span></div>
                    </div>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between font-bold text-xs text-muted-foreground uppercase"><span className="text-accent">Data Ibu</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span className="font-medium">{applicant.motherName || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">NIK</span><span className="font-mono">{applicant.motherNIK || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Thn Lahir</span><span>{applicant.motherBirthYear || "-"}</span></div>
                    </div>
                    <div className="space-y-2 text-sm pt-4">
                      <div className="flex justify-between"><span className="text-muted-foreground">Pendidikan</span><span>{applicant.motherEducation || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pekerjaan</span><span>{applicant.motherJob || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Penghasilan</span><span>{applicant.motherIncome || "-"}</span></div>
                    </div>
                  </div>
                </div>

                {applicant.livingWith !== 'Bersama Orang Tua' && (
                  <div className="pt-10 space-y-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary border-b pb-1">IV. Data Wali</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Nama Wali</span><span className="font-medium">{applicant.guardianName || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">NIK Wali</span><span className="font-mono">{applicant.guardianNIK || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Thn Lahir</span><span>{applicant.guardianBirthYear || "-"}</span></div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Pendidikan</span><span>{applicant.guardianEducation || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Pekerjaan</span><span>{applicant.guardianJob || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Penghasilan</span><span>{applicant.guardianIncome || "-"}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Panel Verifikasi</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => handleUpdateStatus('Lengkap')} className="text-green-500 border-green-500/20 hover:bg-green-500/5"><CheckCircle2 className="w-4 h-4 mr-2" /> Lengkap</Button>
                <Button variant="outline" onClick={() => handleUpdateStatus('Ditolak')} className="text-destructive border-destructive/20 hover:bg-destructive/5"><XCircle className="w-4 h-4 mr-2" /> Tolak</Button>
              </div>
              <Badge className="w-full justify-center py-2 text-sm">{applicant.verificationStatus || "-"}</Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle className="text-sm uppercase tracking-wider">Info Pendaftaran</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Jalur</span><Badge variant="secondary">{applicant.applicationPath || "-"}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sekolah Asal</span><span className="text-right">{applicant.originSchool || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tgl Daftar</span><span>{applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString() : "-"}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
