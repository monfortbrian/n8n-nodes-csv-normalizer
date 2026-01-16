import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as iconv from 'iconv-lite';

export class CsvNormalizer implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'CSV Normalizer',
    name: 'csvNormalizer',
    //icon: 'file:csvnormalizer.svg',
    icon: 'fa:table',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Normalize and sanitize CSV/Excel files',
    defaults: {
      name: 'CSV Normalizer',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Normalize CSV',
            value: 'normalizeCsv',
            description: 'Clean and normalize CSV data',
            action: 'Normalize CSV data',
          },
          {
            name: 'Normalize Excel',
            value: 'normalizeExcel',
            description: 'Clean and normalize Excel data',
            action: 'Normalize Excel data',
          },
        ],
        default: 'normalizeCsv',
      },
      {
        displayName: 'Input Data',
        name: 'inputData',
        type: 'string',
        typeOptions: {
          rows: 10,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['normalizeCsv'],
          },
        },
        description: 'CSV data to normalize (paste raw CSV or use expression)',
      },
      {
        displayName: 'Binary Property',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            operation: ['normalizeExcel'],
          },
        },
        description: 'Name of the binary property containing the Excel file',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Normalize Headers',
            name: 'normalizeHeaders',
            type: 'boolean',
            default: true,
            description: 'Whether to convert headers to snake_case',
          },
          {
            displayName: 'Remove Empty Rows',
            name: 'removeEmptyRows',
            type: 'boolean',
            default: true,
            description: 'Whether to remove completely empty rows',
          },
          {
            displayName: 'Remove Empty Columns',
            name: 'removeEmptyColumns',
            type: 'boolean',
            default: false,
            description: 'Whether to remove completely empty columns',
          },
          {
            displayName: 'Trim Whitespace',
            name: 'trimWhitespace',
            type: 'boolean',
            default: true,
            description: 'Whether to trim whitespace from all fields',
          },
          {
            displayName: 'Detect Encoding',
            name: 'detectEncoding',
            type: 'boolean',
            default: true,
            description: 'Whether to auto-detect file encoding',
          },
          {
            displayName: 'Normalize Dates',
            name: 'normalizeDates',
            type: 'boolean',
            default: false,
            description: 'Whether to convert dates to ISO format (YYYY-MM-DD)',
          },
          {
            displayName: 'Coerce Numbers',
            name: 'coerceNumbers',
            type: 'boolean',
            default: false,
            description: 'Whether to convert numeric strings to numbers',
          },
          {
            displayName: 'Column Mappings',
            name: 'columnMappings',
            type: 'fixedCollection',
            typeOptions: {
              multipleValues: true,
            },
            default: {},
            description: 'Map column names to new names',
            options: [
              {
                name: 'mapping',
                displayName: 'Mapping',
                values: [
                  {
                    displayName: 'From Column',
                    name: 'from',
                    type: 'string',
                    default: '',
                    description: 'Original column name',
                  },
                  {
                    displayName: 'To Column',
                    name: 'to',
                    type: 'string',
                    default: '',
                    description: 'New column name',
                  },
                ],
              },
            ],
          },
          {
            displayName: 'CSV Delimiter',
            name: 'delimiter',
            type: 'string',
            default: ',',
            displayOptions: {
              show: {
                '/operation': ['normalizeCsv'],
              },
            },
            description: 'CSV delimiter character',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (operation === 'normalizeCsv') {
          const inputData = this.getNodeParameter('inputData', i) as string;
          const options = this.getNodeParameter('options', i, {}) as any;

          const normalized = await normalizeCsvData(inputData, options);
          returnData.push(...normalized);
        } else if (operation === 'normalizeExcel') {
          const binaryProperty = this.getNodeParameter(
            'binaryProperty',
            i
          ) as string;
          const options = this.getNodeParameter('options', i, {}) as any;

          const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
          const buffer = await this.helpers.getBinaryDataBuffer(
            i,
            binaryProperty
          );

          const normalized = await normalizeExcelData(buffer, options);
          returnData.push(...normalized);
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

// Helper functions moved outside the class
function normalizeCsvData(
  inputData: string,
  options: any
): Promise<INodeExecutionData[]> {
  return new Promise((resolve, reject) => {
    try {
      // Detect encoding
      let csvData = inputData;
      if (options.detectEncoding) {
        const buffer = Buffer.from(inputData);
        const encoding = detectEncoding(buffer);
        if (encoding !== 'utf8') {
          csvData = iconv.decode(buffer, encoding);
        }
      }

      // Parse CSV
      const delimiter = options.delimiter || ',';
      const parsed = Papa.parse(csvData, {
        header: true,
        delimiter,
        skipEmptyLines: options.removeEmptyRows !== false,
        transformHeader:
          options.normalizeHeaders !== false
            ? (header: string) => normalizeHeader(header)
            : undefined,
      });

      if (parsed.errors.length > 0) {
        reject(new Error(`CSV parsing error: ${parsed.errors[0].message}`));
        return;
      }

      let data = parsed.data as any[];

      // Apply transformations
      data = applyTransformations(data, options);

      resolve(
        data.map((row) => ({
          json: row,
        }))
      );
    } catch (error) {
      reject(error);
    }
  });
}

function normalizeExcelData(
  buffer: Buffer,
  options: any
): Promise<INodeExecutionData[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      let data = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
      }) as any[];

      // Normalize headers if needed
      if (options.normalizeHeaders !== false) {
        data = data.map((row) => {
          const normalizedRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            normalizedRow[normalizeHeader(key)] = value;
          }
          return normalizedRow;
        });
      }

      // Apply transformations
      data = applyTransformations(data, options);

      resolve(
        data.map((row) => ({
          json: row,
        }))
      );
    } catch (error) {
      reject(error);
    }
  });
}

