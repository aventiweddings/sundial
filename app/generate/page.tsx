import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Nav from '@/components/layout/Nav';
import { FileText, Upload, ClipboardList } from 'lucide-react';

export default async function GeneratePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <Nav user={user} />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h1 className="font-playfair text-4xl text-slate-800 mb-3">New Timeline</h1>
          <p className="text-slate-500">How would you like to get started?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link href="/generate/form" className="group">
            <div className="flex flex-col gap-4 p-7 rounded-2xl bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C]/50 hover:shadow-md transition-all h-full">
              <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-playfair text-lg text-slate-800">Enter Manually</h2>
                  <span className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Fill in the details directly — couple type, locations, vendor coverage windows, and notes.
                </p>
              </div>
              <span className="text-sm font-medium text-[#C9A84C] mt-auto">Get started →</span>
            </div>
          </Link>

          <Link href="/generate/form?method=paste" className="group">
            <div className="flex flex-col gap-4 p-7 rounded-2xl bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C]/50 hover:shadow-md transition-all h-full">
              <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-playfair text-lg text-slate-800">Paste Text</h2>
                  <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">Auto-extract</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Paste an email thread, planning notes, or filled questionnaire — we&apos;ll extract the details.
                </p>
              </div>
              <span className="text-sm font-medium text-[#C9A84C] mt-auto">Paste & extract →</span>
            </div>
          </Link>

          <Link href="/generate/form?method=upload" className="group">
            <div className="flex flex-col gap-4 p-7 rounded-2xl bg-white border border-[#C9A84C]/20 hover:border-[#C9A84C]/50 hover:shadow-md transition-all h-full">
              <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-playfair text-lg text-slate-800">Upload a Document</h2>
                  <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">PDF, Word, TXT</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Drop in a PDF, Word doc, or plain text file — we&apos;ll parse and pre-fill the form.
                </p>
              </div>
              <span className="text-sm font-medium text-[#C9A84C] mt-auto">Upload & extract →</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
