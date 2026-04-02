import Sidebar from './Sidebar';

export default function Shell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">{children}</main>
    </div>
  );
}
