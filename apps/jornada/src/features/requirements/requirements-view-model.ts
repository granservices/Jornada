import type { RequirementExpiration } from '../contracts/internal-contracts';

export type RequirementTone = 'neutral' | 'warning' | 'critical';
export type ExpirationType = 'aso' | 'treinamento' | 'documento';
export type RequirementAttention = 'expired' | 'critical' | 'due-soon' | 'upcoming' | 'valid' | 'undated';

export type ExpirationItem = {
  id: string;
  type: ExpirationType;
  title: string;
  owner: string;
  dueLabel: string;
  dueDate: string;
  dueSortOrder: number;
  status: string;
  tone: RequirementTone;
  attention: {
    level: RequirementAttention;
    label: string;
  };
  action: string;
};

type RequirementContract = Omit<RequirementExpiration, 'employeeId'> | RequirementExpiration;

const monthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function toExpirationItems(items: RequirementContract[]): ExpirationItem[] {
  return items.map((item) => ({
    id: item.requirementId,
    type: requirementTypeFromContract(item),
    title: item.title,
    owner: item.issuerLabel,
    dueLabel: requirementDueLabelFromContract(item),
    dueDate: formatRequirementDate(item.expiresAt),
    dueSortOrder: requirementSortOrder(item.expiresAt),
    status: requirementStatusFromContract(item),
    tone: priorityToneFromContract(item.severity),
    attention: requirementAttentionFromContract(item),
    action: item.action.label,
  }))
  .sort((left, right) => left.dueSortOrder - right.dueSortOrder);
}

export function requirementTypeFromContract(item: RequirementContract): ExpirationType {
  if (item.type === 'ASO') {
    return 'aso';
  }

  if (item.type === 'DOCUMENT') {
    return 'documento';
  }

  return 'treinamento';
}

export function requirementDueLabelFromContract(item: RequirementContract) {
  const labels: Record<string, string> = {
    requirement_huet_001: 'vence em 3 dias',
    requirement_aso_001: 'vence em 6 dias',
    requirement_document_001: 'vence em 21 dias',
  };

  if (labels[item.requirementId]) {
    return labels[item.requirementId];
  }

  if (!item.expiresAt) {
    return 'sem vencimento informado';
  }

  const daysToExpire = Math.ceil((Date.parse(item.expiresAt) - Date.now()) / 86_400_000);
  if (daysToExpire < 0) {
    const daysExpired = Math.abs(daysToExpire);
    return `vencido ha ${daysExpired} dia${daysExpired === 1 ? '' : 's'}`;
  }
  if (daysToExpire === 0) {
    return 'vence hoje';
  }
  return `vence em ${daysToExpire} dia${daysToExpire === 1 ? '' : 's'}`;
}

export function requirementAttentionFromContract(item: RequirementContract) {
  if (!item.expiresAt) {
    return { level: 'undated' as const, label: 'sem data' };
  }

  const daysToExpire = Math.ceil((Date.parse(item.expiresAt) - Date.now()) / 86_400_000);
  if (daysToExpire < 0) {
    return { level: 'expired' as const, label: 'vencido' };
  }

  if (daysToExpire <= 7) {
    return { level: 'critical' as const, label: 'proximo do vencimento' };
  }

  if (daysToExpire <= 30) {
    return { level: 'due-soon' as const, label: 'proximo do vencimento' };
  }

  if (daysToExpire <= 120) {
    return { level: 'upcoming' as const, label: 'proximo do vencimento' };
  }

  return { level: 'valid' as const, label: 'em dia' };
}

export function requirementStatusFromContract(item: RequirementContract) {
  if (item.status === 'PENDING' || !item.expiresAt) {
    return 'sem data';
  }

  if (item.status === 'EXPIRED') {
    return 'vencido';
  }

  if (item.severity === 'critical') {
    return 'proximo do vencimento';
  }

  if (item.type === 'ASO' && item.status === 'DUE_SOON') {
    return 'proximo do vencimento';
  }

  if (item.status === 'DUE_SOON') {
    return 'proximo do vencimento';
  }

  return 'ok';
}

export function priorityToneFromContract(priority: 'low' | 'normal' | 'medium' | 'high' | 'critical'): RequirementTone {
  if (priority === 'critical') {
    return 'critical';
  }

  if (priority === 'high') {
    return 'warning';
  }

  return 'neutral';
}

export function formatRequirementDate(value: string | null) {
  if (!value) {
    return 'Sem data';
  }

  const date = new Date(value);
  return `${String(date.getUTCDate()).padStart(2, '0')} ${monthLabels[date.getUTCMonth()].toLocaleLowerCase('pt-BR')}`;
}

function requirementSortOrder(value: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const dateKey = Number(value.slice(0, 10).replace(/-/g, ''));
  return Number.isFinite(dateKey) ? dateKey : Number.MAX_SAFE_INTEGER;
}
