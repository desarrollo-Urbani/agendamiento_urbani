import { NavLink } from 'react-router-dom';

const items = [
  { to: '/catalogo', label: 'Catalogo' },
  { to: '/calendario', label: 'Calendario' }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Urbani</h1>
        <p>Premium Scheduling</p>
      </div>
      <nav>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
