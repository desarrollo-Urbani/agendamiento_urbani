import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function normalizeRole(role) {
  const raw = String(role || '').toLowerCase();
  if (raw === 'executive') return 'usuario';
  return raw;
}

function getDefaultPathByRole(role) {
  if (role === 'admin') return '/dashboard';
  if (role === 'usuario') return '/dashboard';
  if (role === 'lector') return '/calendario';
  return '/dashboard';
}

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-on-surface-variant">Cargando sesion...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const role = normalizeRole(user.role);
    if (!allowedRoles.includes(role)) {
      return <Navigate to={getDefaultPathByRole(role)} replace />;
    }
  }

  return children;
}
