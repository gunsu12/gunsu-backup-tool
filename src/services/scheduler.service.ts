import schedule from 'node-schedule';
import { BackupSchedule } from '../types';
import store from './store.service';
import { performBackup, cleanupOldBackups } from './backup.service';

const activeJobs = new Map<string, schedule.Job[]>();

export const initializeScheduler = () => {
    console.log('Initializing backup scheduler...');
    const schedules = store.get('schedules') as BackupSchedule[];

    schedules.forEach(scheduleItem => {
        if (scheduleItem.enabled) {
            registerSchedule(scheduleItem);
        }
    });

    console.log(`Initialized ${activeJobs.size} active schedules`);

    // Run cleanup check daily at midnight
    schedule.scheduleJob('0 0 * * *', () => {
        console.log('Running daily backup cleanup...');
        schedules.forEach(scheduleItem => {
            if (scheduleItem.retentionDays > 0) {
                cleanupOldBackups(scheduleItem);
            }
        });
    });
};

export const registerSchedule = (scheduleItem: BackupSchedule) => {
    // Cancel existing jobs if any
    cancelSchedule(scheduleItem.id);

    const jobs: schedule.Job[] = [];

    if (scheduleItem.frequency === 'multiple-daily' && scheduleItem.times) {
        // Register multiple jobs for each time
        scheduleItem.times.forEach((time, index) => {
            const cronExpression = buildCronExpression({ ...scheduleItem, time });
            console.log(`Registering schedule "${scheduleItem.name}" [${index + 1}/${scheduleItem.times!.length}] with cron: ${cronExpression}`);

            const job = schedule.scheduleJob(cronExpression, async () => {
                console.log(`[${new Date().toISOString()}] Executing scheduled backup: ${scheduleItem.name} (${time})`);
                try {
                    await performBackup(scheduleItem);

                    // Run cleanup after backup if retention is set
                    if (scheduleItem.retentionDays > 0) {
                        await cleanupOldBackups(scheduleItem);
                    }
                } catch (error) {
                    console.error(`Backup failed for "${scheduleItem.name}":`, error);
                }
            });

            if (job) {
                jobs.push(job);
            }
        });

        if (jobs.length > 0) {
            activeJobs.set(scheduleItem.id, jobs);
            console.log(`Schedule "${scheduleItem.name}" registered with ${jobs.length} daily runs. Next run: ${jobs[0].nextInvocation()}`);
        }
    } else {
        // Single job registration
        const cronExpression = buildCronExpression(scheduleItem);
        console.log(`Registering schedule "${scheduleItem.name}" with cron: ${cronExpression}`);

        const job = schedule.scheduleJob(cronExpression, async () => {
            console.log(`[${new Date().toISOString()}] Executing scheduled backup: ${scheduleItem.name}`);
            try {
                await performBackup(scheduleItem);

                // Run cleanup after backup if retention is set
                if (scheduleItem.retentionDays > 0) {
                    await cleanupOldBackups(scheduleItem);
                }
            } catch (error) {
                console.error(`Backup failed for "${scheduleItem.name}":`, error);
            }
        });

        if (job) {
            activeJobs.set(scheduleItem.id, [job]);
            console.log(`Schedule "${scheduleItem.name}" registered successfully. Next run: ${job.nextInvocation()}`);
        }
    }
};

export const cancelSchedule = (scheduleId: string) => {
    const jobs = activeJobs.get(scheduleId);
    if (jobs) {
        jobs.forEach(job => job.cancel());
        activeJobs.delete(scheduleId);
        console.log(`Cancelled schedule: ${scheduleId} (${jobs.length} jobs)`);
    }
};

export const cancelAllSchedules = () => {
    activeJobs.forEach((jobs, id) => {
        jobs.forEach(job => job.cancel());
        console.log(`Cancelled schedule: ${id} (${jobs.length} jobs)`);
    });
    activeJobs.clear();
};

const buildCronExpression = (scheduleItem: BackupSchedule): string => {
    const [hour, minute] = scheduleItem.time.split(':');

    if (scheduleItem.frequency === 'daily' || scheduleItem.frequency === 'multiple-daily') {
        // Run daily at specified time: "minute hour * * *"
        return `${minute} ${hour} * * *`;
    } else if (scheduleItem.frequency === 'weekly') {
        // Run weekly on specified day: "minute hour * * dayOfWeek"
        return `${minute} ${hour} * * ${scheduleItem.dayOfWeek}`;
    } else if (scheduleItem.frequency === 'monthly') {
        // Run monthly on specified day: "minute hour dayOfMonth * *"
        return `${minute} ${hour} ${scheduleItem.dayOfMonth} * *`;
    }

    throw new Error(`Unknown frequency: ${scheduleItem.frequency}`);
};

export const getNextRun = (scheduleId: string): Date | null => {
    const jobs = activeJobs.get(scheduleId);
    return jobs && jobs.length > 0 ? jobs[0].nextInvocation() : null;
};
