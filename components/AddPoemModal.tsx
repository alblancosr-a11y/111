import { useState, useEffect } from 'react';
import { X, FileText, User } from 'lucide-react';
import type { Poem, Verse } from '../lib/types';
import { parsePoem } from '../lib/poem-parser';
import { Button, Input, TextArea } from '../ui';

interface Props {
  onClose: () => void;
  onAdd: (poem: Poem) => void;
  editPoem?: Poem;
}

export default function AddPoemModal({ onClose, onAdd, editPoem }: Props) {
  const [title, setTitle] = useState(editPoem?.title || '');
  const [poet, setPoet] = useState(editPoem?.poet || '');
  const [rawText, setRawText] = useState(editPoem?.rawText || '');
  const [verses, setVerses] = useState<Verse[]>(editPoem?.verses || []);
  const [error, setError] = useState('');

  useEffect(() => {
    setVerses(rawText.trim() ? parsePoem(rawText) : []);
  }, [rawText]);

  const handleSubmit = () => {
    if (!rawText.trim()) {
      setError('أدخلي نص القصيدة');
      return;
    }

    if (!verses.length) {
      setError('لم يُتعرف على أبيات — كل سطرين بيت');
      return;
    }

    onAdd({
      id: editPoem?.id || crypto.randomUUID(),
      title: title.trim() || 'قصيدة بدون عنوان',
      poet: poet.trim() || 'شاعر غير معروف',
      rawText: rawText.trim(),
      verses,
      createdAt: editPoem?.createdAt || Date.now(),
      updatedAt: Date.now(),
      currentVerseIndex: editPoem?.currentVerseIndex || 0,
      lastCompletedVerseIndex: editPoem?.lastCompletedVerseIndex ?? -1,
      lastSession: editPoem?.lastSession || null,
      studyDays: editPoem?.studyDays || [],
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-lg glass-modal rounded-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-0)]">
          <h2 className="text-sm font-semibold text-[var(--text-0)] me-8 relative right-[8px]">
            {editPoem ? 'تعديل القصيدة' : 'إضافة قصيدة'}
          </h2>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-0)] hover:bg-[var(--bg-2)] transition-colors relative left-[8px]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-8 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* Title field */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-1)] px-1 uppercase tracking-wider relative -left-[10px]">
              اسم القصيدة
            </label>

            <div className="relative">
              <FileText
                size={16}
                className="absolute right-[6px] top-[6px] text-[var(--text-3)] pointer-events-none opacity-40"
                strokeWidth={2.5}
              />

              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: قصيدة بمَ التعلّل"
                className="pr-[80px] [text-indent:22px]"
              />
            </div>
          </div>

          {/* Poet field */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-1)] px-1 uppercase tracking-wider relative -left-[10px]">
              الشاعر
            </label>

            <div className="relative">
              <User
                size={16}
                className="absolute right-[6px] top-[6px] text-[var(--text-3)] pointer-events-none opacity-40"
                strokeWidth={2.5}
              />

              <Input
                value={poet}
                onChange={e => setPoet(e.target.value)}
                placeholder="مثال: المتنبي"
                className="pr-[80px] [text-indent:22px]"
              />
            </div>
          </div>

          {/* Poem text */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
              <label className="text-xs font-bold text-[var(--text-1)] uppercase tracking-wider relative -left-[10px]">
                نص القصيدة
              </label>

              <span className="text-[12px] text-[var(--text-1)] font-bold opacity-60 relative left-[10px]">
                كل سطرين = بيت واحد
              </span>
            </div>

            <TextArea
              value={rawText}
              onChange={e => {
                setRawText(e.target.value);
                setError('');
              }}
              placeholder={
                "بمَ التعلّلُ لا أهلٌ وَلا وَطَنُ\nولا ندِيمٌ وَلا كأسٌ وَلا سكَنُ"
              }
              rows={8}
              dir="rtl"
              style={{
                fontFamily: 'var(--font-poem)',
                fontSize: '1rem',
                lineHeight: '2',
                paddingRight: '16px',
                 paddingTop: '10px'
              }}
              className="bg-white/5 dark:bg-black/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border-0)]">
          <Button
            variant="ghost"
            size="sm"
            className="w-auto px-4 relative -left-[10px]"
            onClick={onClose}
          >
            إلغاء
          </Button>

          <Button
            variant="primary"
            size="sm"
             className="!w-[70px] !min-w-[70px] !h-[26px] !px-0 relative -right-[10px]"
            onClick={handleSubmit}
          >
            {editPoem ? 'حفظ' : 'إضافة'}
          </Button>
        </div>
      </div>
    </div>
  );
}