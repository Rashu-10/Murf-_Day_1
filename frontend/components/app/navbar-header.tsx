'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Stethoscope, Headphones, LayoutDashboard, Home, MapPin, Database } from 'lucide-react';

interface NavbarHeaderProps {
  activeTab?: string;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

export function NavbarHeader({
  activeTab,
  selectedLanguage = 'English',
  onLanguageChange
}: NavbarHeaderProps) {
  const pathname = usePathname();
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  const currentTab = activeTab || (pathname === '/dashboard' ? 'dashboard' : 'home');

  const languages = [
    'English',
    'Hindi',
    'Telugu',
    'Kannada',
    'Tamil',
    'Bengali',
    'Marathi',
    'Gujarati',
    'Punjabi',
    'Malayalam'
  ];

  const handleLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (onLanguageChange) {
      onLanguageChange(val);
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 text-slate-800 shadow-xs sticky top-0 z-50">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Indian Flag & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 rounded overflow-hidden shadow-xs border border-slate-200 flex flex-col shrink-0">
            <div className="h-1/3 bg-[#FF9933]"></div>
            <div className="h-1/3 bg-white flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full border border-[#000080] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#000080]"></div>
              </div>
            </div>
            <div className="h-1/3 bg-[#138808]"></div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                MediBuddy <span className="text-slate-600 text-lg font-normal">(मेडिबडी)</span>
              </h1>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              YOUR TRUSTED HEALTH ACCESS SAATHI
            </p>
          </div>
        </div>

        {/* Right: Accessibility Font Size & Select Language Dropdown */}
        <div className="flex items-center gap-3">
          {/* Font Size Accessibility Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded ${fontSize === 'normal' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              title="Normal Font Size"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded ${fontSize === 'large' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              title="Large Font Size"
            >
              A+
            </button>
          </div>

          {/* Google / Indian Language Selector */}
          <div className="relative flex items-center bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-700 shadow-2xs hover:border-slate-400 transition-all">
            <div className="flex items-center gap-1.5 pr-1 text-blue-600 font-semibold">
              <span className="text-sm">G</span>
              <span className="text-[11px] text-slate-600 font-normal">Select Language</span>
            </div>
            <select
              value={selectedLanguage}
              onChange={handleLanguageSelect}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="Select Language"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 ml-1">▼</span>
          </div>
        </div>
      </div>

      {/* Dark Navy Navigation Tab Bar */}
      <nav className="w-full bg-[#003B73] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center overflow-x-auto font-medium text-xs tracking-wider uppercase">
          <Link
            href="/"
            className={`px-4 py-3 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-4 ${
              currentTab === 'home'
                ? 'bg-[#002855] border-[#FF9800] text-white font-bold'
                : 'border-transparent text-slate-200 hover:bg-[#002D5A] hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            HOME
          </Link>

          <Link
            href="/?view=triage"
            className={`px-4 py-3 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-4 ${
              currentTab === 'triage'
                ? 'bg-[#002855] border-[#FF9800] text-white font-bold'
                : 'border-transparent text-slate-200 hover:bg-[#002D5A] hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            SYMPTOM TRIAGE
          </Link>

          <Link
            href="/?view=facilities"
            className={`px-4 py-3 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-4 ${
              currentTab === 'facilities'
                ? 'bg-[#002855] border-[#FF9800] text-white font-bold'
                : 'border-transparent text-slate-200 hover:bg-[#002D5A] hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            FACILITY LOOKUP
          </Link>

          <Link
            href="/?view=consent"
            className={`px-4 py-3 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-4 ${
              currentTab === 'consent'
                ? 'bg-[#002855] border-[#FF9800] text-white font-bold'
                : 'border-transparent text-slate-200 hover:bg-[#002D5A] hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            CONSENT & MEMORY
          </Link>

          <Link
            href="/?view=escalations"
            className={`px-4 py-3 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-4 ${
              currentTab === 'escalations'
                ? 'bg-[#002855] border-[#FF9800] text-white font-bold'
                : 'border-transparent text-slate-200 hover:bg-[#002D5A] hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            HUMAN ESCALATIONS
          </Link>

          <Link
            href="/dashboard"
            className={`px-4 py-3 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-4 ${
              currentTab === 'dashboard'
                ? 'bg-[#002855] border-[#FF9800] text-white font-bold'
                : 'border-transparent text-slate-200 hover:bg-[#002D5A] hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            CALL DASHBOARD
          </Link>
        </div>
      </nav>
    </header>
  );
}
