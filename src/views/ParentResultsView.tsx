import { useState, useEffect, useMemo } from 'react';
import {
  Award, BookOpen, GraduationCap, AlertCircle, ChevronDown, MessageSquareText,
} from 'lucide-react';
import { useParentData } from '@/hooks/useParentData';
import { SealBadge } from '@/components/SealBadge';

export function ParentResultsView() {
  const {
    linkedStudents,
    terms,
    grades,
    appreciations,
    loading,
    error,
    loadTerms,
    loadResults,
    recordView,
  } = useParentData();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [viewRecordedFor, setViewRecordedFor] = useState<string | null>(null);

  const selectedStudent = useMemo(
    () => linkedStudents.find((s) => s.student_id === selectedStudentId) || null,
    [linkedStudents, selectedStudentId],
  );

  // Auto-select first student
  useEffect(() => {
    if (!selectedStudentId && linkedStudents.length > 0) {
      setSelectedStudentId(linkedStudents[0].student_id);
    }
  }, [linkedStudents, selectedStudentId]);

  // Load terms when student changes
  useEffect(() => {
    if (selectedStudentId) {
      loadTerms(selectedStudentId).then(() => {
        setSelectedTerm(null);
      });
    }
  }, [selectedStudentId, loadTerms]);

  // Auto-select first term
  useEffect(() => {
    if (!selectedTerm && terms.length > 0) {
      setSelectedTerm(terms[0].term);
    }
  }, [terms, selectedTerm]);

  // Load results when term changes
  useEffect(() => {
    if (selectedStudentId && selectedTerm) {
      loadResults(selectedStudentId, selectedTerm);
    }
  }, [selectedStudentId, selectedTerm, loadResults]);

  // Auto-record view (only once per student+term)
  useEffect(() => {
    if (selectedStudentId && selectedTerm && selectedStudent && viewRecordedFor !== `${selectedStudentId}|${selectedTerm}`) {
      const key = `${selectedStudentId}|${selectedTerm}`;
      recordView(selectedStudentId, selectedTerm, selectedStudent.access_code);
      setViewRecordedFor(key);
    }
  }, [selectedStudentId, selectedTerm, selectedStudent, recordView, viewRecordedFor]);

  const generalAverage = useMemo(() => {
    const validGrades = grades.filter((g) => g.score !== null);
    if (validGrades.length === 0) return null;
    const sum = validGrades.reduce((acc, g) => acc + (g.score! / g.max_score) * 20, 0);
    return sum / validGrades.length;
  }, [grades]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-navy-500">Résultats</h1>
        <p className="text-navy-300 mt-1">Consultez les bulletins et appréciations de vos enfants</p>
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
      ) : linkedStudents.length === 0 ? (
        <div className="card-base p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-navy-50 flex items-center justify-center mb-4">
            <GraduationCap size={32} className="text-navy-200" />
          </div>
          <h3 className="font-heading font-bold text-lg text-navy-500 mb-1">Aucun enfant lié</h3>
          <p className="text-navy-300 text-sm">
            Aucun élève n'est associé à votre compte. Contactez l'administration de l'école.
          </p>
        </div>
      ) : (
        <>
          {/* Student selector */}
          {linkedStudents.length > 1 && (
            <div className="flex flex-wrap gap-3">
              {linkedStudents.map((student) => (
                <button
                  key={student.student_id}
                  onClick={() => setSelectedStudentId(student.student_id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                    selectedStudentId === student.student_id
                      ? 'bg-navy-500 text-white border-navy-500 shadow-md'
                      : 'bg-white text-navy-400 border-navy-100 hover:border-navy-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-xs flex-shrink-0 ${
                    selectedStudentId === student.student_id ? 'bg-navy-600 text-gold-400' : 'bg-navy-50 text-navy-300'
                  }`}>
                    {student.first_name.charAt(0).toUpperCase()}{student.last_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{student.first_name} {student.last_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Single student header */}
          {selectedStudent && (
            <div className="card-base p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={28} className="text-navy-300" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading font-bold text-xl text-navy-500">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
                <p className="text-sm text-navy-300">
                  {selectedStudent.class_name || 'Classe non assignée'}
                </p>
              </div>
            </div>
          )}

          {/* Term selector */}
          {terms.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-navy-300">Période :</span>
              <div className="flex flex-wrap gap-2">
                {terms.map((term) => (
                  <button
                    key={term.term}
                    onClick={() => setSelectedTerm(term.term)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedTerm === term.term
                        ? 'bg-gold-400 text-navy-800 shadow-md'
                        : 'bg-white text-navy-300 border border-navy-100 hover:border-gold-200'
                    }`}
                  >
                    {term.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-base p-8 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-navy-50 flex items-center justify-center mb-3">
                <Award size={28} className="text-navy-200" />
              </div>
              <h3 className="font-heading font-bold text-base text-navy-500 mb-1">Aucun résultat publié</h3>
              <p className="text-navy-300 text-sm">
                Les résultats de cette période n'ont pas encore été publiés par l'école.
              </p>
            </div>
          )}

          {/* Results */}
          {selectedTerm && terms.length > 0 && (
            <>
              {/* General average seal */}
              <div className="bg-navy-500 rounded-2xl p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-navy-200 text-sm font-medium uppercase tracking-wide mb-1">Moyenne générale</p>
                  <h2 className="font-heading font-bold text-2xl text-white mb-1">
                    {selectedStudent?.first_name} {selectedStudent?.last_name}
                  </h2>
                  <p className="text-navy-200 text-sm">
                    {terms.find((t) => t.term === selectedTerm)?.label}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <SealBadge value={generalAverage} size="lg" />
                    <p className="text-navy-200 text-xs mt-2">/ 20</p>
                  </div>
                </div>
              </div>

              {/* Grades table */}
              <div className="card-base overflow-hidden">
                <div className="px-5 py-4 border-b border-navy-50 flex items-center gap-2">
                  <BookOpen size={18} className="text-navy-300" />
                  <h3 className="font-heading font-bold text-base text-navy-500">Notes par matière</h3>
                </div>
                {grades.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm text-navy-200">Aucune note validée pour cette période.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-navy-200 uppercase tracking-wide border-b border-navy-50">
                          <th className="px-5 py-3 font-medium">Matière</th>
                          <th className="px-5 py-3 font-medium text-center">Note</th>
                          <th className="px-5 py-3 font-medium text-center hidden sm:table-cell">Sur</th>
                          <th className="px-5 py-3 font-medium hidden sm:table-cell">Évaluation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((grade, idx) => (
                          <tr key={idx} className="border-b border-navy-50/50 hover:bg-cream/50 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: grade.subject_color || '#1B2A4A' }}
                                />
                                <span className="font-medium text-navy-500 text-sm">{grade.subject_name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {grade.score !== null ? (
                                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-heading font-bold text-sm ${
                                  grade.score >= grade.max_score / 2
                                    ? 'bg-success-100 text-success-500'
                                    : 'bg-coral-100 text-coral-500'
                                }`}>
                                  {grade.score}
                                </span>
                              ) : (
                                <span className="text-navy-200 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center text-sm text-navy-300 hidden sm:table-cell">
                              {grade.max_score}
                            </td>
                            <td className="px-5 py-4 text-sm text-navy-300 hidden sm:table-cell">
                              {grade.session_title}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Appreciations */}
              {appreciations.length > 0 && (
                <div className="card-base overflow-hidden">
                  <div className="px-5 py-4 border-b border-navy-50 flex items-center gap-2">
                    <MessageSquareText size={18} className="text-navy-300" />
                    <h3 className="font-heading font-bold text-base text-navy-500">Appréciations des enseignants</h3>
                  </div>
                  <div className="divide-y divide-navy-50/50">
                    {appreciations.map((appr, idx) => (
                      <div key={idx} className="px-5 py-4 flex items-start gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: appr.subject_color || '#1B2A4A' }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-navy-500 mb-1">{appr.subject_name}</p>
                          {appr.comment ? (
                            <p className="text-sm text-navy-300 leading-relaxed">{appr.comment}</p>
                          ) : (
                            <p className="text-sm text-navy-200 italic">Aucune appréciation pour cette matière.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
