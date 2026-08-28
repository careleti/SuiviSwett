import { useState, useEffect } from 'react';
import { AuthProvider, useAuth, roleToRouteRole } from '@/hooks/useAuth';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SchoolsView } from '@/views/SchoolsView';
import { ClassesView } from '@/views/ClassesView';
import { StudentsView } from '@/views/StudentsView';
import { TeachersView } from '@/views/TeachersView';
import { TeacherOverviewView } from '@/views/TeacherOverviewView';
import { ClassSubjectWorkspace } from '@/views/ClassSubjectWorkspace';
import { ParentResultsView } from '@/views/ParentResultsView';
import { ConsultationTrackingView } from '@/views/ConsultationTrackingView';
import { BulletinValidationView } from '@/views/BulletinValidationView';
import type { Page } from '@/lib/roles';

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [activeSection, setActiveSection] = useState('overview');
  const [gradeEntryTarget, setGradeEntryTarget] = useState<{
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
  } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (session && profile) {
      setCurrentPage('dashboard');
    } else {
      if (currentPage === 'dashboard') {
        setCurrentPage('landing');
      }
    }
  }, [session, profile, loading, currentPage]);

  const handleLogout = async () => {
    await signOut();
    setCurrentPage('landing');
    setActiveSection('overview');
    setGradeEntryTarget(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-navy-100 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-navy-300 text-sm font-medium">Chargement de SuiviSweet...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'dashboard') {
    if (!session || !profile) {
      return <LoginPage onNavigate={setCurrentPage} />;
    }
    const role = roleToRouteRole(profile.role);

    let sectionContent: React.ReactNode;
    if (role === 'super-admin' && activeSection === 'schools') {
      sectionContent = <SchoolsView />;
    } else if (role === 'school-admin' && activeSection === 'classes') {
      sectionContent = <ClassesView />;
    } else if (role === 'school-admin' && activeSection === 'students') {
      sectionContent = <StudentsView />;
    } else if (role === 'school-admin' && activeSection === 'teachers') {
      sectionContent = <TeachersView />;
    } else if (role === 'teacher' && gradeEntryTarget) {
      sectionContent = (
        <ClassSubjectWorkspace
          classId={gradeEntryTarget.classId}
          className={gradeEntryTarget.className}
          subjectId={gradeEntryTarget.subjectId}
          subjectName={gradeEntryTarget.subjectName}
          onBack={() => {
            setGradeEntryTarget(null);
            setActiveSection('overview');
          }}
        />
      );
    } else if (role === 'teacher' && (activeSection === 'overview' || activeSection === 'grades')) {
      sectionContent = (
        <TeacherOverviewView
          onSelectClassSubject={(classId, className, subjectId, subjectName) => {
            setGradeEntryTarget({ classId, className, subjectId, subjectName });
            setActiveSection('grades');
          }}
        />
      );
    } else if (role === 'parent' && activeSection === 'results') {
      sectionContent = <ParentResultsView />;
    } else if (role === 'school-admin' && activeSection === 'results') {
      sectionContent = <BulletinValidationView />;
    } else if (role === 'school-admin' && (activeSection === 'publish' || activeSection === 'consultations')) {
      sectionContent = <ConsultationTrackingView />;
    } else {
      sectionContent = <DashboardPage role={role} />;
    }

    return (
      <DashboardLayout
        role={role}
        activeSection={activeSection}
        onSectionChange={(section) => {
          setGradeEntryTarget(null);
          setActiveSection(section);
        }}
        onLogout={handleLogout}
      >
        {sectionContent}
      </DashboardLayout>
    );
  }

  if (currentPage === 'login') {
    if (session && profile) {
      setCurrentPage('dashboard');
      return null;
    }
    return <LoginPage onNavigate={setCurrentPage} />;
  }

  return <LandingPage onNavigate={setCurrentPage} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
