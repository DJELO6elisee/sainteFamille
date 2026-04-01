import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import ResizeObserverWrapper from './components/ResizeObserverWrapper';
import './utils/axiosConfig'; // Configuration globale Axios

// Pages
import Home from './pages/Home';
import Presentation from './pages/Presentation';
import Scolarite from './pages/Scolarite';
import ScolariteMaternel from './pages/ScolariteMaternel';
import Login from './pages/Login';
import Registration from './pages/Registration';
import SecretaryLogin from './pages/SecretaryLogin';
import GalleryJeux from './pages/GalleryJeux';
import GalleryVie from './pages/GalleryVie';
import GalleryExtras from './pages/GalleryExtras';
import JeuxEducatifs from './pages/JeuxEducatifs';
import VieAcademique from './pages/VieAcademique';
import ActivitesExtrascolaires from './pages/ActivitesExtrascolaires';
import Activites from './pages/Activites';
import Blog from './pages/Blog';
import HomepageManagement from './pages/secretary/HomepageManagement';
import StudentDashboard from './pages/StudentDashboard';
import StudentPaymentPage from './pages/StudentPaymentPage';
import StudentPaymentReturn from './pages/StudentPaymentReturn';
import StudentTimetablePage from './pages/StudentTimetablePage';
import StudentSchedule from './pages/StudentSchedule';
import ChooseTrimester from './pages/ChooseTrimester';
import MyReportCard from './pages/MyReportCard';
import StudentReportCard from './pages/StudentReportCard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import Students from './pages/secretary/Students';
import StudentDetails from './pages/secretary/StudentDetails';
import Classes from './pages/secretary/Classes';
import Teachers from './pages/secretary/Teachers';
import Payments from './pages/secretary/Payments';
import Settings from './pages/secretary/Settings';
import Subjects from './pages/secretary/Subjects';
import GestionEleves from './pages/GestionEleves';
import EventsPage from './pages/secretary/EventsPage';
import PublicEventPage from './pages/secretary/PublicEventPage';
import ClassEventSelectionPage from './pages/secretary/ClassEventSelectionPage';
import ClassEventCreationPage from './pages/secretary/ClassEventCreationPage';
import PrivateEventPage from './pages/secretary/PrivateEventPage';
import TimetableSelectionPage from './pages/secretary/TimetableSelectionPage';
import ClassTimetablePage from './pages/secretary/ClassTimetablePage';
import ReportCardsClasses from './pages/ReportCardsClasses';
import ReportCardsStudents from './pages/ReportCardsStudents';
import Cantine from './pages/secretary/Cantine';
import MediaManagementPage from './pages/secretary/MediaManagementPage';
import RolesManagement from './pages/secretary/RolesManagement';
import Garderie from './pages/secretary/Garderie';
import History from './pages/secretary/History';
import InscrptionPre from './pages/InscrptionPre';
import EducationLevels from './pages/secretary/EducationLevels';
import FraisAnnexes from './pages/secretary/FraisAnnexes';
import StudentInstallments from './pages/secretary/StudentInstallments';
import PaymentReminders from './pages/secretary/PaymentReminders';
import BulletinManagement from './pages/secretary/BulletinManagement';
import LevelClassesList from './pages/secretary/LevelClassesList';
import BulletinClassManagement from './pages/secretary/BulletinClassManagement';
import StudentBulletin from './pages/secretary/StudentBulletin';
import CompositionManagement from './pages/secretary/CompositionManagement';
import ReportsPage from './pages/secretary/ReportsPage';
import ClassBulletinManagement from './pages/secretary/ClassBulletinManagement';
import TeacherDashboard from './pages/TeacherDashboard';
import GradeManagement from './pages/teacher/GradeManagement';
import ParentDashboard from './pages/ParentDashboard';
import ParentChildProfile from './pages/ParentChildProfile';
import DOMErrorTest from './components/DOMErrorTest';
import ErrorBoundary from './components/ErrorBoundary';
import ScheduleTab from './pages/ScheduleTab';

// Components
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ServiceWorkerManager from './components/ServiceWorkerManager';

// Utils
import { registerServiceWorker } from './utils/pwaUtils';

// Hooks
import { useInactivityTimeout } from './hooks/useInactivityTimeout';

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1780c2',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

const RegistrationWrapper = () => {
  const navigate = useNavigate();
  // Fournit une fonction onClose simple qui redirige l'utilisateur.
  return <Registration onClose={() => navigate('/login')} />;
};

