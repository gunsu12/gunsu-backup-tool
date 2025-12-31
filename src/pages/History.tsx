import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, FolderOpen, Trash2, Database, Search, RotateCcw, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import clsx from 'clsx';

const History = () => {
    const { theme } = useTheme();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Restore logic state
    const [connections, setConnections] = useState<any[]>([]);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [targetConnectionId, setTargetConnectionId] = useState('');
    const [targetDatabase, setTargetDatabase] = useState('');
    const [databases, setDatabases] = useState<string[]>([]);
    const [loadingDatabases, setLoadingDatabases] = useState(false);
    const [databaseError, setDatabaseError] = useState<string | null>(null);
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
        setTargetDatabase('');
        setDatabases([]);
        setDatabaseError(null);
        setRestoreResult(null);
        setShowRestoreModal(true);
    };

    const handleFetchDatabases = async (connectionId: string) => {
        if (!connectionId) {
            setDatabases([]);
            setDatabaseError(null);
            return;
        }
        
        setLoadingDatabases(true);
        setDatabaseError(null);
        setDatabases([]);
        
        try {
            const result = await window.api.connections.fetchDatabases(connectionId);
            if (result.success) {
                setDatabases(result.databases);
                if (result.databases.length === 0) {
                    setDatabaseError('No databases found on this server.');
                }
            } else {
                setDatabaseError(result.message || 'Failed to fetch databases.');
            }
        } catch (error) {
            setDatabaseError('Failed to fetch databases.');
        } finally {
            setLoadingDatabases(false);
        }
    };

    const handleConnectionChange = (connectionId: string) => {
        setTargetConnectionId(connectionId);
        setTargetDatabase('');
        setDatabases([]);
        setDatabaseError(null);
    };

    const handleConfirmRestore = async () => {
        if (!selectedHistoryItem || !targetConnectionId || !targetDatabase) return;

        const targetConnection = connections.find(c => c.id === targetConnectionId);
        if (!targetConnection) return;

        if (!confirm(`WARNING: This will OVERWRITE the database "${targetDatabase}" on "${targetConnection.host}".\n\nAre you sure you want to proceed?`)) {
            return;
        }

        setRestoring(true);
        setRestoreResult(null);

        try {
            const result = await window.api.restoreBackup(selectedHistoryItem.backupFile, targetConnection, targetDatabase);
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
                    <h2 className={clsx("text-3xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>Backup History</h2>
                    <p className={clsx(theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Track and manage your backup activities</p>
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
                <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-gray-500" : "text-gray-400")} size={20} />
                <input
                    type="text"
                    placeholder="Search history..."
                    className={clsx(
                        "w-full border rounded-xl py-3 pl-11 pr-4 outline-none focus:border-blue-500 transition-colors",
                        theme === 'dark' ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className={clsx("border rounded-2xl overflow-hidden", theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200")}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={clsx("text-xs font-bold uppercase tracking-wider", theme === 'dark' ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-500")}>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">File Name / Path</th>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={clsx("divide-y", theme === 'dark' ? "divide-gray-800" : "divide-gray-100")}>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className={clsx("px-6 py-12 text-center", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                        Loading history...
                                    </td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className={clsx("px-6 py-12 text-center", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                        <Database size={48} className="mx-auto mb-4 opacity-10" />
                                        <p>{searchTerm ? 'No matches found' : 'No backup history available'}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredHistory.map((item) => (
                                    <tr key={item.id} className={clsx("transition-colors group", theme === 'dark' ? "hover:bg-gray-800/30" : "hover:bg-gray-50")}>
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
                                                <p className={clsx("text-sm font-medium truncate mb-0.5", theme === 'dark' ? "text-white" : "text-gray-900")}>
                                                    {item.backupFile.split(/[\\/]/).pop()}
                                                </p>
                                                <p className={clsx("text-xs truncate", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
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
                                            <div className={clsx("flex items-center gap-2 text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                                                <Clock size={14} />
                                                {formatDate(item.timestamp)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenFolder(item.backupFile.substring(0, item.backupFile.lastIndexOf('\\')))}
                                                    className={clsx("p-2 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all", theme === 'dark' ? "text-gray-500" : "text-gray-400")}
                                                    title="Open backup folder"
                                                >
                                                    <FolderOpen size={18} />
                                                </button>
                                                {item.status === 'success' && (
                                                    <button
                                                        onClick={() => handleRestoreClick(item)}
                                                        className={clsx("p-2 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all", theme === 'dark' ? "text-gray-500" : "text-gray-400")}
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className={clsx(
                        "border rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto",
                        theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
                    )}>
                        <div className={clsx(
                            "flex justify-between items-center mb-6 pb-2 -mt-2 pt-2 -mx-6 px-6",
                            theme === 'dark' ? "bg-gray-900" : "bg-white"
                        )}>
                            <h3 className={clsx("text-xl font-bold flex items-center gap-2", theme === 'dark' ? "text-white" : "text-gray-900")}>
                                <RotateCcw size={20} className="text-orange-400" />
                                Restore Database
                            </h3>
                            <button
                                onClick={() => setShowRestoreModal(false)}
                                className={clsx(theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}
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
                                <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Source Backup</label>
                                <div className={clsx(
                                    "p-3 rounded-lg text-sm break-all border",
                                    theme === 'dark' ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-gray-50 text-gray-700 border-gray-200"
                                )}>
                                    {selectedHistoryItem?.backupFile.split(/[\\/]/).pop()}
                                </div>
                            </div>

                            <div>
                                <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Target Connection</label>
                                <div className="flex gap-2">
                                    <select
                                        className={clsx(
                                            "flex-1 rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors",
                                            theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                        )}
                                        value={targetConnectionId}
                                        onChange={(e) => handleConnectionChange(e.target.value)}
                                        disabled={restoring}
                                    >
                                        <option value="">Select a connection...</option>
                                        {compatibleConnections.map(conn => (
                                            <option key={conn.id} value={conn.id}>
                                                {conn.name} ({conn.host})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => handleFetchDatabases(targetConnectionId)}
                                        disabled={!targetConnectionId || loadingDatabases || restoring}
                                        className={clsx(
                                            "p-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
                                            theme === 'dark' ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                        title="Fetch Databases"
                                    >
                                        {loadingDatabases ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Database size={18} />
                                        )}
                                    </button>
                                </div>
                                {originalConnection ? (
                                    <p className={clsx("text-xs mt-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                        Showing compatible {originalConnection.type} connections.
                                    </p>
                                ) : (
                                    <p className="text-xs text-yellow-500/70 mt-1">
                                        Original connection not found. Please ensure you select a compatible database type.
                                    </p>
                                )}
                            </div>

                            {(databases.length > 0 || databaseError) && (
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Target Database</label>
                                    {databaseError ? (
                                        <p className="text-red-400 text-sm">{databaseError}</p>
                                    ) : (
                                        <select
                                            className={clsx(
                                                "w-full rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors",
                                                theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                            )}
                                            value={targetDatabase}
                                            onChange={(e) => setTargetDatabase(e.target.value)}
                                            disabled={restoring}
                                        >
                                            <option value="">Select database...</option>
                                            {databases.map(db => (
                                                <option key={db} value={db}>{db}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
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

                        <div className={clsx("pt-6 flex justify-end gap-3 border-t mt-6", theme === 'dark' ? "border-gray-800" : "border-gray-200")}>
                            <button
                                onClick={() => setShowRestoreModal(false)}
                                className={clsx("px-4 py-2 transition-colors", theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}
                                disabled={restoring}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRestore}
                                disabled={!targetConnectionId || !targetDatabase || restoring}
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
