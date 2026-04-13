import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Shell from './components/Shell';
import DashboardPage from './pages/DashboardPage';
import CatalogoPage from './pages/CatalogoPage';
import CalendarioPage from './pages/CalendarioPage';
import LeadsPage from './pages/LeadsPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProjectHistoryPage from './pages/ProjectHistoryPage';
import AdminUsersPage from './pages/AdminUsersPage';
import LogsPage from './pages/LogsPage';
import SupabaseAuthAdminPage from './pages/SupabaseAuthAdminPage';

function PrivateLayout({ children, allowedRoles = null }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<PrivateLayout allowedRoles={['admin', 'usuario']}><DashboardPage /></PrivateLayout>} />
      <Route path="/catalogo" element={<PrivateLayout allowedRoles={['admin']}><CatalogoPage /></PrivateLayout>} />
      <Route path="/calendario" element={<PrivateLayout allowedRoles={['admin', 'usuario', 'lector']}><CalendarioPage /></PrivateLayout>} />
      <Route path="/citas" element={<PrivateLayout allowedRoles={['admin', 'usuario', 'lector']}><LeadsPage /></PrivateLayout>} />
      <Route path="/cambiar-contrasena" element={<PrivateLayout allowedRoles={['admin']}><ChangePasswordPage /></PrivateLayout>} />
      <Route path="/administradores" element={<PrivateLayout allowedRoles={['admin']}><AdminUsersPage /></PrivateLayout>} />
      <Route path="/logs" element={<PrivateLayout allowedRoles={['admin', 'usuario']}><LogsPage /></PrivateLayout>} />
      <Route path="/auth-supabase" element={<PrivateLayout allowedRoles={['admin']}><SupabaseAuthAdminPage /></PrivateLayout>} />
      <Route path="/proyectos/:id/historial" element={<PrivateLayout allowedRoles={['admin']}><ProjectHistoryPage /></PrivateLayout>} />

      <Route path="/formulario" element={<Navigate to="/calendario" replace />} />
      <Route path="/confirmacion" element={<Navigate to="/calendario" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
