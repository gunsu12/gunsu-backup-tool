import React, { useEffect, useState } from 'react';
import { Activity, Database, CheckCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => {
    const colorClasses: any = {
        blue: 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20',
        rose: 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20',
    };

    return (
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all hover:bg-gray-900 group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl transition-colors ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
                {subtext && <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{subtext}</span>}
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalBackups: 0,
        activeConnections: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0,
        recentActivity: [] as any[]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [connections, history] = await Promise.all([
            window.api.connections.getAll(),
            window.api.history.getAll()
        ]);

        const successful = history.filter((h: any) => h.status === 'success').length;
        const failed = history.filter((h: any) => h.status === 'failed').length;
        const rate = history.length > 0 ? Math.round((successful / history.length) * 100) : 0;

        setStats({
            totalBackups: history.length,
            activeConnections: connections.length,
            successfulRuns: successful,
            failedRuns: failed,
            successRate: rate,
            recentActivity: history.slice(0, 5)
        });
    };

    return (
        <div className="relative z-10 max-w-7xl mx-auto p-8">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
                    <p className="text-gray-400">Overview of your database backup operations</p>
                </div>
                <Link
                    to="/schedules"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                >
                    Manage Schedules
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Backups" value={stats.totalBackups} icon={Activity} color="blue" />
                <StatCard title="Connections" value={stats.activeConnections} icon={Database} color="indigo" />
                <StatCard title="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle} color="emerald" />
                <StatCard title="Failed Runs" value={stats.failedRuns} icon={AlertCircle} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                        <Link to="/history" className="text-blue-400 text-sm hover:underline flex items-center gap-1">
                            View all <ChevronRight size={14} />
                        </Link>
                    </div>

                    {stats.recentActivity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <Activity size={48} className="mb-4 opacity-20" />
                            <p>No recent activity recorded</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stats.recentActivity.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800/50">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${item.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {item.status === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-md">
                                                {item.backupFile.split(/[\\/]/).pop()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800 px-2 py-1 rounded">
                                        {item.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                    <div className="space-y-3">
                        <Link to="/connections" className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800/50 hover:bg-gray-800/50 transition-colors text-gray-300">
                            <div className="flex items-center gap-3">
                                <Database size={18} />
                                <span>Connections</span>
                            </div>
                            <ChevronRight size={16} />
                        </Link>
                        <Link to="/schedules" className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800/50 hover:bg-gray-800/50 transition-colors text-gray-300">
                            <div className="flex items-center gap-3">
                                <Clock size={18} />
                                <span>Schedules</span>
                            </div>
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
