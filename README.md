# n8n-nodes-csv-normalizer

Smart CSV/Excel normalizer for n8n workflows.

![n8n-nodes-mtn-momo](https://img.shields.io/npm/v/n8n-nodes-csv-normalizer)
![npm](https://img.shields.io/npm/dt/n8n-nodes-csv-normalizer)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)


## Features

- Auto-detect file encoding (UTF-8, Latin-1, UTF-16)
- Normalize headers to snake_case
- Remove empty rows and columns
- Trim whitespace from all fields
- Convert dates to ISO format (YYYY-MM-DD)
- Coerce numeric strings to numbers
- Custom column name mappings
- Support for both CSV and Excel files

## Installation

### In n8n (Community Nodes)

1. Go to **Settings** → **Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-csv-normalizer`
4. Click **Install**

### Manual Installation

```bash
npm install n8n-nodes-csv-normalizer
```

## Usage

### Basic CSV Normalization

1. Add "CSV Normalizer" node to your workflow
2. Choose operation: **Normalize CSV**
3. Paste or use expression for CSV data
4. Configure options:
   - ✅ Normalize Headers
   - ✅ Trim Whitespace
   - ✅ Remove Empty Rows

### Excel Normalization

1. Add "CSV Normalizer" node
2. Choose operation: **Normalize Excel**
3. Connect a binary file input
4. Configure normalization options

## Example

**Input CSV:**

```csv
First Name,Last Name,  Email
  John  ,  Doe  ,john@example.com
  Jane  ,  Smith  ,jane@example.com
```

**Output JSON:**

```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  },
  {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com"
  }
]
```

## Options

| Option               | Description                        | Default |
| -------------------- | ---------------------------------- | ------- |
| Normalize Headers    | Convert headers to snake_case      | `true`  |
| Remove Empty Rows    | Remove completely empty rows       | `true`  |
| Remove Empty Columns | Remove completely empty columns    | `false` |
| Trim Whitespace      | Trim whitespace from all fields    | `true`  |
| Detect Encoding      | Auto-detect file encoding          | `true`  |
| Normalize Dates      | Convert dates to ISO format        | `false` |
| Coerce Numbers       | Convert numeric strings to numbers | `false` |
| Column Mappings      | Map column names to new names      | -       |

## License

MIT

## Support

For issues and feature requests, please [open an issue](https://github.com/monfortbrian/n8n-nodes-csv-normalizer/issues).
