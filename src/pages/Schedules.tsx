import React, { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, Edit2, Calendar, FolderOpen, Power, PowerOff, Play, Loader2 } from 'lucide-react';
import { BackupSchedule, DatabaseConnection } from '../types';

const Schedules = () => {
    const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
    const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
    const [formData, setFormData] = useState({
        connectionId: '',
        name: '',
        frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'multiple-daily',
        time: '00:00',
        times: ['00:00', '12:00'] as string[],
        dayOfWeek: 0,
        dayOfMonth: 1,
        backupPath: '',
        enabled: true,
        retentionDays: 7
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
            name: schedule.name,
            frequency: schedule.frequency,
            time: schedule.time,
            times: schedule.times || ['00:00', '12:00'],
            dayOfWeek: schedule.dayOfWeek || 0,
            dayOfMonth: schedule.dayOfMonth || 1,
            backupPath: schedule.backupPath,
            enabled: schedule.enabled,
            retentionDays: schedule.retentionDays || 0
        });
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

            // Clean up fields base on frequency
            if (formData.frequency === 'multiple-daily') {
                delete scheduleData.time;
            } else {
                delete scheduleData.times;
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
        setFormData({
            connectionId: '',
            name: '',
            frequency: 'daily',
            time: '00:00',
            times: ['00:00', '12:00'],
            dayOfWeek: 0,
            dayOfMonth: 1,
            backupPath: '',
            enabled: true,
            retentionDays: 7
        });
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
        if (schedule.frequency === 'daily') return `Daily at ${schedule.time}`;
        if (schedule.frequency === 'multiple-daily') return `Daily at ${schedule.times?.join(', ')}`;
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
                    <h2 className="text-3xl font-bold text-white mb-2">Backup Schedules</h2>
                    <p className="text-gray-400">Automate your database backups</p>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
                            </h3>
                            <button onClick={handleCloseForm} className="text-gray-400 hover:text-white">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Schedule Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Daily Backup"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Database Connection</label>
                                <select
                                    required
                                    className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                    value={formData.connectionId}
                                    onChange={e => setFormData({ ...formData, connectionId: e.target.value })}
                                >
                                    <option value="">Select connection...</option>
                                    {connections.map(conn => (
                                        <option key={conn.id} value={conn.id}>{conn.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Frequency</label>
                                    <select
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="multiple-daily">Multiple Times Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                {formData.frequency !== 'multiple-daily' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Time</label>
                                        <input
                                            type="time"
                                            required
                                            className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                            {formData.frequency === 'multiple-daily' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Backup Times</label>
                                    {formData.times.map((time, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="time"
                                                required
                                                className="flex-1 bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                                value={time}
                                                onChange={e => {
                                                    const newTimes = [...formData.times];
                                                    newTimes[index] = e.target.value;
                                                    setFormData({ ...formData, times: newTimes });
                                                }}
                                            />
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
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, times: [...formData.times, '00:00'] })}
                                        className="w-full py-2 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center gap-2 mt-2"
                                    >
                                        <Plus size={16} />
                                        Add Another Time
                                    </button>
                                </div>
                            )}
                            {formData.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Day of Week</label>
                                    <select
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
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
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Day of Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.dayOfMonth}
                                        onChange={e => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Backup Path</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            className="flex-1 bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                            value={formData.backupPath}
                                            onChange={e => setFormData({ ...formData, backupPath: e.target.value })}
                                            placeholder="C:\Backups"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleBrowseFolder}
                                            className="p-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                                            title="Browse Folder"
                                        >
                                            <FolderOpen size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Retention (Days)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full bg-gray-800 border-gray-700 rounded-lg p-2.5 text-white outline-none"
                                        value={formData.retentionDays}
                                        onChange={e => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                                        placeholder="0 = Forever"
                                    />
                                </div>
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
                    <div className="col-span-full bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No schedules configured</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                        >
                            Create your first schedule
                        </button>
                    </div>
                ) : (
                    schedules.map(schedule => (
                        <div key={schedule.id} className={`bg-gray-900 border rounded-xl p-6 transition-colors group ${schedule.enabled ? 'border-gray-800 hover:border-blue-500/50' : 'border-gray-800/50 opacity-60'
                            }`}>
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
                                        className="text-gray-500 hover:text-blue-400"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(schedule.id)}
                                        className="text-gray-500 hover:text-red-400"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{schedule.name}</h3>
                            <div className="space-y-2 text-sm text-gray-400">
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
                                <div className="text-xs text-gray-500 mt-2">
                                    Connection: {getConnectionName(schedule.connectionId)}
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
