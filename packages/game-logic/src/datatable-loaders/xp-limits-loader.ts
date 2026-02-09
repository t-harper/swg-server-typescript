import type { DataTableManager } from '@swg/datatable';

export interface XpLimitsLoadResult {
  limits: Map<string, number>;
  loaded: number;
  errors: string[];
}

export function loadXpLimitsFromDatatable(dtManager: DataTableManager): XpLimitsLoadResult {
  const limits = new Map<string, number>();
  const errors: string[] = [];

  const table = dtManager.getTable('datatables/skill/xp_limits.iff');
  if (!table) {
    errors.push('Failed to load datatables/skill/xp_limits.iff');
    return { limits, loaded: 0, errors };
  }

  for (let i = 0; i < table.rowCount; i++) {
    const name = dtManager.getStringValue(table, 'NAME', i);
    const limit = dtManager.getIntValue(table, 'LIMIT', i);

    if (name) {
      limits.set(name, limit);
    }
  }

  return { limits, loaded: limits.size, errors };
}
