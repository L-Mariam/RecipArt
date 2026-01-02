import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import ViewReceipt from './pages/ViewReceipt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';

const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
          <Navbar />
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/view/:id" element={<ViewReceipt />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
          </div>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;