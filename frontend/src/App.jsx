import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import CatalogoPage from './pages/CatalogoPage';
import CalendarioPage from './pages/CalendarioPage';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/catalogo" replace />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/formulario" element={<Navigate to="/calendario" replace />} />
        <Route path="/confirmacion" element={<Navigate to="/calendario" replace />} />
      </Routes>
    </Shell>
  );
}
