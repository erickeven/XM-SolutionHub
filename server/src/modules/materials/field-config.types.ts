export interface FieldConfigListItem {
  id: string;
  resourceType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  optionsJson: unknown | null;
  sortOrder: number;
  enabled: boolean;
  validationJson: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFieldConfigInput {
  resourceType?: string;
  fieldKey: string;
  label: string;
  fieldType: 'text' | 'number' | 'single_select' | 'multi_select' | 'boolean';
  required?: boolean;
  optionsJson?: unknown;
  sortOrder?: number;
  enabled?: boolean;
  validationJson?: unknown;
}

export interface UpdateFieldConfigInput {
  label?: string;
  fieldType?: 'text' | 'number' | 'single_select' | 'multi_select' | 'boolean';
  required?: boolean;
  optionsJson?: unknown;
  sortOrder?: number;
  enabled?: boolean;
  validationJson?: unknown;
}