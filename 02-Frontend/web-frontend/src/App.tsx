import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import LoginPage from '@/pages/Auth/LoginPage';
import RegisterPage from '@/pages/Auth/RegisterPage';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import StudentListPage from '@/pages/Students/StudentListPage';
import StudentDetailPage from '@/pages/Students/StudentDetailPage';
import StudentFormPage from '@/pages/Students/StudentFormPage';
import LessonGeneratePage from '@/pages/Lesson/LessonGeneratePage';
import LessonDetailPage from '@/pages/Lesson/LessonDetailPage';
import LessonHistoryPage from '@/pages/Lesson/LessonHistoryPage';
import HomeworkUploadPage from '@/pages/Homework/HomeworkUploadPage';
import ResourceListPage from '@/pages/Resources/ResourceListPage';
import ProgressTrackPage from '@/pages/Progress/ProgressTrackPage';
import SettingsPage from '@/pages/Settings/SettingsPage';
import AgentDemoPage from '@/pages/Agent/AgentDemoPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/students" element={<StudentListPage />} />
        <Route path="/students/new" element={<StudentFormPage />} />
        <Route path="/students/:id" element={<StudentDetailPage />} />
        <Route path="/students/:id/edit" element={<StudentFormPage />} />

        <Route path="/lessons/new" element={<LessonGeneratePage />} />
        <Route path="/lessons/:id" element={<LessonDetailPage />} />
        <Route path="/lessons/history" element={<LessonHistoryPage />} />

        <Route path="/homework" element={<HomeworkUploadPage />} />

        <Route path="/resources" element={<ResourceListPage />} />

        <Route path="/progress" element={<ProgressTrackPage />} />

        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/agent/demo" element={<AgentDemoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
