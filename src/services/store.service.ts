import Store from 'electron-store';

interface BackupStore {
    connections: any[];
    schedules: any[];
    history: any[];
    theme: 'dark' | 'light';
}

const store = new Store<BackupStore>({
    defaults: {
        connections: [],
        schedules: [],
        history: [],
        theme: 'dark'
    }
});

export default store;
