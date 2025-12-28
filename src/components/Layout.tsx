import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, Calendar, History } from 'lucide-react';
import clsx from 'clsx';

const NavItem = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1 group relative overflow-hidden',
                isActive
                    ? 'bg-blue-600/10 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.1)] border border-blue-600/20'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100'
            )
        }
    >
        {({ isActive }) => (
            <>
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                <Icon size={20} className={clsx("transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-105")} />
                <span className="font-medium">{children}</span>
            </>
        )}
    </NavLink>
);

const Layout = () => {
    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans selection:bg-blue-500/30">
            <aside className="w-64 bg-[#0B0D12] border-r border-gray-800 flex flex-col p-4 shadow-xl z-10">
                <div className="flex items-center gap-3 px-4 mb-10 mt-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Database size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">DB Backup</h1>
                        <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">Enterprise Tool</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    <NavItem to="/" icon={LayoutDashboard}>Dashboard</NavItem>
                    <NavItem to="/connections" icon={Database}>Connections</NavItem>
                    <NavItem to="/schedules" icon={Calendar}>Schedules</NavItem>
                    <NavItem to="/history" icon={History}>History</NavItem>
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-800/50">
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800/50">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse my-auto"></div>
                        <div className="text-xs text-gray-400">System Operational</div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-gray-950 p-8 relative">
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
