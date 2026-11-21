import React from 'react';
import {
  CheckCircle2,
  Clock,
  PackageCheck,
  PackageSearch,
  Search,
  Wrench,
} from 'lucide-react';
import { getStatusLabel } from '../i18n/translations';
import { Language, RepairStatus } from '../types';

interface StatusBadgeProps {
  status: RepairStatus;
  lang: Language;
}

const STATUS_STYLE: Record<RepairStatus, string> = {
  Pending: 'text-amber-700 dark:text-amber-400',
  Checking: 'text-sky-700 dark:text-sky-400',
  'Waiting for Spare Parts': 'text-orange-700 dark:text-orange-400',
  'Under Repair': 'text-blue-700 dark:text-blue-400',
  Completed: 'text-emerald-700 dark:text-emerald-400',
  Delivered: 'text-slate-600 dark:text-slate-400',
};

const STATUS_ICON: Record<RepairStatus, React.ComponentType<{ className?: string }>> = {
  Pending: Clock,
  Checking: Search,
  'Waiting for Spare Parts': PackageSearch,
  'Under Repair': Wrench,
  Completed: CheckCircle2,
  Delivered: PackageCheck,
};

export const StatusLabel: React.FC<StatusBadgeProps> = ({ status, lang }) => {
  const Icon = STATUS_ICON[status] || Clock;
  const colorClass = STATUS_STYLE[status] || 'text-slate-600 dark:text-slate-400';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${colorClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{getStatusLabel(status, lang)}</span>
    </span>
  );
};
