import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-[#C9A84C]/15 py-10 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 relative">
            <Image src="/Logo.png" alt="Sundial" fill className="object-contain" />
          </div>
          <span className="font-playfair text-lg text-slate-700">Sundial</span>
        </div>
        <p className="text-xs text-slate-400 text-center">
          Wedding timelines, beautifully timed.
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <Link href="/pricing" className="hover:text-slate-600">Pricing</Link>
          <Link href="/sign-in" className="hover:text-slate-600">Sign in</Link>
        </div>
      </div>
      <p className="text-center text-xs text-slate-300">
        Created by{' '}
        <a href="https://aventiweddings.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
          Aventi Weddings
        </a>
      </p>
    </footer>
  );
}
