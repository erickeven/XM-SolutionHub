export interface UiContentItem {
  id: string;
  key: string;
  group: string;
  label: string;
  value: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUiContentInput {
  key: string;
  group: string;
  label: string;
  value: string;
  enabled?: boolean;
}

export interface UpdateUiContentInput {
  group?: string;
  label?: string;
  value?: string;
  enabled?: boolean;
}
