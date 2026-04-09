import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../auth/AuthContext';

export default function Shell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell bg-surface min-h-screen">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} user={user} />

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menu"
          className="fixed inset-0 z-40 bg-[#001631]/45 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <header className="sticky top-0 z-40 bg-white shadow-sm flex items-center gap-3 px-4 md:px-6 py-3">
          <button
            type="button"
            aria-label="Abrir menu"
            className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span>
          </button>

          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: 18 }}>search</span>
            <input
              className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-on-surface placeholder:text-on-surface-variant/60"
              placeholder="Buscar proyecto o ejecutivo..."
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-md transition-colors"
            >
              Salir
            </button>
            <div className="w-auto min-w-8 h-8 rounded-full bg-primary-container flex items-center justify-center px-2">
              <span className="text-white text-xs font-bold">{user?.displayName?.split(' ').map((s) => s[0]).slice(0,2).join('') || 'U'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
