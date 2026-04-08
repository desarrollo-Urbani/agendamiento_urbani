import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Shell({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell bg-surface min-h-screen">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

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
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>person</span>
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