function applyTransformations(data: any[], options: any): any[] {
  let result = data;

  // Remove empty rows
  if (options.removeEmptyRows !== false) {
    result = result.filter((row) => {
      return Object.values(row).some(
        (val) => val !== '' && val !== null && val !== undefined
      );
    });
  }

  // Trim whitespace
  if (options.trimWhitespace !== false) {
    result = result.map((row) => {
      const trimmedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        trimmedRow[key] = typeof value === 'string' ? value.trim() : value;
      }
      return trimmedRow;
    });
  }

  // Coerce numbers
  if (options.coerceNumbers) {
    result = result.map((row) => {
      const coercedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.trim() !== '') {
          const num = Number(value.replace(/,/g, ''));
          coercedRow[key] = !isNaN(num) ? num : value;
        } else {
          coercedRow[key] = value;
        }
      }
      return coercedRow;
    });
  }

  // Normalize dates
  if (options.normalizeDates) {
    result = result.map((row) => {
      const dateRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        dateRow[key] = normalizeDate(value);
      }
      return dateRow;
    });
  }

  // Apply column mappings
  if (options.columnMappings?.mapping?.length > 0) {
    const mappings: Record<string, string> = {};
    for (const map of options.columnMappings.mapping) {
      if (map.from && map.to) {
        mappings[map.from] = map.to;
      }
    }

    result = result.map((row) => {
      const mappedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        const newKey = mappings[key] || key;
        mappedRow[newKey] = value;
      }
      return mappedRow;
    });
  }

  // Remove empty columns
  if (options.removeEmptyColumns) {
    const columnsToKeep = new Set<string>();
    for (const row of result) {
      for (const [key, value] of Object.entries(row)) {
        if (value !== '' && value !== null && value !== undefined) {
          columnsToKeep.add(key);
        }
      }
    }

    result = result.map((row) => {
      const filteredRow: any = {};
      for (const key of columnsToKeep) {
        filteredRow[key] = row[key];
      }
      return filteredRow;
    });
  }

  return result;
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function detectEncoding(buffer: Buffer): string {
  // Simple encoding detection
  const sample = buffer.slice(0, Math.min(1000, buffer.length));

  // Check for UTF-8 BOM
  if (sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) {
    return 'utf8';
  }

  // Check for UTF-16 BOM
  if (sample[0] === 0xff && sample[1] === 0xfe) {
    return 'utf16le';
  }
  if (sample[0] === 0xfe && sample[1] === 0xff) {
    return 'utf16be';
  }

  // Try to detect if it's valid UTF-8
  try {
    const decoded = iconv.decode(sample, 'utf8');
    // If no replacement characters, likely UTF-8
    if (!decoded.includes('�')) {
      return 'utf8';
    }
  } catch (e) {
    // Not UTF-8
  }

  // Default to Latin-1 (ISO-8859-1) for legacy files
  return 'latin1';
}

function normalizeDate(value: any): any {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed === '') return value;

  // Try to parse various date formats
  const datePatterns = [
    // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY-MM-DD (ISO)
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
    // DD.MM.YYYY (European)
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];

  for (const pattern of datePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      try {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
          // Return ISO format YYYY-MM-DD
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  return value;
}
