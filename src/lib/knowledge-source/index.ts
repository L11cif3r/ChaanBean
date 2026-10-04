/**
 * ChaanBean Knowledge Source Query Engine & API Adapter Interface
 */

import { KNOWLEDGE_COMPANIES, type KnowledgeCompany } from "./companies";

export { KNOWLEDGE_COMPANIES, type KnowledgeCompany } from "./companies";

export function getAllKnowledgeEntities(): KnowledgeCompany[] {
  return KNOWLEDGE_COMPANIES;
}

export function getKnowledgeEntityById(id: string): KnowledgeCompany | undefined {
  if (!id) return undefined;
  const clean = id.trim().toLowerCase();
  return KNOWLEDGE_COMPANIES.find((c) => c.id.toLowerCase() === clean);
}

export function getKnowledgeEntityByGstin(gstin: string): KnowledgeCompany | undefined {
  if (!gstin) return undefined;
  const clean = gstin.trim().toUpperCase();
  return KNOWLEDGE_COMPANIES.find((c) => c.gstin.toUpperCase() === clean);
}

export function getKnowledgeEntityByPan(pan: string): KnowledgeCompany | undefined {
  if (!pan) return undefined;
  const clean = pan.trim().toUpperCase();
  return KNOWLEDGE_COMPANIES.find((c) => c.pan.toUpperCase() === clean);
}

export function getKnowledgeEntityByCin(cin: string): KnowledgeCompany | undefined {
  if (!cin) return undefined;
  const clean = cin.trim().toUpperCase();
  return KNOWLEDGE_COMPANIES.find((c) => c.cin.toUpperCase() === clean);
}

/**
 * Universal entity lookup matching by GSTIN, PAN, CIN, ID, or company name
 */
export function findKnowledgeEntity(query: string): KnowledgeCompany | undefined {
  if (!query) return undefined;
  const clean = query.trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  return KNOWLEDGE_COMPANIES.find(
    (c) =>
      c.id === lower ||
      c.gstin.toUpperCase() === upper ||
      c.pan.toUpperCase() === upper ||
      c.cin.toUpperCase() === upper ||
      c.legalName.toLowerCase().includes(lower) ||
      c.tradeName.toLowerCase().includes(lower)
  );
}

/**
 * Multi-result search with fuzzy keyword matching
 */
export function searchKnowledgeSource(query: string): KnowledgeCompany[] {
  if (!query || !query.trim()) {
    return KNOWLEDGE_COMPANIES;
  }

  const term = query.trim().toLowerCase();
  return KNOWLEDGE_COMPANIES.filter(
    (c) =>
      c.legalName.toLowerCase().includes(term) ||
      c.tradeName.toLowerCase().includes(term) ||
      c.gstin.toLowerCase().includes(term) ||
      c.pan.toLowerCase().includes(term) ||
      c.cin.toLowerCase().includes(term) ||
      c.sector.toLowerCase().includes(term) ||
      c.stateName.toLowerCase().includes(term) ||
      c.riskFlag.toLowerCase() === term
  );
}
