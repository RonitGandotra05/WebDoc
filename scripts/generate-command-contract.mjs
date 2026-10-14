import fs from "node:fs/promises";
import ts from "typescript";
import * as TJS from "typescript-json-schema";
const base = "node_modules/superdoc/dist/document-api/src/contract/";
const programMetadata = ts.createProgram(
  [base + "operation-definitions.d.ts"],
  { skipLibCheck: true },
);
const source = programMetadata.getSourceFile(
  base + "operation-definitions.d.ts",
);
const checker = programMetadata.getTypeChecker();
const declaration = source.statements.find(
  (s) =>
    ts.isVariableStatement(s) &&
    s.declarationList.declarations[0].name.text === "OPERATION_DEFINITIONS",
).declarationList.declarations[0];
const entries = checker
  .getTypeAtLocation(declaration)
  .getProperties()
  .map((prop) => {
    const type = checker.getTypeOfSymbolAtLocation(prop, declaration);
    const value = (key) => {
      const symbol = type.getProperty(key);
      return symbol
        ? checker.getTypeOfSymbolAtLocation(symbol, declaration).value
        : undefined;
    };
    return {
      id: prop.name,
      description: value("description"),
      path: value("memberPath"),
    };
  });
const scratch = "scripts/.automation-contract.ts";
await fs.writeFile(
  scratch,
  `import type {OperationRegistry} from '../${base}operation-registry.js';\n` +
    entries
      .map(
        (e, i) =>
          `export type Command${i} = {input: OperationRegistry[${JSON.stringify(e.id)}]['input']; options?: OperationRegistry[${JSON.stringify(e.id)}]['options']};`,
      )
      .join("\n"),
);
try {
  const program = TJS.getProgramFromFiles([scratch], {
    strictNullChecks: true,
    skipLibCheck: true,
    lib: ["es2022", "dom"],
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  });
  const generator = TJS.buildGenerator(program, {
    required: true,
    ignoreErrors: true,
    ref: true,
    noExtraProps: false,
    aliasRef: true,
  });
  const schemas = generator.getSchemaForSymbols(
    entries.map((_, i) => `Command${i}`),
  );
  const contract = {
    engineVersion: JSON.parse(
      await fs.readFile("node_modules/superdoc/package.json"),
    ).version,
    schema: schemas,
    commands: entries.map((e, i) => ({
      ...e,
      schemaRef: `#/definitions/Command${i}`,
    })),
  };
  const generated = JSON.stringify(contract);
  if (process.argv.includes("--check")) {
    if (
      (await fs.readFile("src/automation/engine-contract.json", "utf8")) !==
      generated
    )
      throw new Error("Command contract is stale. Run npm run api:generate.");
  } else await fs.writeFile("src/automation/engine-contract.json", generated);
  console.log(
    `Generated ${entries.length} command schemas (${JSON.stringify(contract).length} bytes).`,
  );
} finally {
  await fs.unlink(scratch);
}
