import React, { useEffect, useState } from 'react';
import { Database, Plus, Trash2, Server, Save, X, CheckCircle2, XCircle, Loader2, Edit2 } from 'lucide-react';
import { DatabaseConnection } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import clsx from 'clsx';

const Connections = () => {
    const { theme } = useTheme();
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '',
        binPath: ''
    });

    useEffect(() => {
        loadConnections();
    }, []);

    const loadConnections = async () => {
        const result = await window.api.connections.getAll();
        setConnections(result);
    };

    const handleEdit = (connection: DatabaseConnection) => {
        setEditingConnection(connection);
        setFormData({
            name: connection.name,
            type: connection.type,
            host: connection.host,
            port: connection.port,
            username: connection.username,
            password: connection.password || '',
            binPath: connection.binPath || ''
        });
        setTestResult(null);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this connection?')) {
            await window.api.connections.delete(id);
            loadConnections();
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await window.api.connections.test(formData as any);
            setTestResult(result);
        } catch (error) {
            setTestResult({ success: false, message: 'Failed to test connection.' });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!testResult?.success) {
            alert('Please test the connection successfully before saving.');
            return;
        }

        try {
            if (editingConnection) {
                // Update existing connection
                await window.api.connections.update({
                    ...formData,
                    id: editingConnection.id,
                    createdAt: editingConnection.createdAt
                } as DatabaseConnection);
            } else {
                // Add new connection
                await window.api.connections.add(formData as any);
            }
            setShowForm(false);
            setEditingConnection(null);
            setFormData({
                name: '',
                type: 'mysql',
                host: 'localhost',
                port: 3306,
                username: 'root',
                password: '',
                binPath: ''
            });
            setTestResult(null);
            loadConnections();
        } catch (error) {
            console.error('Failed to save connection:', error);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingConnection(null);
        setTestResult(null);
        setFormData({
            name: '',
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            username: 'root',
            password: '',
            binPath: ''
        });
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className={clsx("text-3xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>Connections</h2>
                    <p className={clsx(theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Manage your database connections</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                    <Plus size={20} />
                    Add Connection
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className={clsx(
                        "border rounded-2xl p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto",
                        theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
                    )}>
                        <div className={clsx(
                            "flex justify-between items-center mb-6 pb-2 -mt-2 pt-2 -mx-6 px-6",
                            theme === 'dark' ? "bg-gray-900" : "bg-white"
                        )}>
                            <h3 className={clsx("text-xl font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                                {editingConnection ? 'Edit Connection' : 'New Connection'}
                            </h3>
                            <button onClick={handleCloseForm} className={clsx(theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Name</label>
                                <input
                                    type="text"
                                    required
                                    className={clsx(
                                        "w-full rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none",
                                        theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                    )}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Production DB"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Type</label>
                                    <select
                                        className={clsx(
                                            "w-full rounded-lg p-2.5 outline-none",
                                            theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                        )}
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="mysql">MySQL</option>
                                        <option value="postgres">PostgreSQL</option>
                                        <option value="mongodb">MongoDB</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Host</label>
                                    <input
                                        type="text"
                                        required
                                        className={clsx(
                                            "w-full rounded-lg p-2.5 outline-none",
                                            theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                        )}
                                        value={formData.host}
                                        onChange={e => setFormData({ ...formData, host: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Port</label>
                                <input
                                    type="number"
                                    required
                                    className={clsx(
                                        "w-full rounded-lg p-2.5 outline-none",
                                        theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                    )}
                                    value={formData.port}
                                    onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Username</label>
                                    <input
                                        type="text"
                                        required
                                        className={clsx(
                                            "w-full rounded-lg p-2.5 outline-none",
                                            theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                        )}
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Password</label>
                                    <input
                                        type="password"
                                        className={clsx(
                                            "w-full rounded-lg p-2.5 outline-none",
                                            theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                        )}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Binary Tools Path (Optional)</label>
                                <input
                                    type="text"
                                    className={clsx(
                                        "w-full rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none",
                                        theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                    )}
                                    value={formData.binPath}
                                    onChange={e => setFormData({ ...formData, binPath: e.target.value })}
                                    placeholder="e.g. C:\Program Files\PostgreSQL\16\bin"
                                />
                                <p className={clsx("text-xs mt-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>Path to the folder containing pg_dump or mysqldump.</p>
                            </div>

                            {/* Test Connection Section */}
                            <div className={clsx("pt-4 border-t", theme === 'dark' ? "border-gray-800" : "border-gray-200")}>
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing}
                                    className={clsx(
                                        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                        theme === 'dark' ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                    )}
                                >
                                    {testing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Testing Connection...
                                        </>
                                    ) : (
                                        <>
                                            <Database size={18} />
                                            Test Connection
                                        </>
                                    )}
                                </button>

                                {testResult && (
                                    <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${testResult.success
                                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                        }`}>
                                        {testResult.success ? (
                                            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                                        )}
                                        <span className="text-sm">{testResult.message}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className={clsx("px-4 py-2 transition-colors", theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                                >
                                    <Save size={18} />
                                    Save Connection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connections.length === 0 ? (
                    <div className={clsx(
                        "col-span-full border rounded-2xl p-12 text-center",
                        theme === 'dark' ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"
                    )}>
                        <Database className={clsx("w-16 h-16 mx-auto mb-4", theme === 'dark' ? "text-gray-700" : "text-gray-300")} />
                        <p className={clsx("mb-4", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>No connections configured</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                        >
                            Create your first connection
                        </button>
                    </div>
                ) : (
                    connections.map(conn => (
                        <div key={conn.id} className={clsx(
                            "border rounded-xl p-6 hover:border-blue-500/50 transition-colors group",
                            theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
                        )}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Database size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => handleEdit(conn)}
                                        className={clsx(theme === 'dark' ? "text-gray-500 hover:text-blue-400" : "text-gray-400 hover:text-blue-500")}
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(conn.id)}
                                        className={clsx(theme === 'dark' ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500")}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <h3 className={clsx("text-lg font-bold mb-1", theme === 'dark' ? "text-white" : "text-gray-900")}>{conn.name}</h3>
                            <div className={clsx("space-y-2 text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                                <div className="flex items-center gap-2">
                                    <Server size={14} />
                                    <span>{conn.host}:{conn.port}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={clsx(
                                        "uppercase text-xs font-bold px-2 py-0.5 rounded",
                                        theme === 'dark' ? "bg-gray-800" : "bg-gray-100"
                                    )}>{conn.type}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default Connections;
