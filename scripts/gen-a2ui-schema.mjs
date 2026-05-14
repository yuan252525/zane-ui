import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.join(__dirname, '..', 'src', 'components');

// ─── Type mapping helpers ──────────────────────────────

/**
 * Map TypeScript types to JSON Schema types.
 * Returns { type, items?, enum?, pattern?, ... } or null if unresolvable.
 */
function tsTypeToJsonSchema(tsType) {
  const t = tsType.trim();

  // String types
  if (t === 'string') return { type: 'string' };
  if (/^['"].+['"]$/.test(t)) return { type: 'string', const: t.replace(/['"]/g, '') };

  // Boolean
  if (t === 'boolean') return { type: 'boolean' };

  // Number
  if (t === 'number') return { type: 'number' };

  // Null / undefined
  if (t === 'null' || t === 'undefined') return {};

  // Union types: string | number | boolean | null
  const unionParts = splitUnion(t);
  if (unionParts.length > 1) {
    const schemas = unionParts.map(p => {
      // Strip trailing ? and whitespace
      const clean = p.replace(/\s*\?$/, '').trim();
      if (!clean || clean === 'null' || clean === 'undefined') return { type: 'null' };
      if (clean === 'string') return { type: 'string' };
      if (clean === 'boolean') return { type: 'boolean' };
      if (clean === 'number') return { type: 'number' };
      // For complex/unknown types in unions, treat as string (common case for UI props)
      return { type: 'string' };
    }).filter(s => Object.keys(s).length > 0);

    // Simplify common patterns like "string | undefined" -> "string"
    const nonNull = schemas.filter(s => s.type !== 'null');
    if (nonNull.length === 1 && schemas.some(s => s.type === 'null')) {
      return nonNull[0];
    }
    if (schemas.length === 1) return schemas[0];

    // If all are same primitive type, just return that
    const uniqueTypes = [...new Set(nonNull.map(s => s.type).filter(Boolean))];
    if (uniqueTypes.length === 1) return { type: uniqueTypes[0] };

    return { oneOf: schemas };
  }

  // Array types: T[] or Array<T>
  const arrayMatch = t.match(/^(?:Array)?<(.+)>$|^(.+)\[\]$/);
  if (arrayMatch) {
    const itemType = arrayMatch[1] || arrayMatch[2];
    const itemSchema = tsTypeToJsonSchema(itemType);
    return {
      type: 'array',
      items: Object.keys(itemSchema).length > 0 ? itemSchema : {},
    };
  }

  // Record<string, T> or Object types
  if (t.startsWith('Record<') || t.match(/^(\{[^}]*\}|Object)$/)) {
    return { type: 'object', additionalProperties: true };
  }

  // Unknown/custom types — treat as string (most common for UI component string props)
  return { type: 'string' };
}

