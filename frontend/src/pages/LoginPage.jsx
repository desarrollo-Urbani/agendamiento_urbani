import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface grid place-items-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-surface p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-primary-container">Iniciar Sesion</h1>
          <p className="text-sm text-on-surface-variant mt-1">Accede con tu correo de ejecutivo.</p>
        </div>

        {error && <div className="p-3 rounded-md bg-error-container text-on-error-container text-sm">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
              placeholder="nombre@empresa.cl"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Contrasena</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-md px-3 py-2.5 text-sm"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white text-sm font-semibold py-2.5 rounded-md disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #000a1e, #002147)' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
