const path = require('path');
const chokidar = require('chokidar');

class MusicFolderWatcher {
    constructor(folders, onChange) {
        // Keep absolute Windows paths using backslashes
        this.folders = folders.map(f => path.resolve(f));
        this.onChange = onChange;
        this.watcher = null;
    }

    start() {
        if (this.watcher) return;

        console.log(`\n==================================================`);
        console.log(`🎧 [Watcher] Active on: ${this.folders.join(', ')}`);
        console.log(`==================================================\n`);

        this.watcher = chokidar.watch(this.folders, {
            ignored: /(^|[\/\\])\../,  // Ignore hidden dotfiles
            persistent: true,
            ignoreInitial: true,       // CRITICAL: Silent boot (doesn't log your 10,000 existing files)
            depth: 99,                 // Watch nested subfolders

            // Polling is required for reliable events on secondary Windows partitions (D:)
            usePolling: true,
            interval: 1000,            // Poll once a second to keep CPU near 0%

            // Ensures we don't trigger while a file is still copying/downloading
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 100
            }
        });

        // 1. Silent Boot Confirmation
        this.watcher.on('ready', () => {
            console.log('⚡ [Watcher State] Standing by... Go ahead and change a music file!');
        });

        // 2. High-Visibility File Addition
        this.watcher.on('add', (filePath) => {
            if (this.isMusicFile(filePath)) {
                const fileName = path.basename(filePath);
                console.log(`🟢 [ADDED] ${fileName}`);
                this.onChange('add', filePath);
            }
        });

        // 3. High-Visibility File Modification
        this.watcher.on('change', (filePath) => {
            if (this.isMusicFile(filePath)) {
                const fileName = path.basename(filePath);
                console.log(`🟡 [CHANGED] ${fileName}`);
                this.onChange('change', filePath);
            }
        });

        // 4. High-Visibility File Deletion
        this.watcher.on('unlink', (filePath) => {
            if (this.isMusicFile(filePath)) {
                const fileName = path.basename(filePath);
                console.log(`🔴 [DELETED] ${fileName}`);
                this.onChange('delete', filePath);
            }
        });

        this.watcher.on('error', (error) => {
            console.error('❌ [Watcher Error]:', error.message);
        });
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            console.log('🛑 [Watcher] Stopped and sleeping.');
        }
    }

    isMusicFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return ['.flac', '.mp3', '.m4a', '.wav', '.ogg', '.opus', '.aac'].includes(ext);
    }
}

module.exports = MusicFolderWatcher;