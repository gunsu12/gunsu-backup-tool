import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, FolderOpen, Trash2, Database, Search } from 'lucide-react';

const History = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const result = await window.api.history.getAll();
        setHistory(result);
        setLoading(false);
    };

    const handleClearHistory = async () => {
        if (confirm('Are you sure you want to clear all backup history? This will not delete the actual backup files.')) {
            await window.api.history.clear();
            loadHistory();
        }
    };

    const handleOpenFolder = async (path: string) => {
        if (path) {
            await window.api.openFolder(path);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const filteredHistory = history.filter(item =>
        item.backupFile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Backup History</h2>
                    <p className="text-gray-400">Track and manage your backup activities</p>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/20"
                    >
                        <Trash2 size={18} />
                        Clear All Logs
                    </button>
                )}
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                    type="text"
                    placeholder="Search history..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800/50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">File Name / Path</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        Loading history...
                                    </td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <Database size={48} className="mx-auto mb-4 opacity-10" />
                                        <p>{searchTerm ? 'No matches found' : 'No backup history available'}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            {item.status === 'success' ? (
                                                <div className="flex items-center gap-2 text-green-400">
                                                    <CheckCircle2 size={18} />
                                                    <span className="text-sm font-medium">Success</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-red-400">
                                                    <XCircle size={18} />
                                                    <span className="text-sm font-medium">Failed</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-md">
                                                <p className="text-white text-sm font-medium truncate mb-0.5">
                                                    {item.backupFile.split(/[\\/]/).pop()}
                                                </p>
                                                <p className="text-gray-500 text-xs truncate">
                                                    {item.backupFile}
                                                </p>
                                                {item.error && (
                                                    <p className="text-red-400 text-xs mt-1 bg-red-400/5 p-2 rounded border border-red-400/10">
                                                        {item.error}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                <Clock size={14} />
                                                {formatDate(item.timestamp)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleOpenFolder(item.backupFile.substring(0, item.backupFile.lastIndexOf('\\')))}
                                                className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                                title="Open backup folder"
                                            >
                                                <FolderOpen size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default History;