function AppContent() {
  const location = useLocation();
  
  // Activer le timeout d'inactivité (déconnexion après 30 minutes)
  useInactivityTimeout();
  
  // Pages où la navbar doit être masquée
  const hideNavbar =
    // Pages avec leur propre navigation
    location.pathname === '/' ||
    location.pathname === '/presentation' ||
    location.pathname === '/scolarite' ||
    location.pathname === '/scolarite-maternel' ||
    location.pathname === '/activites' ||
    location.pathname === '/blog' ||
    location.pathname === '/jeux-educatifs' ||
    location.pathname === '/vie-academique' ||
    location.pathname === '/activites-extrascolaires' ||
    // Galleries
    location.pathname === '/gallery/jeux' ||
    location.pathname === '/gallery/vie' ||
    location.pathname === '/gallery/extras' ||
    // Dashboards avec navbar personnalisée
    location.pathname === '/student/dashboard' ||
    location.pathname === '/parent/dashboard' ||
    // Toutes les pages secrétaire
    location.pathname.startsWith('/secretary/') ||
    // Toutes les pages élève
    location.pathname.startsWith('/student/') ||
    // Toutes les pages parent
    location.pathname.startsWith('/parent/') ||
    // Toutes les pages enseignant (incluant /teacher, /teacher/dashboard, /teacher/grades/*, etc.)
    location.pathname.startsWith('/teacher');


  return (
    <div className="App">
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Home />} />
        <Route path="/presentation" element={<Presentation />} />
        <Route path="/scolarite" element={<Scolarite />} />
        <Route path="/scolarite-maternel" element={<ScolariteMaternel />} />
        <Route path="/activites" element={<Activites />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<RegistrationWrapper />} />
        <Route path="/secretary-login" element={<SecretaryLogin />} />
        <Route path="/dom-error-test" element={<DOMErrorTest />} />
        {/* Galleries */}
        <Route path="/gallery/jeux" element={<GalleryJeux />} />
        <Route path="/gallery/vie" element={<GalleryVie />} />
        <Route path="/gallery/extras" element={<GalleryExtras />} />
        
        {/* Pages d'activités */}
        <Route path="/jeux-educatifs" element={<JeuxEducatifs />} />
        <Route path="/vie-academique" element={<VieAcademique />} />
        <Route path="/activites-extrascolaires" element={<ActivitesExtrascolaires />} />
        <Route path="/secretary/homepage-management" element={<HomepageManagement />} />

        {/* Routes Élève */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/payment" element={<StudentPaymentPage />} />
        <Route path="/student/payment-return" element={<StudentPaymentReturn />} />
        <Route path="/student/timetable" element={<StudentTimetablePage />} />
        <Route path="/student/schedule/:studentId" element={<StudentSchedule />} />
        <Route path="/student/choose-trimester" element={<ChooseTrimester />} />
        <Route path="/student/report-card/:trimester" element={<MyReportCard />} />
        <Route path="/student/report-card" element={<MyReportCard />} />
        <Route path="/student/report-card/:studentId/:classId" element={<StudentReportCard />} />

        {/* Routes Secrétaire */}
        <Route path="/secretary/dashboard" element={<SecretaryDashboard />} />
        <Route path="/secretary/students" element={<Students />} />
        <Route path="/secretary/students/:id" element={<StudentDetails />} />
        <Route path="/secretary/classes" element={<Classes />} />
        <Route path="/secretary/teachers" element={<Teachers />} />
        <Route path="/secretary/payments" element={<Payments />} />
        <Route path="/secretary/settings" element={<Settings />} />
        <Route path="/secretary/subjects" element={<Subjects />} />
        <Route path="/secretary/gestion-eleves" element={<GestionEleves />} />
        <Route path="/secretary/events" element={<EventsPage />} />
        <Route path="/secretary/events/public" element={<PublicEventPage />} />
        <Route path="/secretary/events/class" element={<ClassEventSelectionPage />} />
        <Route path="/secretary/events/class/:classId" element={<ClassEventCreationPage />} />
        <Route path="/secretary/events/private" element={<PrivateEventPage />} />
        <Route path="/secretary/timetables" element={<TimetableSelectionPage />} />
        <Route path="/secretary/timetables/:classId" element={<ClassTimetablePage />} />
        <Route path="/secretary/report-cards" element={<ReportCardsClasses />} />
        <Route path="/secretary/report-cards/:classId" element={<ReportCardsStudents />} />
        <Route path="/secretary/report-cards/:classId/:studentId" element={<StudentReportCard />} />
        <Route path="/secretary/cantine" element={<Cantine />} />
        <Route path="/secretary/media" element={<MediaManagementPage />} />
        <Route path="/secretary/roles" element={<RolesManagement />} />
        <Route path="/secretary/garderie" element={<Garderie />} />
        <Route path="/secretary/history" element={<History />} />
        <Route path="/secretary/inscription-pre" element={<InscrptionPre onClose={() => window.history.length > 1 ? window.history.back() : window.location.replace('/secretary/dashboard')} />} />
        <Route path="/secretary/education-levels" element={<EducationLevels />} />
        <Route path="/secretary/frais-annexes" element={<FraisAnnexes />} />
        <Route path="/secretary/student-installments" element={<StudentInstallments />} />
        <Route path="/secretary/payment-reminders" element={<PaymentReminders />} />
        <Route path="/secretary/bulletins" element={<BulletinManagement />} />
        <Route path="/secretary/bulletins/level/:levelId" element={<LevelClassesList />} />
        <Route path="/secretary/bulletins/class/:classId" element={<ClassBulletinManagement />} />
        <Route path="/secretary/notes/class/:classId" element={<GradeManagement />} />
        <Route path="/secretary/student-bulletin/:studentId" element={<StudentBulletin />} />
        <Route path="/secretary/compositions" element={<CompositionManagement />} />
        <Route path="/secretary/reports" element={<ReportsPage />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/grades/:classId" element={<GradeManagement />} />
        <Route path="/teacher/grade-management/:classId" element={<GradeManagement />} />
        <Route path="/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/parent/child/:childId" element={<ParentChildProfile />} />
      </Routes>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Enregistrer le Service Worker (il se désactivera automatiquement en développement)
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <ResizeObserverWrapper>
        <HelmetProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <ServiceWorkerManager>
                <AppContent />
                
                {/* Composant PWA Install Prompt */}
                <PWAInstallPrompt />
              </ServiceWorkerManager>
            </Router>
          </ThemeProvider>
        </HelmetProvider>
      </ResizeObserverWrapper>
    </ErrorBoundary>
  );
}

export default App;
