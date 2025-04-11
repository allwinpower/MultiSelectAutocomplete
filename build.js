// build.js
import fs from 'fs/promises';
import path from 'path';
import { transform, browserslistToTargets } from 'lightningcss';
import browserslist from 'browserslist'; // Used to determine browser targets for CSS prefixing/minification
import * as terser from 'terser'; // Use * as terser for named export 'minify'

// --- Configuration ---
const INPUT_JS_FILE = 'multi-select-autocomplete-component.js'; // Your component file
const OUTPUT_JS_FILE = 'multi-select-autocomplete-component.min.js'; // Output minified file
// Optional: Define browser targets for Lightning CSS (uses browserslist syntax)
// See https://github.com/browserslist/browserslist
const BROWSER_TARGETS = '>= 0.5% and last 2 versions and not dead';
// --- End Configuration ---

const inputPath = path.resolve(INPUT_JS_FILE);
const outputPath = path.resolve(OUTPUT_JS_FILE);

async function build() {
    console.log(`Starting build for ${INPUT_JS_FILE}...`);

    try {
        // 1. Read the original JavaScript file content
        const originalJsContent = await fs.readFile(inputPath, 'utf-8');
        let modifiedJsContent = originalJsContent; // Start with original content

        // 2. Find and Extract CSS within <style> tags
        // This regex finds the content between the first <style> and </style> tags
        // It assumes there's only one main style block for the component.
        const styleRegex = /<style>([\s\S]*?)<\/style>/;
        const styleMatch = originalJsContent.match(styleRegex);

        if (styleMatch && styleMatch[1]) {
            const originalCssContent = styleMatch[1];
            const originalStyleBlock = styleMatch[0]; // Includes <style> tags
            console.log('Found <style> block, attempting CSS minification...');

            // 3. Minify the extracted CSS using Lightning CSS
            try {
                let targets = browserslistToTargets(browserslist(BROWSER_TARGETS));
                let { code: minifiedCssBuffer } = transform({
                    filename: 'embedded.css', // Provide a dummy filename
                    code: Buffer.from(originalCssContent), // Pass CSS as Buffer
                    minify: true,
                    targets: targets,
                    // Add sourceMap: true here if you want source maps
                });
                const minifiedCss = minifiedCssBuffer.toString();
                console.log(`CSS minified successfully (${originalCssContent.length} -> ${minifiedCss.length} bytes).`);

                // 4. Replace the original style block with the minified version
                modifiedJsContent = originalJsContent.replace(
                    originalStyleBlock,
                    `<style>${minifiedCss}</style>`
                );
            } catch (cssError) {
                console.error('Error during CSS minification:', cssError);
                // Decide if you want to proceed without CSS minification or fail
                console.warn('Proceeding with unminified CSS due to error.');
            }
        } else {
            console.log('No <style> block found or content empty. Skipping CSS minification.');
        }

        // 5. Minify the entire JavaScript content (with potentially updated CSS) using Terser
        console.log('Minifycating JavaScript...');
        const terserResult = await terser.minify(modifiedJsContent, {
            compress: true, // Enable compression optimizations
            mangle: true,   // Enable variable name mangling
            sourceMap: false // Set to true if you want a source map for JS
            // Add other Terser options if needed: https://terser.org/docs/api-reference#minify-options
        });

        if (terserResult.error) {
            throw terserResult.error; // Throw error if Terser failed
        }

        const finalJsCode = terserResult.code;
        console.log(`JavaScript minified successfully (${modifiedJsContent.length} -> ${finalJsCode.length} bytes).`);

        // 6. Write the final minified JavaScript code to the output file
        await fs.writeFile(outputPath, finalJsCode);
        console.log(`Build successful! Output written to ${OUTPUT_JS_FILE}`);

    } catch (error) {
        console.error('\n--- BUILD FAILED ---');
        console.error(error);
        process.exit(1); // Exit with error code
    }
}

// Run the build function
build();