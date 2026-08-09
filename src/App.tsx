// @ts-nocheck
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerProvider } from './lib/player.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { handleGoogleRedirect } from './lib/googleAuth.js';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Records from './pages/Records.jsx';
import BeatPage from './pages/BeatPage.jsx';
import Favorites from './pages/Favorites.jsx';
import PackPage from './pages/PackPage.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import WorkWithWaves from './pages/WorkWithWaves.jsx';

handleGoogleRedirect();

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/records" element={<Records />} />
              <Route path="/records/:id" element={<BeatPage />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/work" element={<WorkWithWaves />} />
              <Route path="/packs/:slug" element={<PackPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}
