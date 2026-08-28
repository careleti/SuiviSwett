import { Users, BookOpen, GraduationCap, ChevronRight, AlertCircle } from 'lucide-react';
import { useTeacherData } from '@/hooks/useTeacherData';
import { useAuth } from '@/hooks/useAuth';

interface TeacherOverviewViewProps {
  onSelectClassSubject: (classId: string, classId_name: string, subjectId: string, subjectName: string) => void;
}

export function TeacherOverviewView({ onSelectClassSubject }: TeacherOverviewViewProps) {
  const { profile, school } = useAuth();
  const { assignments, loading, error } = useTeacherData();

  const displayName = profile?.full_name || profile?.email || 'Enseignant';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-navy-500">
          Bonjour, {firstName}
        </h1>
        <p className="text-navy-300 mt-1">
          Voici vos classes et matières assignées{school ? ` — ${school.name}` : ''}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-coral-50 text-coral-500 text-sm rounded-xl px-5 py-4 animate-fade-in">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="card-base p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
            <Users size={32} className="text-navy-200" />
          </div>
          <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucune classe assignée</h3>
          <p className="text-navy-300 text-sm">
            L'administrateur de votre école ne vous a pas encore assigné de classes et de matières.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="card-base p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={20} className="text-navy-300" />
              </div>
              <div>
                <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Mes classes</p>
                <p className="font-heading font-bold text-3xl text-navy-500 mt-1">{assignments.length}</p>
              </div>
            </div>
            <div className="card-base p-5 flex items-start gap-4 animate-slide-up">
              <div className="w-11 h-11 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
                <BookOpen size={20} className="text-gold-400" />
              </div>
              <div>
                <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Mes matières</p>
                <p className="font-heading font-bold text-3xl text-navy-500 mt-1">
                  {new Set(assignments.flatMap((a) => a.subjects.map((s) => s.id))).size}
                </p>
              </div>
            </div>
            <div className="card-base p-5 flex items-start gap-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
              <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-success-400" />
              </div>
              <div>
                <p className="text-navy-200 text-xs font-medium uppercase tracking-wide">Total élèves</p>
                <p className="font-heading font-bold text-3xl text-navy-500 mt-1">
                  {assignments.reduce((sum, a) => sum + a.studentCount, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Class cards */}
          <div>
            <h2 className="font-heading font-bold text-lg text-navy-500 mb-4">Mes classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {assignments.map((assignment) => (
                <div
                  key={assignment.class.id}
                  className="card-base p-6 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={22} className="text-navy-300" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-lg text-navy-500">{assignment.class.name}</h3>
                        {assignment.class.level && (
                          <p className="text-xs text-navy-200">{assignment.class.level}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-400 text-xs font-medium">
                      <Users size={12} />
                      {assignment.studentCount} élève{assignment.studentCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <p className="text-xs text-navy-200 font-medium uppercase tracking-wide mb-2">Matières enseignées</p>
                    {assignment.subjects.length === 0 ? (
                      <p className="text-sm text-navy-200 italic">Aucune matière assignée</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assignment.subjects.map((subject) => (
                          <button
                            key={subject.id}
                            onClick={() => onSelectClassSubject(
                              assignment.class.id,
                              assignment.class.name,
                              subject.id,
                              subject.name,
                            )}
                            className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cream/60 hover:bg-gold-50 border border-navy-50 hover:border-gold-200 transition-all duration-200"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: subject.color || '#1B2A4A' }}
                            />
                            <span className="text-sm font-medium text-navy-400 group-hover:text-navy-500">
                              {subject.name}
                            </span>
                            <ChevronRight size={14} className="text-navy-200 group-hover:text-gold-400 transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
