# EMBL-EBI MCP Server

Model Context Protocol (MCP) server for EMBL-EBI bioinformatics APIs — InterPro protein domains, Pfam families, protein sequence features, and taxonomy.

## Features

- **Single unified tool** (`embl_data`) with 6 methods
- No API key required — uses public EMBL-EBI APIs
- InterPro domain/family search and lookup
- Pfam protein family search
- Protein sequence feature annotation (domains, sites, regions)
- NCBI taxonomy search

## Installation

```bash
cd embl-mcp-server
npm install
npm run build
```

## Usage

```json
{
  "mcpServers": {
    "embl": {
      "command": "node",
      "args": ["/path/to/embl-mcp-server/build/index.js"]
    }
  }
}
```

## Tool: embl_data

Single unified tool with multiple methods accessed via the `method` parameter.

### Methods

#### 1. search_interpro

Search InterPro protein families and domains.

```json
{
  "method": "search_interpro",
  "query": "kinase",
  "limit": 10
}
```

Returns: accession, name, type (family/domain/repeat), description.

#### 2. get_interpro_entry

Get full InterPro entry details.

```json
{
  "method": "get_interpro_entry",
  "accession": "IPR000719"
}
```

Returns: name, type, description, GO terms, literature references.

#### 3. get_protein_domains

Get all InterPro domains mapped to a UniProt protein.

```json
{
  "method": "get_protein_domains",
  "uniprot_id": "P04637"
}
```

Returns: domain entries with positions on the protein sequence.

#### 4. search_pfam

Search Pfam protein families.

```json
{
  "method": "search_pfam",
  "query": "SH2 domain",
  "limit": 10
}
```

Returns: Pfam accession, name, type, description.

#### 5. get_protein_features

Get all sequence features for a UniProt protein.

```json
{
  "method": "get_protein_features",
  "uniprot_id": "P04637"
}
```

Returns: features array with type, description, location (begin/end), evidence.

#### 6. search_taxonomy

Search NCBI taxonomy via EBI.

```json
{
  "method": "search_taxonomy",
  "query": "homo sapiens",
  "limit": 5
}
```

Returns: taxId, scientificName, displayName.

## Data Source

- **InterPro**: https://www.ebi.ac.uk/interpro/api — 47,000+ protein families/domains
- **Proteins API**: https://www.ebi.ac.uk/proteins/api — sequence features
- **ENA Taxonomy**: https://www.ebi.ac.uk/ena/taxonomy — NCBI taxonomy
- **Rate limits**: No hard limits

## License

MIT
