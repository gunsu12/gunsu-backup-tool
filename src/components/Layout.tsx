import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, Calendar, History, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../contexts/ThemeContext';

const NavItem = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg mb-1 group relative overflow-hidden',
                isActive
                    ? 'bg-blue-600/10 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.1)] border border-blue-600/20'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100'
            )
        }
    >
        {({ isActive }) => (
            <>
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                <Icon size={20} />
                <span className="font-medium">{children}</span>
            </>
        )}
    </NavLink>
);

const Layout = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className={clsx(
            "flex h-screen overflow-hidden font-sans selection:bg-blue-500/30",
            theme === 'dark' 
                ? "bg-gray-950 text-white" 
                : "bg-gray-100 text-gray-900"
        )}>
            <aside className={clsx(
                "w-64 border-r flex flex-col p-4 shadow-xl z-10",
                theme === 'dark' 
                    ? "bg-[#0B0D12] border-gray-800" 
                    : "bg-white border-gray-200"
            )}>
                <div className="flex items-center gap-3 px-4 mb-10 mt-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Database size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className={clsx(
                            "text-xl font-bold tracking-tight bg-gradient-to-r bg-clip-text text-transparent",
                            theme === 'dark' 
                                ? "from-white to-gray-400" 
                                : "from-gray-900 to-gray-600"
                        )}>DB Backup</h1>
                        <p className={clsx(
                            "text-[10px] font-medium tracking-wider uppercase",
                            theme === 'dark' ? "text-gray-500" : "text-gray-400"
                        )}>Enterprise Tool</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    <NavItem to="/" icon={LayoutDashboard}>Dashboard</NavItem>
                    <NavItem to="/connections" icon={Database}>Connections</NavItem>
                    <NavItem to="/schedules" icon={Calendar}>Schedules</NavItem>
                    <NavItem to="/history" icon={History}>History</NavItem>
                </nav>

                <div className={clsx(
                    "mt-auto pt-6 border-t",
                    theme === 'dark' ? "border-gray-800/50" : "border-gray-200"
                )}>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 mb-3",
                            theme === 'dark'
                                ? "text-gray-400 hover:bg-gray-800/50 hover:text-gray-100"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                    >
                        {theme === 'dark' ? (
                            <>
                                <Sun size={20} />
                                <span className="font-medium">Light Mode</span>
                            </>
                        ) : (
                            <>
                                <Moon size={20} />
                                <span className="font-medium">Dark Mode</span>
                            </>
                        )}
                    </button>

                    <div className={clsx(
                        "flex items-center gap-3 px-4 py-2 rounded-lg border",
                        theme === 'dark' 
                            ? "bg-gray-900/50 border-gray-800/50" 
                            : "bg-gray-50 border-gray-200"
                    )}>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse my-auto"></div>
                        <div className={clsx(
                            "text-xs",
                            theme === 'dark' ? "text-gray-400" : "text-gray-500"
                        )}>System Operational</div>
                    </div>
                </div>
            </aside>

            <main className={clsx(
                "flex-1 overflow-auto p-8 relative",
                theme === 'dark' ? "bg-gray-950" : "bg-gray-100"
            )}>
                <div className={clsx(
                    "absolute top-0 left-0 w-full h-96 pointer-events-none",
                    theme === 'dark' 
                        ? "bg-gradient-to-b from-blue-900/10 to-transparent" 
                        : "bg-gradient-to-b from-blue-100/50 to-transparent"
                )} />
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
