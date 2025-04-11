import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createTagRouter from './tagManager.js'; // Adjust path if needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Global Middleware ---
// IMPORTANT: express.json() middleware is needed for the POST endpoint in the tag router
app.use(express.json());

// --- Configure and Initialize Tag Router ---
const tagManagerOptions = {
    // *** REQUIRED: Specify the absolute path to your desired tag storage directory ***
    tagsDir: path.join(__dirname, 'tag_files') // Example: Create 'all_my_tags' folder
};

function serveStaticFiles(app, files) {
    files.forEach(({ route, filePath }) => {
        const fullPath = path.resolve(filePath);
        app.get(route, (req, res) => {
            res.sendFile(fullPath, (err) => {
                if (err) {
                    console.error(`[SendFile Error] Error sending file ${fullPath}:`, err);
                    if (!res.headersSent) {
                        res.status(err.status || 500).send("Server error: Could not load file.");
                    }
                }
            });
        });
    });
}
// --- Asynchronous Setup ---
// Use an async IIFE to handle the async initialization of the tag router
(async () => {
    try {
        // --- Initialize Tag Manager ---
        // This function now returns an object { router, ready }
        // The 'ready' property is a promise that resolves when initialization is complete
        const tagManager = await createTagRouter(tagManagerOptions);

        // --- Wait for Tag Manager Readiness (Optional but Recommended) ---
        // Ensures initial files are loaded and watcher is ready before accepting requests
        await tagManager.ready;
        console.log("Tag Manager module is initialized and ready.");

        // --- Mount Tag Router ---
        // Mount the tag routes under the /tags base path (or any path you want)
        app.use('/tags', tagManager.router);
        // Now your API endpoints are available at:
        // GET /tags/:groupId
        // POST /tags/:groupId

        // --- Other Application Routes (Examples) ---        
        serveStaticFiles(app, [
            { route: '/', filePath: './demo.html' },
            { route: '/multi-select-autocomplete-component.min.js', filePath: './dist/multi-select-autocomplete-component.min.js' },
        ]);

        // --- Global Fallback and Error Handling (Place AFTER all routes/routers) ---
        app.use((req, res, next) => {
            res.status(404).json({ error: 'Not Found in Main Application' });
        });

        app.use((err, req, res, next) => {
            console.error("Unhandled Application Error:", err.stack);
            res.status(500).json({ error: 'Internal Server Error' });
        });

        // --- Start the Main Server ---
        app.listen(PORT, () => {
            console.log(`Main App server listening on port ${PORT}`);
        });

    } catch (error) {
        console.error("Failed to initialize Tag Manager or start server:", error);
        process.exit(1);
    }
})();