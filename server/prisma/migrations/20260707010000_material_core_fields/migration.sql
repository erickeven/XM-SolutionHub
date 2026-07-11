INSERT INTO material_field_configs (
  id,
  "resourceType",
  "fieldKey",
  label,
  "fieldType",
  required,
  "optionsJson",
  "sortOrder",
  enabled,
  "createdAt",
  "updatedAt"
)
VALUES
  (gen_random_uuid(), 'material', 'file',       '文件',     'text',          true,  NULL, 1, true, NOW(), NOW()),
  (gen_random_uuid(), 'material', 'title',      '标题',     'text',          true,  NULL, 2, true, NOW(), NOW()),
  (gen_random_uuid(), 'material', 'type',       '资料类型', 'single_select', true,  '[{"label":"数据手册","value":"datasheet"},{"label":"Demo 报告","value":"demo_report"},{"label":"应用笔记","value":"application_note"},{"label":"其他","value":"other"}]'::jsonb, 3, true, NOW(), NOW()),
  (gen_random_uuid(), 'material', 'status',     '状态',     'single_select', true,  '[{"label":"草稿","value":"DRAFT"},{"label":"上架","value":"ACTIVE"},{"label":"下架","value":"INACTIVE"}]'::jsonb, 4, true, NOW(), NOW()),
  (gen_random_uuid(), 'material', 'solutionId', '所属方案', 'text',          false, NULL, 5, true, NOW(), NOW()),
  (gen_random_uuid(), 'material', 'productId',  '关联产品', 'text',          false, NULL, 6, true, NOW(), NOW())
ON CONFLICT ("resourceType", "fieldKey") DO NOTHING;
