import React, { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, Edit2, Calendar, FolderOpen, Power, PowerOff, Play, Loader2, Database } from 'lucide-react';
import { BackupSchedule, DatabaseConnection } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import clsx from 'clsx';

const Schedules = () => {
    const { theme } = useTheme();
    const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
    const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
    const [databases, setDatabases] = useState<string[]>([]);
    const [loadingDatabases, setLoadingDatabases] = useState(false);
    const [databaseError, setDatabaseError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        connectionId: '',
        database: '',
        name: '',
        frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
        time: '00:00',
        times: ['00:00'] as string[],
        dayOfWeek: 0,
        dayOfMonth: 1,
        backupPath: '',
        enabled: true,
        retentionDays: 7,
        compress: true
    });

    useEffect(() => {
        loadSchedules();
        loadConnections();
    }, []);

    const loadSchedules = async () => {
        const result = await window.api.schedules.getAll();
        setSchedules(result);
    };

    const loadConnections = async () => {
        const result = await window.api.connections.getAll();
        setConnections(result);
    };

    const getConnectionName = (connectionId: string) => {
        const conn = connections.find(c => c.id === connectionId);
        return conn?.name || 'Unknown';
    };

    const handleEdit = (schedule: BackupSchedule) => {
        setEditingSchedule(schedule);
        setFormData({
            connectionId: schedule.connectionId,
            database: schedule.database || '',
            name: schedule.name,
            frequency: schedule.frequency === 'multiple-daily' ? 'daily' : schedule.frequency, // Handle legacy data
            time: schedule.time,
            times: schedule.times || (schedule.time ? [schedule.time] : ['00:00']),
            dayOfWeek: schedule.dayOfWeek || 0,
            dayOfMonth: schedule.dayOfMonth || 1,
            backupPath: schedule.backupPath,
            enabled: schedule.enabled,
            retentionDays: schedule.retentionDays || 0,
            compress: schedule.compress || false
        });
        // Fetch databases for the selected connection
        if (schedule.connectionId) {
            handleFetchDatabases(schedule.connectionId);
        }
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this schedule?')) {
            await window.api.schedules.delete(id);
            loadSchedules();
        }
    };

    const handleToggleEnabled = async (schedule: BackupSchedule) => {
        await window.api.schedules.update({
            ...schedule,
            enabled: !schedule.enabled
        });
        loadSchedules();
    };

    const handleRunNow = async (schedule: BackupSchedule) => {
        if (runningIds.has(schedule.id)) return;

        setRunningIds(prev => new Set(prev).add(schedule.id));
        try {
            const result = await window.api.schedules.run(schedule);
            if (!result.success) {
                alert(`Backup failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Manual backup error:', error);
            alert('An unexpected error occurred during manual backup.');
        } finally {
            setRunningIds(prev => {
                const next = new Set(prev);
                next.delete(schedule.id);
                return next;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const scheduleData: any = {
                ...formData
            };

            // Clean up fields based on frequency
            if (formData.frequency === 'daily') {
                delete scheduleData.time; // Daily uses times array
            } else {
                delete scheduleData.times; // Weekly/monthly use single time
            }

            if (formData.frequency !== 'weekly') delete scheduleData.dayOfWeek;
            if (formData.frequency !== 'monthly') delete scheduleData.dayOfMonth;

            if (editingSchedule) {
                await window.api.schedules.update({
                    ...scheduleData,
                    id: editingSchedule.id,
                    createdAt: editingSchedule.createdAt
                } as BackupSchedule);
            } else {
                await window.api.schedules.add(scheduleData);
            }
            handleCloseForm();
            loadSchedules();
        } catch (error) {
            console.error('Failed to save schedule:', error);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingSchedule(null);
        setDatabases([]);
        setDatabaseError(null);
        setFormData({
            connectionId: '',
            database: '',
            name: '',
            frequency: 'daily',
            time: '00:00',
            times: ['00:00'],
            dayOfWeek: 0,
            dayOfMonth: 1,
            backupPath: '',
            enabled: true,
            retentionDays: 7,
            compress: true
        });
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
        setFormData({ ...formData, connectionId, database: '' });
        setDatabases([]);
        setDatabaseError(null);
    };

    const handleBrowseFolder = async () => {
        const folder = await window.api.selectFolder();
        if (folder) {
            setFormData({ ...formData, backupPath: folder });
        }
    };

    const handleOpenFolder = async (path: string) => {
        await window.api.openFolder(path);
    };

    const getFrequencyText = (schedule: BackupSchedule) => {
        if (schedule.frequency === 'daily') {
            const times = schedule.times || [schedule.time];
            return `Daily at ${times.join(', ')}`;
        }
        if (schedule.frequency === 'weekly') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`;
        }
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
    };

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className={clsx("text-3xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-gray-900")}>Backup Schedules</h2>
                    <p className={clsx(theme === 'dark' ? "text-gray-400" : "text-gray-500")}>Automate your database backups</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                    <Plus size={20} />
                    Add Schedule
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className={clsx(
                        "border rounded-2xl p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto",
                        theme === 'dark' ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
                    )}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={clsx("text-xl font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
                            </h3>
                            <button onClick={handleCloseForm} className={clsx(theme === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}>
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column - Backup Settings */}
                                <div className="space-y-4">
                                    <h4 className={clsx("text-sm font-bold uppercase tracking-wider pb-2 border-b", theme === 'dark' ? "text-blue-400 border-gray-800" : "text-blue-600 border-gray-200")}>Backup Settings</h4>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Schedule Name</label>
                                        <input
                                            type="text"
                                            required
                                            className={clsx(
                                                "w-full rounded-lg p-2.5 outline-none",
                                                theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                            )}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Daily Backup"
                                        />
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Database Connection</label>
                                        <div className="flex gap-2">
                                            <select
                                                required
                                                className={clsx(
                                                    "flex-1 rounded-lg p-2.5 outline-none",
                                                    theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                )}
                                                value={formData.connectionId}
                                                onChange={e => handleConnectionChange(e.target.value)}
                                            >
                                                <option value="">Select connection...</option>
                                                {connections.map(conn => (
                                                    <option key={conn.id} value={conn.id}>{conn.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => handleFetchDatabases(formData.connectionId)}
                                                disabled={!formData.connectionId || loadingDatabases}
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
                                    </div>
                                    {(databases.length > 0 || databaseError) && (
                                        <div>
                                            <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Database</label>
                                            {databaseError ? (
                                                <p className="text-red-400 text-sm">{databaseError}</p>
                                            ) : (
                                                <select
                                                    required
                                                    className={clsx(
                                                        "w-full rounded-lg p-2.5 outline-none",
                                                        theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                    )}
                                                    value={formData.database}
                                                    onChange={e => setFormData({ ...formData, database: e.target.value })}
                                                >
                                                    <option value="">Select database...</option>
                                                    {databases.map(db => (
                                                        <option key={db} value={db}>{db}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Backup Path</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                required
                                                className={clsx(
                                                    "flex-1 rounded-lg p-2.5 outline-none",
                                                    theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                )}
                                                value={formData.backupPath}
                                                onChange={e => setFormData({ ...formData, backupPath: e.target.value })}
                                                placeholder="C:\Backups"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleBrowseFolder}
                                                className={clsx(
                                                    "p-2.5 rounded-lg transition-colors flex items-center justify-center",
                                                    theme === 'dark' ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                )}
                                                title="Browse Folder"
                                            >
                                                <FolderOpen size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Retention (Days)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            className={clsx(
                                                "w-full rounded-lg p-2.5 outline-none",
                                                theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                            )}
                                            value={formData.retentionDays}
                                            onChange={e => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                                            placeholder="0 = Forever"
                                        />
                                        <p className={clsx("text-xs mt-1", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>0 = Keep forever</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="compress"
                                            className="w-4 h-4 bg-gray-800 border-gray-700 rounded text-blue-600 outline-none"
                                            checked={formData.compress}
                                            onChange={e => setFormData({ ...formData, compress: e.target.checked })}
                                        />
                                        <label htmlFor="compress" className={clsx("text-sm font-medium cursor-pointer select-none", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                                            Compress Backup (ZIP)
                                        </label>
                                    </div>
                                </div>

                                {/* Right Column - Frequency Settings */}
                                <div className="space-y-4">
                                    <h4 className={clsx("text-sm font-bold uppercase tracking-wider pb-2 border-b", theme === 'dark' ? "text-green-400 border-gray-800" : "text-green-600 border-gray-200")}>Frequency Settings</h4>
                                    <div>
                                        <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Frequency</label>
                                        <select
                                            className={clsx(
                                                "w-full rounded-lg p-2.5 outline-none",
                                                theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                            )}
                                            value={formData.frequency}
                                            onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>
                                    {formData.frequency === 'weekly' && (
                                        <div>
                                            <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Day of Week</label>
                                            <select
                                                className={clsx(
                                                    "w-full rounded-lg p-2.5 outline-none",
                                                    theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                )}
                                                value={formData.dayOfWeek}
                                                onChange={e => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                                            >
                                                <option value="0">Sunday</option>
                                                <option value="1">Monday</option>
                                                <option value="2">Tuesday</option>
                                                <option value="3">Wednesday</option>
                                                <option value="4">Thursday</option>
                                                <option value="5">Friday</option>
                                                <option value="6">Saturday</option>
                                            </select>
                                        </div>
                                    )}
                                    {formData.frequency === 'monthly' && (
                                        <div>
                                            <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Day of Month</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="31"
                                                required
                                                className={clsx(
                                                    "w-full rounded-lg p-2.5 outline-none",
                                                    theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                )}
                                                value={formData.dayOfMonth}
                                                onChange={e => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    )}
                                    {formData.frequency !== 'daily' && (
                                        <div>
                                            <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Time</label>
                                            <input
                                                type="time"
                                                required
                                                className={clsx(
                                                    "w-full rounded-lg p-2.5 outline-none",
                                                    theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                )}
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            />
                                        </div>
                                    )}
                                    {formData.frequency === 'daily' && (
                                        <div className="space-y-2">
                                            <label className={clsx("block text-sm font-medium mb-1", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>Backup Times</label>
                                            {formData.times.map((time, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="time"
                                                        required
                                                        className={clsx(
                                                            "flex-1 rounded-lg p-2.5 outline-none",
                                                            theme === 'dark' ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900 border"
                                                        )}
                                                        value={time}
                                                        onChange={e => {
                                                            const newTimes = [...formData.times];
                                                            newTimes[index] = e.target.value;
                                                            setFormData({ ...formData, times: newTimes });
                                                        }}
                                                    />
                                                    {formData.times.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTimes = formData.times.filter((_, i) => i !== index);
                                                                setFormData({ ...formData, times: newTimes });
                                                            }}
                                                            className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, times: [...formData.times, '00:00'] })}
                                                className={clsx(
                                                    "w-full py-2 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2 mt-2",
                                                    theme === 'dark' ? "border-gray-700 text-gray-400 hover:text-white hover:border-gray-500" : "border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400"
                                                )}
                                            >
                                                <Plus size={16} />
                                                Add Another Time
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className={clsx("pt-6 mt-6 border-t flex justify-end gap-3", theme === 'dark' ? "border-gray-800" : "border-gray-200")}>
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
                                    <Clock size={18} />
                                    Save Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules.length === 0 ? (
                    <div className={clsx(
                        "col-span-full border rounded-2xl p-12 text-center",
                        theme === 'dark' ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"
                    )}>
                        <Calendar className={clsx("w-16 h-16 mx-auto mb-4", theme === 'dark' ? "text-gray-700" : "text-gray-300")} />
                        <p className={clsx("mb-4", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>No schedules configured</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                        >
                            Create your first schedule
                        </button>
                    </div>
                ) : (
                    schedules.map(schedule => (
                        <div key={schedule.id} className={clsx(
                            "border rounded-xl p-6 transition-colors group",
                            schedule.enabled 
                                ? theme === 'dark' 
                                    ? 'bg-gray-900 border-gray-800 hover:border-blue-500/50' 
                                    : 'bg-white border-gray-200 hover:border-blue-400'
                                : theme === 'dark'
                                    ? 'bg-gray-900 border-gray-800/50 opacity-60'
                                    : 'bg-gray-50 border-gray-200/50 opacity-60'
                        )}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${schedule.enabled ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'}`}>
                                    <Clock size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => handleToggleEnabled(schedule)}
                                        className={`${schedule.enabled ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-500 hover:text-green-400'}`}
                                        title={schedule.enabled ? 'Disable Schedule' : 'Enable Schedule'}
                                    >
                                        {schedule.enabled ? <PowerOff size={20} /> : <Power size={20} />}
                                    </button>
                                    <button
                                        onClick={() => handleRunNow(schedule)}
                                        disabled={runningIds.has(schedule.id)}
                                        className="text-gray-500 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Run Backup Now"
                                    >
                                        {runningIds.has(schedule.id) ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <Play size={20} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(schedule)}
                                        className={clsx(theme === 'dark' ? "text-gray-500 hover:text-blue-400" : "text-gray-400 hover:text-blue-500")}
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(schedule.id)}
                                        className={clsx(theme === 'dark' ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500")}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <h3 className={clsx("text-lg font-bold mb-1", theme === 'dark' ? "text-white" : "text-gray-900")}>{schedule.name}</h3>
                            <div className={clsx("space-y-2 text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    <span>{getFrequencyText(schedule)}</span>
                                </div>
                                <button
                                    onClick={() => handleOpenFolder(schedule.backupPath)}
                                    className="flex items-center gap-2 hover:text-blue-400 transition-colors cursor-pointer text-left"
                                >
                                    <FolderOpen size={14} />
                                    <span className="truncate">{schedule.backupPath}</span>
                                </button>
                                <div className={clsx("text-xs mt-2 flex justify-between items-center", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                                    <span>Connection: {getConnectionName(schedule.connectionId)}</span>
                                    {schedule.compress && (
                                        <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">ZIP</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Schedules;
