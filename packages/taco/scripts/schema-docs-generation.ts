import {
  convertSchemas,
  ExportedSchema,
  findZodSchemas,
  formatModelsAsMarkdown,
  groupPromiseResultsByStatus,
  ImportedModules,
  LoaderOptions,
  Options,
} from 'modified-zod2md';

import { mkdir, writeFile } from 'fs/promises';

import { glob } from 'glob';
import * as path from 'path';

// Because of an issue with the bundleRequire that is used within zod2md, the importModules function has been modified to work and the files that calls it needed to be copied.

// copied and modifled from zod2md: src/loader/import.ts
export async function importModules(
  options: LoaderOptions,
): Promise<ImportedModules> {
  const entries = Array.isArray(options.entry)
    ? options.entry
    : [options.entry];

  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      // this has been modified to work. Because bundleRequire is not able to load the files correctly.
      const mod = await import(entry);

      // const { mod } = await bundleRequire<unknown>({
      //   filepath: entry,
      //   tsconfig: options.tsconfig,
      //   format: options.format,
      // });

      if (typeof mod !== 'object' || mod === null) {
        throw new Error('Expected module exports to be an object');
      }

      return [entry, mod] as const;
    }),
  );

  const { fulfilled, rejected } = groupPromiseResultsByStatus(results);

  rejected.forEach((reason) => {
    console.warn('Failed to load entry point', reason);
  });
  if (fulfilled.length === 0) {
    throw new Error('Failed to load any entry point');
  }

  return Object.fromEntries(fulfilled);
}

// copied as is from zod2md: src/loader/loader.ts
export async function loadZodSchemas(
  options: LoaderOptions,
): Promise<ExportedSchema[]> {
  const modules = await importModules(options);
  return findZodSchemas(modules);
}

// copied as is from zod2md: src/index.ts
export async function zod2md(options: Options): Promise<string> {
  const schemas = await loadZodSchemas(options);
  const models = convertSchemas(schemas);
  return formatModelsAsMarkdown(models, options);
}

// Define the directory paths
// The file or the directory with .ts file(s)
// could be something like './packages/taco/src/conditions/schemas/**/*.ts' or './packages/taco/src/conditions/schemas/**/file-name.ts'
// However, if the files contains LazyZod types, the generation would not be very organized.
// So, just every related file should be exported from the same file (similar to the usual exporting from index.js).
// Note: the order of the exported Zod objects in the specified file will dictate the order of the generated markdown.
const schemaSource = './src/conditions/schemas/export-for-zod-doc-gen.ts';

const schemaOutputDirectory = './schema-docs/'; // The directory where Markdown will be saved
const schemaOutputFile = 'condition-schemas.md'; // File name where the Markdown will be saved

const appendedText = `
## More resources

For more information, please refer to the TACo documentation:
https://docs.taco.build/
`;

async function generateMdFiles() {
  try {
    // Use glob to find all TypeScript files in the source directory
    const files = await glob(schemaSource);

    const filePaths = files.map((file) => path.resolve(file));
    console.log('Generate Zod documentation from files:', filePaths);

    const markdown = await zod2md({
      entry: filePaths,
      title: 'Condition Schemas',
    });

    await mkdir(schemaOutputDirectory, { recursive: true });
    await writeFile(
      schemaOutputDirectory + schemaOutputFile,
      markdown + appendedText,
    );
  } catch (error) {
    console.error(`Failed during :`, error);
  }

  console.info(
    'Condition Schemas file generated successfully at:',
    schemaOutputDirectory + schemaOutputFile,
  );
}

generateMdFiles();
