const chokidar = require('chokidar');
const path = require('path');

class MusicFolderWatcher {
    constructor(folders, onChange) {
        this.folders = folders;
        this.onChange = onChange;
        this.watcher = null;
    }

    start() {
        if (this.watcher) {
            this.stop();
        }

        this.watcher = chokidar.watch(this.folders, {
            ignored: /(^|[\/\\])\../,  // Ignore hidden files
            persistent: true,
            ignoreInitial: true,  // Don't trigger on startup
            depth: 99,  // Watch all subdirectories
            awaitWriteFinish: {
                stabilityThreshold: 500,  // Wait 500ms after last change (faster for moves)
                pollInterval: 100
            },
            // Enable atomic write detection for better move/rename handling
            atomic: true
        });

        this.watcher
            .on('add', (filePath) => {
                if (this.isMusicFile(filePath)) {
                    console.log(`[Watcher] File added: ${filePath}`);
                    this.onChange('add', filePath);
                }
            })
            .on('change', (filePath) => {
                if (this.isMusicFile(filePath)) {
                    console.log(`[Watcher] File changed: ${filePath}`);
                    this.onChange('change', filePath);
                }
            })
            .on('unlink', (filePath) => {
                if (this.isMusicFile(filePath)) {
                    console.log(`[Watcher] File deleted: ${filePath}`);
                    this.onChange('delete', filePath);
                }
            })
            .on('error', (error) => {
                console.error('[Watcher] Error:', error);
            });

        console.log('[Watcher] Started watching folders:', this.folders);
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            console.log('[Watcher] Stopped watching');
        }
    }

    isMusicFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return ['.flac', '.mp3', '.m4a', '.wav', '.ogg', '.opus', '.aac'].includes(ext);
    }
}

module.exports = MusicFolderWatcher;
