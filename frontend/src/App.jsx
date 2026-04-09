import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Shell from './components/Shell';
import DashboardPage from './pages/DashboardPage';
import CatalogoPage from './pages/CatalogoPage';
import CalendarioPage from './pages/CalendarioPage';
import LeadsPage from './pages/LeadsPage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProjectHistoryPage from './pages/ProjectHistoryPage';
import AdminUsersPage from './pages/AdminUsersPage';

function PrivateLayout({ children }) {
  return (
    <ProtectedRoute>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<PrivateLayout><DashboardPage /></PrivateLayout>} />
      <Route path="/catalogo" element={<PrivateLayout><CatalogoPage /></PrivateLayout>} />
      <Route path="/calendario" element={<PrivateLayout><CalendarioPage /></PrivateLayout>} />
      <Route path="/citas" element={<PrivateLayout><LeadsPage /></PrivateLayout>} />
      <Route path="/cambiar-contrasena" element={<PrivateLayout><ChangePasswordPage /></PrivateLayout>} />
      <Route path="/administradores" element={<PrivateLayout><AdminUsersPage /></PrivateLayout>} />
      <Route path="/proyectos/:id/historial" element={<PrivateLayout><ProjectHistoryPage /></PrivateLayout>} />

      <Route path="/formulario" element={<Navigate to="/calendario" replace />} />
      <Route path="/confirmacion" element={<Navigate to="/calendario" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
