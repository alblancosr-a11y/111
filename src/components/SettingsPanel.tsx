import type { AppSettings } from '../lib/types';
import { Button } from '../ui';

interface Props { settings: AppSettings; onUpdate: (s: Partial<AppSettings>) => void; onClose: () => void; }

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className={`relative inline-flex w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${value ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? 'right-0.5' : 'right-auto left-0.5'}`} />
    </button>
  );
}

function Setting({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><p className="text-sm text-[var(--text-0)]">{label}</p><p className="text-[11px] text-[var(--text-3)]">{desc}</p></div>
      {children}
    </div>
  );
}

export default function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="w-full max-w-md glass-modal rounded-3xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-6 flex flex-col gap-1 border-b border-[var(--border-0)]">
          <h2 className="text-xl font-bold text-[var(--text-0)] relative right-[8px]">الإعدادات</h2>
          <p className="text-xs text-[var(--text-3)] font-bold uppercase tracking-tight opacity-60">تخصيص تجربة القراءة والحفظ</p>
        </div>
        <div className="p-6 flex flex-col gap-2">
          <div className="flex flex-col gap-0 divide-y divide-[var(--border-0)] glass-inner rounded-3xl overflow-hidden border border-[var(--border-0)]">
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-[var(--text-0)]">الوضع الليلي</p>
                <p className="text-[10px] text-[var(--text-3)] font-medium">تصميم داكن مريح للعينين</p>
              </div>
              <Toggle value={settings.darkMode} onChange={v => onUpdate({ darkMode: v })} />
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-[var(--text-0)]">حجم الخط</p>
                <p className="text-[10px] text-[var(--text-3)] font-medium">تغيير مقاس نص الأبيات</p>
              </div>
              <div className="flex gap-1 bg-[var(--bg-2)] p-1 rounded-xl">
                {[1, 2, 3].map(s => (
                  <button key={s} onClick={() => onUpdate({ fontSize: s })} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${settings.fontSize === s ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text-0)]'}`}>{s === 1 ? 'صغير' : s === 2 ? 'وسط' : 'كبير'}</button>
                ))}
              </div>
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-[var(--text-0)]">التشكيل إلزامي</p>
                <p className="text-[10px] text-[var(--text-3)] font-medium">مطابقة الحركات في الاختبارات</p>
              </div>
              <Toggle value={settings.requireTashkeel} onChange={v => onUpdate({ requireTashkeel: v })} />
            </div>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-[var(--text-0)]">أرقام الأبيات</p>
                <p className="text-[10px] text-[var(--text-3)] font-medium">عرض تسلسل الأبيات في القراءة</p>
              </div>
              <Toggle value={settings.showVerseNumbers} onChange={v => onUpdate({ showVerseNumbers: v })} />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--border-0)] flex justify-center">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold">إغلاق الإعدادات</Button>
        </div>
      </div>
    </div>
  );
}
