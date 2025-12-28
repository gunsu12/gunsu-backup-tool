import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, FolderOpen, Trash2, Database, Search, RotateCcw, X, AlertTriangle, Loader2 } from 'lucide-react';

const History = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Restore logic state
    const [connections, setConnections] = useState<any[]>([]);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [targetConnectionId, setTargetConnectionId] = useState('');
    const [restoring, setRestoring] = useState(false);
    const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        loadHistory();
        loadConnections();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const result = await window.api.history.getAll();
        setHistory(result);
        setLoading(false);
    };

    const loadConnections = async () => {
        const result = await window.api.connections.getAll();
        setConnections(result);
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

    const handleRestoreClick = (item: any) => {
        setSelectedHistoryItem(item);
        // Try to pre-select the original connection if it still exists
        const originalExists = connections.find(c => c.id === item.connectionId);
        if (originalExists) {
            setTargetConnectionId(item.connectionId);
        } else {
            setTargetConnectionId('');
        }
        setRestoreResult(null);
        setShowRestoreModal(true);
    };

    const handleConfirmRestore = async () => {
        if (!selectedHistoryItem || !targetConnectionId) return;

        const targetConnection = connections.find(c => c.id === targetConnectionId);
        if (!targetConnection) return;

        if (!confirm(`WARNING: This will OVERWRITE the database "${targetConnection.database}" on "${targetConnection.host}".\n\nAre you sure you want to proceed?`)) {
            return;
        }

        setRestoring(true);
        setRestoreResult(null);

        try {
            const result = await window.api.restoreBackup(selectedHistoryItem.backupFile, targetConnection);
            if (result.success) {
                setRestoreResult({ success: true, message: 'Restore completed successfully!' });
                setTimeout(() => {
                    setShowRestoreModal(false);
                    setRestoreResult(null);
                }, 2000);
            } else {
                setRestoreResult({ success: false, message: result.error || 'Restore failed' });
            }
        } catch (error: any) {
            setRestoreResult({ success: false, message: error.message || 'Restore failed' });
        } finally {
            setRestoring(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const filteredHistory = history.filter(item =>
        item.backupFile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter compatible connections for restore
    // We try to determine the type from the original connection ID in history
    const originalConnection = selectedHistoryItem ? connections.find(c => c.id === selectedHistoryItem.connectionId) : null;
    const compatibleConnections = originalConnection
        ? connections.filter(c => c.type === originalConnection.type)
        : connections; // If we can't determine type, show all (user must be careful)

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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenFolder(item.backupFile.substring(0, item.backupFile.lastIndexOf('\\')))}
                                                    className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                                    title="Open backup folder"
                                                >
                                                    <FolderOpen size={18} />
                                                </button>
                                                {item.status === 'success' && (
                                                    <button
                                                        onClick={() => handleRestoreClick(item)}
                                                        className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all"
                                                        title="Restore this backup"
                                                    >
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Restore Modal */}
            {showRestoreModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <RotateCcw size={20} className="text-orange-400" />
                                Restore Database
                            </h3>
                            <button
                                onClick={() => setShowRestoreModal(false)}
                                className="text-gray-400 hover:text-white"
                                disabled={restoring}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                            <div className="flex gap-3">
                                <AlertTriangle className="text-orange-400 flex-shrink-0" size={24} />
                                <div>
                                    <h4 className="text-orange-400 font-bold text-sm mb-1">Warning: Data Overwrite</h4>
                                    <p className="text-orange-300/80 text-xs">
                                        Restoring will completely overwrite the target database. All current data in the target database will be LOST.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Source Backup</label>
                                <div className="p-3 bg-gray-800 rounded-lg text-sm text-gray-300 break-all border border-gray-700">
                                    {selectedHistoryItem?.backupFile.split(/[\\/]/).pop()}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Target Connection</label>
                                <select
                                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 transition-colors"
                                    value={targetConnectionId}
                                    onChange={(e) => setTargetConnectionId(e.target.value)}
                                    disabled={restoring}
                                >
                                    <option value="">Select a connection...</option>
                                    {compatibleConnections.map(conn => (
                                        <option key={conn.id} value={conn.id}>
                                            {conn.name} ({conn.host} - {conn.database})
                                        </option>
                                    ))}
                                </select>
                                {originalConnection ? (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Showing compatible {originalConnection.type} connections.
                                    </p>
                                ) : (
                                    <p className="text-xs text-yellow-500/70 mt-1">
                                        Original connection not found. Please ensure you select a compatible database type.
                                    </p>
                                )}
                            </div>
                        </div>

                        {restoreResult && (
                            <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${restoreResult.success
                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                }`}>
                                {restoreResult.success ? (
                                    <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-sm">{restoreResult.message}</span>
                            </div>
                        )}

                        <div className="pt-6 flex justify-end gap-3 border-t border-gray-800 mt-6">
                            <button
                                onClick={() => setShowRestoreModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                disabled={restoring}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRestore}
                                disabled={!targetConnectionId || restoring}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                            >
                                {restoring ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw size={18} />
                                        Restore Data
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
