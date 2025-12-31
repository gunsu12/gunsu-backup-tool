import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import Schedules from './pages/Schedules';
import History from './pages/History';

const App = () => {
    return (
        <ThemeProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="connections" element={<Connections />} />
                        <Route path="schedules" element={<Schedules />} />
                        <Route path="history" element={<History />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeProvider>
    );
};

export default App;
