#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const txt = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

const err = (msg: string) => ({
  content: [{ type: 'text' as const, text: msg }],
  isError: true as const,
});

// ---------------------------------------------------------------------------
// API clients
// ---------------------------------------------------------------------------

const interproApi: AxiosInstance = axios.create({
  baseURL: 'https://www.ebi.ac.uk/interpro/api',
  timeout: 30000,
  headers: {
    'User-Agent': 'EMBL-MCP-Server/1.0.0',
    Accept: 'application/json',
  },
});

const proteinsApi: AxiosInstance = axios.create({
  baseURL: 'https://www.ebi.ac.uk/proteins/api',
  timeout: 30000,
  headers: {
    'User-Agent': 'EMBL-MCP-Server/1.0.0',
    Accept: 'application/json',
  },
});

const taxonomyApi: AxiosInstance = axios.create({
  baseURL: 'https://www.ebi.ac.uk/ena/taxonomy/rest',
  timeout: 30000,
  headers: {
    'User-Agent': 'EMBL-MCP-Server/1.0.0',
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Method handlers
// ---------------------------------------------------------------------------

async function searchInterpro(args: any) {
  try {
    const limit = args.limit || 10;
    const response = await interproApi.get('/entry/interpro', {
      params: { search: args.query, page_size: limit },
    });

    if (!response.data || response.status === 204) {
      return txt({ results: [], count: 0 });
    }

    const data = response.data;
    const results = (data.results || []).map((entry: any) => ({
      accession: entry.metadata?.accession,
      name: entry.metadata?.name,
      type: entry.metadata?.type,
      description: entry.metadata?.description?.[0] || null,
      member_databases_count: entry.metadata?.member_databases
        ? Object.keys(entry.metadata.member_databases).length
        : 0,
    }));

    return txt({
      count: data.count || results.length,
      results,
    });
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return txt({ results: [], count: 0 });
    }
    return err(`Error searching InterPro: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getInterproEntry(args: any) {
  try {
    const response = await interproApi.get(`/entry/interpro/${args.accession}`);

    if (!response.data || response.status === 204) {
      return txt(`No InterPro entry found for ${args.accession}`);
    }

    const meta = response.data.metadata || response.data;
    return txt({
      accession: meta.accession,
      name: meta.name,
      type: meta.type,
      description: meta.description || [],
      go_terms: meta.go_terms || [],
      literature: meta.literature ? Object.values(meta.literature) : [],
    });
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return txt(`No InterPro entry found for ${args.accession}`);
    }
    return err(`Error fetching InterPro entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getProteinDomains(args: any) {
  try {
    const response = await interproApi.get(`/entry/interpro/protein/uniprot/${args.uniprot_id}`);

    if (!response.data || response.status === 204) {
      return txt({ uniprot_id: args.uniprot_id, domains: [], count: 0 });
    }

    const data = response.data;
    const domains = (data.results || []).map((entry: any) => ({
      accession: entry.metadata?.accession,
      name: entry.metadata?.name,
      type: entry.metadata?.type,
      proteins: entry.proteins || [],
    }));

    return txt({
      uniprot_id: args.uniprot_id,
      count: data.count || domains.length,
      domains,
    });
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return txt({ uniprot_id: args.uniprot_id, domains: [], count: 0 });
    }
    return err(`Error fetching protein domains: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function searchPfam(args: any) {
  try {
    const limit = args.limit || 10;
    const response = await interproApi.get('/entry/pfam', {
      params: { search: args.query, page_size: limit },
    });

    if (!response.data || response.status === 204) {
      return txt({ results: [], count: 0 });
    }

    const data = response.data;
    const results = (data.results || []).map((entry: any) => ({
      accession: entry.metadata?.accession,
      name: entry.metadata?.name,
      type: entry.metadata?.type,
      description: entry.metadata?.description?.[0] || null,
    }));

    return txt({
      count: data.count || results.length,
      results,
    });
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return txt({ results: [], count: 0 });
    }
    return err(`Error searching Pfam: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getProteinFeatures(args: any) {
  try {
    const response = await proteinsApi.get(`/features/${args.uniprot_id}`);

    if (!response.data || response.status === 204) {
      return txt({ uniprot_id: args.uniprot_id, features: [] });
    }

    const data = response.data;
    const features = (data.features || []).map((f: any) => ({
      type: f.type,
      category: f.category,
      description: f.description,
      begin: f.begin,
      end: f.end,
      evidences: f.evidences || [],
    }));

    return txt({
      uniprot_id: args.uniprot_id,
      accession: data.accession,
      sequence: data.sequence,
      features,
    });
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return txt({ uniprot_id: args.uniprot_id, features: [] });
    }
    return err(`Error fetching protein features: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function searchTaxonomy(args: any) {
  try {
    const response = await taxonomyApi.get(`/suggest-for-search/${encodeURIComponent(args.query)}`);

    if (!response.data || response.status === 204) {
      return txt({ results: [] });
    }

    const data = Array.isArray(response.data) ? response.data : [];
    const limit = args.limit || 10;
    const results = data.slice(0, limit).map((t: any) => ({
      taxId: t.taxId,
      scientificName: t.scientificName,
      displayName: t.displayName,
    }));

    return txt({ results });
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return txt({ results: [] });
    }
    return err(`Error searching taxonomy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ---------------------------------------------------------------------------
// Methods enum
// ---------------------------------------------------------------------------

const METHODS = [
  'search_interpro',
  'get_interpro_entry',
  'get_protein_domains',
  'search_pfam',
  'get_protein_features',
  'search_taxonomy',
] as const;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'embl-server', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'embl_data',
      description:
        'Access EMBL-EBI bioinformatics APIs including InterPro, Pfam, UniProt protein features, and NCBI taxonomy. ' +
        'Use the "method" parameter to select an operation: ' +
        'search_interpro, get_interpro_entry, get_protein_domains, search_pfam, get_protein_features, search_taxonomy.',
      inputSchema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: METHODS as unknown as string[],
            description: 'The operation to perform',
          },
          query: {
            type: 'string',
            description: 'Search term for search_interpro, search_pfam, or search_taxonomy',
          },
          accession: {
            type: 'string',
            description: 'InterPro accession (e.g., "IPR000719") for get_interpro_entry',
          },
          uniprot_id: {
            type: 'string',
            description: 'UniProt accession (e.g., "P04637") for get_protein_domains or get_protein_features',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)',
            minimum: 1,
            maximum: 200,
          },
        },
        required: ['method'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'embl_data') {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments ?? {};
  const method = (args as any).method;

  switch (method) {
    case 'search_interpro':       return searchInterpro(args);
    case 'get_interpro_entry':    return getInterproEntry(args);
    case 'get_protein_domains':   return getProteinDomains(args);
    case 'search_pfam':           return searchPfam(args);
    case 'get_protein_features':  return getProteinFeatures(args);
    case 'search_taxonomy':       return searchTaxonomy(args);
    default:
      throw new McpError(ErrorCode.InvalidParams, `Unknown method: ${method}`);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

server.onerror = (error) => console.error('[MCP Error]', error);
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('EMBL-EBI MCP server running on stdio');
}).catch(console.error);
