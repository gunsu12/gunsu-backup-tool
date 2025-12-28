import React, { useEffect, useState } from 'react';
import { Database, Plus, Trash2, Server, Save, X, CheckCircle2, XCircle, Loader2, Edit2 } from 'lucide-react';
import { DatabaseConnection } from '../types';

const Connections = () => {
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
        database: '',
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
            database: connection.database,
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
                database: '',
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
            database: '',
            binPath: ''
        });
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Connections</h2>
                    <p className="text-gray-400">Manage your database connections</p>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingConnection ? 'Edit Connection' : 'New Connection'}
                            </h3>
                            <button onClick={handleCloseForm} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Production DB"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                                    <select
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="mysql">MySQL</option>
                                        <option value="postgres">PostgreSQL</option>
                                        <option value="mongodb">MongoDB</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Host</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.host}
                                        onChange={e => setFormData({ ...formData, host: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Port</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.port}
                                        onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Database</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.database}
                                        onChange={e => setFormData({ ...formData, database: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                    <input
                                        type="password"
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Binary Tools Path (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={formData.binPath}
                                    onChange={e => setFormData({ ...formData, binPath: e.target.value })}
                                    placeholder="e.g. C:\Program Files\PostgreSQL\16\bin"
                                />
                                <p className="text-xs text-gray-500 mt-1">Path to the folder containing pg_dump or mysqldump.</p>
                            </div>

                            {/* Test Connection Section */}
                            <div className="pt-4 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
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
                    <div className="col-span-full bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
                        <Database className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No connections configured</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                        >
                            Create your first connection
                        </button>
                    </div>
                ) : (
                    connections.map(conn => (
                        <div key={conn.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Database size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => handleEdit(conn)}
                                        className="text-gray-500 hover:text-blue-400"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(conn.id)}
                                        className="text-gray-500 hover:text-red-400"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{conn.name}</h3>
                            <div className="space-y-2 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Server size={14} />
                                    <span>{conn.host}:{conn.port}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="uppercase text-xs font-bold bg-gray-800 px-2 py-0.5 rounded">{conn.type}</span>
                                    <span>{conn.database}</span>
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
