import { NavLink } from 'react-router-dom';

const items = [
  { to: '/catalogo', label: 'Inventario', icon: 'real_estate_agent' },
  { to: '/calendario', label: 'Calendario', icon: 'calendar_month' },
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 flex flex-col p-4 z-50 shadow-2xl overflow-hidden transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      style={{ background: '#002147' }}
    >
      <div className="flex items-center justify-between md:justify-start mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0054cd' }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>domain</span>
          </div>
          <div>
            <h1 className="text-base font-headline font-black text-white leading-tight">Urbani Management</h1>
            <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Enterprise Suite</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar menu"
          className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full"
          onClick={onClose}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-[#0054cd] text-white'
                  : 'text-slate-300 hover:text-white hover:bg-[#0054cd]/20 hover:translate-x-0.5'
              }`
            }
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-1 pt-4 border-t border-white/10">
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-[#0054cd]/20 rounded-md transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help</span>
          Soporte
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-[#0054cd]/20 rounded-md transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          Configuracion
        </a>
      </div>
    </aside>
  );
}
