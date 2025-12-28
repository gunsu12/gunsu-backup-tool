import Store from 'electron-store';

interface BackupStore {
    connections: any[];
    schedules: any[];
    history: any[];
}

const store = new Store<BackupStore>({
    defaults: {
        connections: [],
        schedules: [],
        history: []
    }
});

export default store;
