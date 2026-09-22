import { useState, type ReactNode, type ComponentType } from 'react';
import { Home, BookOpen, BarChart3, Settings, Menu, X, Moon, Sun, PenLine } from 'lucide-react';
import GazelleIcon from './GazelleIcon';

type Page = 'home' | 'poems' | 'session' | 'stats' | 'settings' | 'fateen';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  children: ReactNode;
}

type NavIcon = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

const navItems: Array<{
  id: Page;
  icon: NavIcon;
  label: string;
  hint?: string;
  separated?: boolean;
}> = [
  { id: 'home', icon: Home, label: 'الرئيسية' },
  { id: 'poems', icon: BookOpen, label: 'قصائدي' },
  {
    id: 'fateen',
    icon: GazelleIcon,
    label: 'تحدي فطين',
    hint: 'جديد',
    separated: true,
  },
  { id: 'stats', icon: BarChart3, label: 'الإحصائيات', separated: true },
  { id: 'settings', icon: Settings, label: 'الإعدادات' },
];

export default function Layout({ currentPage, onNavigate, darkMode, onToggleDark, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 glass-sidebar border-l border-[var(--border-0)]">
        <div className="p-5 pb-7">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-sm shadow-[var(--accent)]/30">
              <PenLine size={15} className="text-white" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight gradient-accent-text" style={{ fontFamily: 'var(--font-brand)' }}>مَدَارِج</h1>
              <p className="text-[10px] text-[var(--text-3)] -mt-0.5">حفظُ القصائد العربية</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <div key={item.id}>
              {item.separated && (
                <div className="my-3 border-t border-[var(--border-0)]" />
              )}
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  currentPage === item.id
                    ? 'bg-[var(--accent-light)] text-[var(--accent-text)] font-medium shadow-sm shadow-[var(--accent)]/10'
                    : 'text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)]'
                }`}
              >
                <item.icon size={16} strokeWidth={currentPage === item.id ? 2 : 1.5} />
                <span className={`flex-1 text-right ${item.id === 'fateen' ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
                {item.hint && currentPage !== item.id && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--border-1)]">
                    {item.hint}
                  </span>
                )}
              </button>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border-0)]">
          <button
            onClick={onToggleDark}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-all duration-200"
          >
            {darkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
            {darkMode ? 'وضع نهاري' : 'وضع ليلي'}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-64 glass-modal flex flex-col animate-slide-in">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg gradient-accent flex items-center justify-center">
                  <PenLine size={13} className="text-white" strokeWidth={1.8} />
                </div>
                <h1 className="text-base font-bold gradient-accent-text" style={{ fontFamily: 'var(--font-brand)' }}>مَدَارِج</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)]">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-1">
              {navItems.map(item => (
                <div key={item.id}>
                  {item.separated && (
                    <div className="my-3 border-t border-[var(--border-0)]" />
                  )}
                  <button
                    onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                      currentPage === item.id
                        ? 'bg-[var(--accent-light)] text-[var(--accent-text)] font-medium'
                        : 'text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)]'
                    }`}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                    <span className={`flex-1 text-right ${item.id === 'fateen' ? 'font-bold' : ''}`}>
                      {item.label}
                    </span>
                    {item.hint && currentPage !== item.id && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--border-1)]">
                        {item.hint}
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-[var(--border-0)]">
              <button onClick={onToggleDark} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-2)] hover:bg-[var(--bg-2)]">
                {darkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
                {darkMode ? 'وضع نهاري' : 'وضع ليلي'}
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
      <header className="lg:hidden glass-header flex items-center border-b border-[var(--border-0)] px-1 py-3">

  {/* القائمة */}
  <button
    onClick={() => setSidebarOpen(true)}
    className="w-11 h-11 flex items-center justify-center rounded-lg text-[var(--text-1)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] shrink-0"
  >
    <Menu size={24} strokeWidth={1.8} />
  </button>

  {/* اسم التطبيق */}
  <div className="flex-1 flex items-center justify-center">
    <h1
      className="text-xl font-bold gradient-accent-text"
      style={{ fontFamily: 'var(--font-brand)' }}
    >
      مَدَارج
    </h1>
  </div>

  {/* الوضع الليلي */}
  <button
    onClick={onToggleDark}
    className="w-11 h-11 flex items-center justify-center rounded-lg text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] shrink-0"
  >
    {darkMode ? (
      <Sun size={24} strokeWidth={1.8} />
    ) : (
      <Moon size={24} strokeWidth={1.8} />
    )}
  </button>

</header>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto page-container py-6 lg:py-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