function splitUnion(typeStr) {
  // Split on | but be careful of | inside <> (generics)
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of typeStr) {
    if (ch === '<' || ch === '(') depth++;
    else if (ch === '>' || ch === ')') depth--;
    else if (ch === '|' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts.map(s => s.trim()).filter(Boolean);
}

/**
 * Extract default value and convert to JSON-friendly form.
 */
function formatDefault(defaultVal) {
  if (defaultVal === null || defaultVal === undefined) return undefined;
  if (defaultVal === "'undefined'" || defaultVal === 'undefined') return undefined;

  // Remove surrounding quotes from string defaults
  if ((defaultVal.startsWith("'") && defaultVal.endsWith("'")) ||
      (defaultVal.startsWith('"') && defaultVal.endsWith('"'))) {
    return defaultVal.slice(1, -1);
  }

  // Boolean / number literals
  if (defaultVal === 'true') return true;
  if (defaultVal === 'false') return false;
  if (defaultVal === 'null') return null;
  if (!isNaN(Number(defaultVal))) return Number(defaultVal);

  // Arrays
  if (defaultVal.startsWith('[')) {
    try { return JSON.parse(defaultVal); } catch { return undefined; }
  }

  // Objects
  if (defaultVal.startsWith('{')) {
    try { return JSON.parse(defaultVal); } catch { return undefined; }
  }

  // Function references like NOOP, mutable(...) — skip
  if (/^[A-Z]/.test(defaultVal) || defaultVal.includes('(')) return undefined;

  return defaultVal;
}

// ─── Prop extraction ───────────────────────────────────

const SUB_COMPONENT_SUFFIXES = [
  '-item', '-group', '-menu', '-option', '-dropdown',
  '-panel', '-marker', '-button', '-grid', '-bar', '-thumb',
  '-node', '-content',
];

function isSubComponent(filename, dirName) {
  if (filename === `zane-${dirName}.tsx`) return false;
  return SUB_COMPONENT_SUFFIXES.some(p => filename.includes(p));
}

function parsePropLine(line) {
  const propPrefixMatch = line.match(/^(\s*)@Prop\s*\(([^)]*)\)\s*/);
  if (!propPrefixMatch) return null;
  const decl = line.slice(propPrefixMatch[0].length).trim();
  if (!decl || decl.startsWith('//')) return null;

  const declMatch = decl.match(
    /^(\w+)\s*:\s*([\w\[\]<>\|\s&?,.'"_-]+?)(?:\s*=\s*(.+?))?\s*;?\s*$/
  );
  if (!declMatch) return null;

  let [, name, rawType, defaultVal] = declMatch;
  rawType = rawType.trim();

  if (defaultVal) {
    defaultVal = defaultVal.trim();
    if (defaultVal === 'undefined') defaultVal = null;
  }

  return { name, type: rawType, defaultValue: defaultVal ?? null };
}

function extractProps(content) {
  const normalizedLines = [];
  const allLines = content.split('\n');
  let pendingDecoratorLine = null;

  for (const line of allLines) {
    const trimmed = line.trim();
    if (trimmed.match(/^@Prop\s*\(/)) {
      const afterProp = trimmed.replace(/^@Prop\s*\([^)]*\)\s*/, '');
      if (afterProp.length > 0 && /^\w/.test(afterProp)) {
        normalizedLines.push(line);
        pendingDecoratorLine = null;
      } else {
        pendingDecoratorLine = line;
      }
      continue;
    }

    if (pendingDecoratorLine) {
      if (trimmed.length === 0 || trimmed.startsWith('@') || trimmed.startsWith('export') || trimmed.startsWith('component')) {
        normalizedLines.push(pendingDecoratorLine);
        pendingDecoratorLine = null;
        normalizedLines.push(line);
      } else {
        normalizedLines.push(pendingDecoratorLine + ' ' + trimmed);
        pendingDecoratorLine = null;
      }
      continue;
    }
    normalizedLines.push(line);
  }
  if (pendingDecoratorLine) normalizedLines.push(pendingDecoratorLine);

  const props = [];
  for (const line of normalizedLines) {
    const prop = parsePropLine(line);
    if (prop) props.push(prop);
  }
  return props;
}

// ─── Schema building ───────────────────────────────────

function buildComponentPropertySchema(props) {
  const properties = {};
  const required = [];

  for (const prop of props) {
    if (prop.name.startsWith('_')) continue;

    const jsonSchema = tsTypeToJsonSchema(prop.type);

    const propDef = {};
    if (jsonSchema.type) propDef.type = jsonSchema.type;
    if (jsonSchema.oneOf) propDef.oneOf = jsonSchema.oneOf;
    if (jsonSchema.items) propDef.items = jsonSchema.items;
    if (jsonSchema.additionalProperties !== undefined) propDef.additionalProperties = jsonSchema.additionalProperties;

    const def = formatDefault(prop.defaultValue);
    if (def !== undefined) propDef.default = def;

    // Convert camelCase prop names to kebab-case for the schema attribute names
    const attrName = prop.name.replace(/([A-Z])/g, '-$1').toLowerCase();

    properties[attrName] = propDef;

    // Only mark as required if:
    // - No default value provided
    // - Type does NOT include undefined/null (i.e., it's not an optional type)
    const hasDefault = def !== undefined;
    const typeIncludesOptional = prop.type.includes('undefined') || prop.type.includes('|');
    if (!hasDefault && !typeIncludesOptional && !prop.name.startsWith('z')) {
      required.push(attrName);
    }
  }

  return { properties, required };
}

// ─── Main ──────────────────────────────────────────────

const dirs = fs.readdirSync(componentsDir).filter(d =>
  fs.statSync(path.join(componentsDir, d)).isDirectory()
);

// Build component type definitions from source code
const componentSchemas = {};

for (const dir of dirs.sort()) {
  // Skip the a2ui container component itself
  if (dir === 'a2ui') continue;

  const dirPath = path.join(componentsDir, dir);
  const allFiles = fs.readdirSync(dirPath).filter(f =>
    f.endsWith('.tsx') && !isSubComponent(f, dir)
  );
  const mainFile = allFiles.find(f => f === `zane-${dir}.tsx`) || allFiles[0];
  if (!mainFile) continue;

  const filePath = path.join(dirPath, mainFile);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Get tag name for the component type key
  const tagMatch = content.match(/tag:\s*['"]([^'"]+)['"]/);
  const tag = tagMatch ? tagMatch[1] : `zane-${dir}`;

  const props = extractProps(content);

  // Filter out internal/special props
  const publicProps = props.filter(p =>
    !p.name.startsWith('_') &&
    p.name !== 'el'
  );

  if (publicProps.length > 0) {
    const { properties, required } = buildComponentPropertySchema(publicProps);

    componentSchemas[tag] = {
      type: 'object',
      description: `${tag} component properties.`,
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }
}

// ─── Build final schema ────────────────────────────────

const schema = {
  $id: 'https://zanejs.dev/a2ui/message-schema.json',
  title: 'A2UI Message Schema',
  description:
    'Describes a JSON payload for an A2UI (Agent to UI) message, which is used to dynamically construct and update user interfaces using zane-ui web components. ' +
    'A message MUST contain exactly ONE of the action properties: \'beginRendering\', \'surfaceUpdate\', \'dataModelUpdate\', or \'deleteSurface\'.',
  type: 'object',
  properties: {
    beginRendering: {
      type: 'object',
      description:
        'Signals the client to begin rendering a surface with a root component and specific styles.',
      properties: {
        surfaceId: {
          type: 'string',
          description: 'The unique identifier for the UI surface to be rendered.',
        },
        root: {
          type: 'string',
          description: 'The ID of the root component to render.',
        },
        styles: {
          type: 'object',
          description: 'CSS styling information for the UI surface. Keys are CSS selectors, values are style declarations.',
          additionalProperties: { type: 'string' },
          examples: [
            { '.container': 'padding: 16px;' },
            { '.header': 'background-color: #00BFFF; color: white;' },
          ],
        },
      },
      required: ['root', 'surfaceId'],
    },

    surfaceUpdate: {
      type: 'object',
      description: 'Updates a surface with a new set of components.',
      properties: {
        surfaceId: {
          type: 'string',
          description:
            'The unique identifier for the UI surface to be updated. If you are adding a new surface this *must* be a new, unique identifier that has never been used for any existing surfaces shown.',
        },
        components: {
          type: 'array',
          description: 'A list containing all UI component instances for the surface.',
          minItems: 1,
          items: {
            type: 'object',
            description:
              'Represents a single component instance in a UI widget tree. Each instance has a unique ID and defines one component type with its properties.',
            properties: {
              id: {
                type: 'string',
                description: 'The unique identifier for this component instance.',
              },
              weight: {
                type: 'number',
                description:
                  'The relative weight of this component within a flex container. This corresponds to the CSS \'flex-grow\' property.',
              },
              component: {
                type: 'object',
                description:
                  'A wrapper object that MUST contain exactly one key, which is the component tag name (e.g., \'zane-button\', \'zane-text\', \'zane-input\'). The value is an object containing the properties for that specific component.',
                properties: componentSchemas,
              },
            },
            required: ['id', 'component'],
          },
        },
      },
      required: ['surfaceId', 'components'],
    },

    dataModelUpdate: {
      type: 'object',
      description: 'Updates the data model for a surface.',
      properties: {
        surfaceId: {
          type: 'string',
          description: 'The unique identifier for the UI surface this data model update applies to.',
        },
        path: {
          type: 'string',
          description:
            'An optional path to a location within the data model (e.g., \'/user/name\'). If omitted, or set to \'/\', the entire data model will be replaced at the root level.',
        },
        contents: {
          type: 'array',
          description:
            'An array of data entries. Each entry must contain a \'key\' and exactly one corresponding typed \'value*\' property representing the value to store.',
          minItems: 1,
          items: {
            type: 'object',
            description: 'A single data entry.',
            properties: {
              key: {
                type: 'string',
                description: 'The key for this data entry.',
              },
              valueString: {
                type: 'string',
                description: 'A string value for this entry.',
              },
              valueNumber: {
                type: 'number',
                description: 'A numeric value for this entry.',
              },
              valueBoolean: {
                type: 'boolean',
                description: 'A boolean value for this entry.',
              },
              valueMap: {
                description: 'Represents a nested map structure as an adjacency list (array of key-value entries).',
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    valueString: { type: 'string' },
                    valueNumber: { type: 'number' },
                    valueBoolean: { type: 'boolean' },
                  },
                  required: ['key'],
                },
              },
            },
            required: ['key'],
          },
        },
      },
      required: ['contents', 'surfaceId'],
    },

    deleteSurface: {
      type: 'object',
      description: 'Signals the client to delete the surface identified by \'surfaceId\'.',
      properties: {
        surfaceId: {
          type: 'string',
          description: 'The unique identifier for the UI surface to be deleted.',
        },
      },
      required: ['surfaceId'],
    },
  },
};

// Write output
const outputPath = path.join(__dirname, '..', 'a2ui-schema.json');
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

// Summary
console.log(`Schema written to ${outputPath}`);
console.log(`Component types defined: ${Object.keys(componentSchemas).length}`);
console.log(`Components: ${Object.keys(componentSchemas).join(', ')}`);
