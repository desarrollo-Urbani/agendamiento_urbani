import Sidebar from './Sidebar';

export default function Shell({ children }) {
  return (
    <div className="app-shell bg-surface min-h-screen">
      <Sidebar />
      {/* Main area offset by sidebar width */}
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: '16rem' }}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white shadow-sm flex justify-between items-center px-6 py-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: 18 }}>search</span>
            <input
              className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-on-surface placeholder:text-on-surface-variant/60"
              placeholder="Buscar proyecto o ejecutivo..."
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>person</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
