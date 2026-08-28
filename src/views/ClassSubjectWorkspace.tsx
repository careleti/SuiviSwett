import { useState } from 'react';
import {
  ArrowLeft, School, BookOpen, ClipboardEdit, MessageSquareText,
} from 'lucide-react';
import { GradeEntryView } from '@/views/GradeEntryView';
import { AppreciationEntryView } from '@/views/AppreciationEntryView';

interface ClassSubjectWorkspaceProps {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  onBack: () => void;
}

type Tab = 'grades' | 'appreciations';

export function ClassSubjectWorkspace({
  classId,
  className,
  subjectId,
  subjectName,
  onBack,
}: ClassSubjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<Tab>('grades');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white shadow-card hover:shadow-card-hover transition-all text-navy-300 hover:text-navy-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-heading font-bold text-2xl text-navy-500">
            {className}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1.5 text-sm text-navy-300">
              <BookOpen size={14} />
              {subjectName}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-navy-50">
        <button
          onClick={() => setActiveTab('grades')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
            activeTab === 'grades'
              ? 'border-gold-400 text-navy-500'
              : 'border-transparent text-navy-200 hover:text-navy-300'
          }`}
        >
          <ClipboardEdit size={16} />
          Notes
        </button>
        <button
          onClick={() => setActiveTab('appreciations')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px ${
            activeTab === 'appreciations'
              ? 'border-gold-400 text-navy-500'
              : 'border-transparent text-navy-200 hover:text-navy-300'
          }`}
        >
          <MessageSquareText size={16} />
          Appréciations
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'grades' ? (
        <GradeEntryView
          classId={classId}
          className={className}
          subjectId={subjectId}
          subjectName={subjectName}
        />
      ) : (
        <AppreciationEntryView
          classId={classId}
          subjectId={subjectId}
        />
      )}
    </div>
  );
}
