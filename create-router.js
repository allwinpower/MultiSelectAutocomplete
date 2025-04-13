import express from 'express';
import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import chokidar from 'chokidar';

// --- Module Constants ---
// Regex for valid group IDs (alphanumeric characters only)
const GROUP_ID_REGEX = /^[a-zA-Z0-9]+$/;
// Regex to match and extract groupId from tag filenames
const TAG_FILE_REGEX = /^tags_([a-zA-Z0-9]+)\.txt$/;
// Options for the file locking mechanism
const LOCK_RETRY_OPTIONS = {
    retries: { retries: 5, factor: 1.2, minTimeout: 100 }, // Exponential backoff for retries
    stale: 10000, // Consider lock stale after 10 seconds (10000 ms)
    realpath: false, // Avoid issues with symlinks if not needed
};

/**
 * Creates and initializes a tag management router.
 *
 * @param {object} options - Configuration options.
 * @param {string} options.tagsDir - The absolute path to the directory where tag files should be stored.
 * @returns {Promise<object>} A promise that resolves with an object containing the Express router and a 'ready' promise.
 * { router: Express.Router, ready: Promise<void> }
 */
async function createTagRouter(options = {}) {
    // --- Validate Options ---
    if (!options.tagsDir || typeof options.tagsDir !== 'string') {
        throw new Error('createTagRouter requires options.tagsDir (string) parameter.');
    }
    // Ensure tagsDir is an absolute path for reliability
    const TAGS_DIR = path.resolve(options.tagsDir);
    console.log(`[TagManager] Configured tags directory: ${TAGS_DIR}`);

    // --- Module Instance State ---
    const tagGroups = new Map(); // In-memory storage for this instance
    let watcher = null; // Holds the Chokidar watcher instance

    // --- Internal Helper Functions (Context-Aware) ---

    function getFilePath(groupId) {
        return path.join(TAGS_DIR, `tags_${groupId}.txt`);
    }

    function getLockPath(filePath) {
        return `${filePath}.lock`;
    }

    async function ensureTagsDirExists() {
        try {
            await fs.promises.mkdir(TAGS_DIR, { recursive: true });
            console.log(`[TagManager] Tags directory ensured: ${TAGS_DIR}`);
        } catch (err) {
            console.error(`[TagManager] FATAL: Error creating tags directory ${TAGS_DIR}:`, err);
            // Re-throw error to prevent initialization if directory fails
            throw err;
        }
    }

    async function loadOrReloadGroup(groupId, filePath) {
        // (This function remains largely the same as before, but uses the instance's TAGS_DIR via getFilePath/getLockPath and tagGroups)
        console.log(`[TagManager Reload] Attempting load/reload for group: ${groupId}`);
        const lockPath = getLockPath(filePath);
        let release;
        try {
            release = await lockfile.lock(filePath, { ...LOCK_RETRY_OPTIONS, lockfilePath: lockPath });
            console.log(`[TagManager Reload] Lock acquired for ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const newSet = new Set();
            fileContent.split(/\r?\n/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .forEach(tag => newSet.add(tag));
            tagGroups.set(groupId, newSet);
            console.log(`[TagManager Reload] Successfully reloaded group: ${groupId}, size: ${newSet.size}`);
        } catch (err) {
            if (err.code === 'ELOCKED') {
                console.warn(`[TagManager Reload] Lock conflict for ${filePath}. Skipping reload.`);
            } else if (err.code === 'ENOENT') {
                console.warn(`[TagManager Reload] File ${filePath} not found. Removing group ${groupId}.`);
                tagGroups.delete(groupId);
            } else {
                console.error(`[TagManager Reload] Error processing group ${groupId} from ${filePath}:`, err);
            }
        } finally {
            if (release) {
                try { await release(); console.log(`[TagManager Reload] Lock released for ${filePath}`); }
                catch (unlockError) { console.error(`[TagManager Reload] Error releasing lock for ${filePath}:`, unlockError); }
            }
        }
    }

    async function initialLoad() {
        console.log(`[TagManager] Starting initial load from ${TAGS_DIR}...`);
        try {
            const files = await fs.promises.readdir(TAGS_DIR);
            const loadPromises = files
                .map(filename => {
                    const match = filename.match(TAG_FILE_REGEX);
                    if (match && match[1]) {
                        const groupId = match[1];
                        const filePath = getFilePath(groupId);
                        return loadOrReloadGroup(groupId, filePath); // Return the promise
                    }
                    return null; // Ignore non-matching files
                })
                .filter(p => p !== null); // Filter out nulls

            await Promise.all(loadPromises);
            console.log('[TagManager] Initial load complete.');
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log(`[TagManager] Tags directory ${TAGS_DIR} not found during initial load (expected on first run).`);
            } else {
                console.error('[TagManager] Error during initial load:', err);
                // Re-throw to signal initialization failure
                throw err;
            }
        }
    }

    function setupWatcher() {
        console.log(`[TagManager] Setting up watcher for directory: ${TAGS_DIR}`);
        watcher = chokidar.watch(TAGS_DIR, { /* (Watcher options same as before) */
            ignored: /(^|[\/\\])\..|.*\.lock$/,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
            depth: 0
        });

        watcher
            .on('add', filePath => {
                const filename = path.basename(filePath);
                const match = filename.match(TAG_FILE_REGEX);
                if (match && match[1]) {
                    console.log(`[TagManager Watcher] Detected new file: ${filename}`);
                    loadOrReloadGroup(match[1], filePath);
                }
            })
            .on('change', filePath => {
                const filename = path.basename(filePath);
                const match = filename.match(TAG_FILE_REGEX);
                if (match && match[1]) {
                    console.log(`[TagManager Watcher] Detected change in: ${filename}`);
                    loadOrReloadGroup(match[1], filePath);
                }
            })
            .on('unlink', filePath => {
                const filename = path.basename(filePath);
                const match = filename.match(TAG_FILE_REGEX);
                if (match && match[1]) {
                    console.log(`[TagManager Watcher] Detected deletion of: ${filename}. Removing group ${match[1]} from memory.`);
                    tagGroups.delete(match[1]);
                }
            })
            .on('error', error => console.error(`[TagManager Watcher] Error: ${error}`));
        // Note: The 'ready' event is handled in the initialization promise below

        // Optional: Handle graceful shutdown for the watcher if needed,
        // although usually the main app handles process signals.
        // const shutdown = () => watcher?.close().then(() => console.log('[TagManager] Watcher closed.'));
        // process.on('SIGINT', shutdown);
        // process.on('SIGTERM', shutdown);

        return watcher; // Return the watcher instance
    }


    // --- Create Router ---
    const router = express.Router();

    // --- Define API Endpoints on the Router ---

    // GET /:groupId (relative path to where router is mounted)
    router.get('/:groupId', (req, res) => {
        const { groupId } = req.params;
        if (!GROUP_ID_REGEX.test(groupId)) {
            return res.status(400).json({ error: 'Invalid group ID format.' });
        }
        const tagsSet = tagGroups.get(groupId);
        if (tagsSet) {
            res.json(Array.from(tagsSet).sort());
        } else {
            res.status(404).json([]);
        }
    });

    // POST /:groupId (relative path)
    router.post('/:groupId', async (req, res) => {
        const { groupId } = req.params;
        console.log('groupId:', groupId);
        if (!GROUP_ID_REGEX.test(groupId)) {
            return res.status(400).json({ error: 'Invalid group ID format.' });
        }
        if (req.body === undefined) {
            console.warn(`[TagManager WARN - POST /${groupId}] 'req.body' is undefined. This likely means the express.json() middleware was not used or applied correctly *before* this route in the main Express application setup. Ensure 'app.use(express.json());' is called.`);
            return res.status(400).json({ error: 'Missing or malformed request body. Expected JSON array.' });
        }
        if (!Array.isArray(req.body)) {
            console.log('req.body:', req.body);
            return res.status(400).json({ error: 'Request body must be an array of tags.' });
        }

        const tagsToAdd = req.body.map(tag => String(tag).trim()).filter(tag => tag.length > 0);
        if (tagsToAdd.length === 0) {
            return res.status(200).json({ message: 'No valid tags provided.', addedCount: 0 });
        }

        const filePath = getFilePath(groupId);
        const lockPath = getLockPath(filePath);
        let release;

        try {
            if (!tagGroups.has(groupId)) {
                tagGroups.set(groupId, new Set());
            }
            const tagsSet = tagGroups.get(groupId);
            const newlyAddedTags = [];
            tagsToAdd.forEach(tag => {
                if (!tagsSet.has(tag)) {
                    newlyAddedTags.push(tag);
                    tagsSet.add(tag);
                }
            });

            if (newlyAddedTags.length > 0) {
                release = await lockfile.lock(filePath, { ...LOCK_RETRY_OPTIONS, lockfilePath: lockPath });
                let fileNeedsNewline = false;
                try {
                    const stats = await fs.promises.stat(filePath);
                    if (stats.size > 0) fileNeedsNewline = true;
                } catch (statErr) { if (statErr.code !== 'ENOENT') throw statErr; }
                const dataToAppend = (fileNeedsNewline ? '\n' : '') + newlyAddedTags.join('\n');
                await fs.promises.appendFile(filePath, dataToAppend, 'utf8');
            }

            res.status(200).json({
                message: `Processed ${tagsToAdd.length} tags. Added ${newlyAddedTags.length} new unique tags.`,
                addedCount: newlyAddedTags.length,
                newlyAdded: newlyAddedTags
            });

        } catch (err) {
            if (err.code === 'ELOCKED') {
                res.status(503).json({ error: 'Server busy processing tags for this group.' });
            } else {
                console.error(`[TagManager POST] Error for group ${groupId}:`, err);
                res.status(500).json({ error: 'Internal Server Error.' });
            }
        } finally {
            if (release) {
                try { await release(); } catch (unlockError) { console.error(`[TagManager POST] Error releasing lock for ${filePath}:`, unlockError); }
            }
        }
    });

    // --- Perform Initialization ---
    // We return a promise that resolves when initial load and watcher setup are done.
    const initializationPromise = (async () => {
        await ensureTagsDirExists();
        await initialLoad();
        const watcherInstance = setupWatcher();

        // Return a new promise that resolves when the watcher signals it's ready
        return new Promise((resolve, reject) => {
            if (watcherInstance) {
                watcherInstance.on('ready', () => {
                    console.log(`[TagManager Watcher] Initial scan complete for ${TAGS_DIR}. Ready.`);
                    resolve(); // Initialization is fully complete
                });
                watcherInstance.on('error', (err) => {
                    // If watcher errors on startup, reject the initialization
                    console.error("[TagManager Watcher] Critical error during setup:", err);
                    reject(err);
                })
            } else {
                // Should not happen if setupWatcher works correctly
                console.warn("[TagManager] Watcher instance not available after setup.");
                resolve(); // Resolve anyway, but log warning
            }
        });
    })();


    // Return the router and the promise indicating readiness
    return {
        router: router,
        ready: initializationPromise
    };
}

// Export the factory function as the default export
export default createTagRouter;