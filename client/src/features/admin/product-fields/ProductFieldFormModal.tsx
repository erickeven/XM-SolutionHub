import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import type { FieldConfigItem, FieldType } from '../../../api/admin-product-fields';
import { useCreateFieldConfig, useUpdateFieldConfig } from '../../../api/admin-product-fields';

const { TextArea } = Input;

const FIELD_TYPE_OPTIONS: Array<{ label: string; value: FieldType }> = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '单选', value: 'single_select' },
  { label: '多选', value: 'multi_select' },
  { label: '布尔', value: 'boolean' },
];

interface ProductFieldFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  field: FieldConfigItem | null;
  onClose: () => void;
}

interface FormValues {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  sortOrder: number;
  enabled: boolean;
  optionsJsonText?: string;
  validationJsonText?: string;
}

function parseOptions(text?: string): Array<{ label: string; value: string }> | null {
  if (!text || !text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('必须是数组');
    }
    return parsed.map((item) => {
      if (typeof item === 'string') return { label: item, value: item };
      if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
        return { label: String(item.label), value: String(item.value) };
      }
      throw new Error('每项需包含 label 和 value');
    });
  } catch (e) {
    throw new Error(`选项 JSON 解析失败: ${e instanceof Error ? e.message : '格式错误'}`);
  }
}

function parseValidation(text?: string): Record<string, unknown> | null {
  if (!text || !text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('必须是对象');
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    throw new Error(`校验规则 JSON 解析失败: ${e instanceof Error ? e.message : '格式错误'}`);
  }
}

export function ProductFieldFormModal({
  open,
  mode,
  field,
  onClose,
}: ProductFieldFormModalProps) {
  const [form] = Form.useForm<FormValues>();

  const createMutation = useCreateFieldConfig();
  const updateMutation = useUpdateFieldConfig();

  const selectedType = Form.useWatch('fieldType', form);
  const isSelectType = selectedType === 'single_select' || selectedType === 'multi_select';

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && field) {
        form.setFieldsValue({
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          sortOrder: field.sortOrder,
          enabled: field.enabled,
          optionsJsonText: field.optionsJson ? JSON.stringify(field.optionsJson, null, 2) : '',
          validationJsonText: field.validationJson
            ? JSON.stringify(field.validationJson, null, 2)
            : '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          fieldType: 'text',
          required: false,
          sortOrder: 0,
          enabled: true,
        });
      }
    }
  }, [open, mode, field, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let optionsJson = null;
      let validationJson = null;
      try {
        optionsJson = parseOptions(values.optionsJsonText);
        validationJson = parseValidation(values.validationJsonText);
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'JSON 解析失败');
        return;
      }

      if (mode === 'create') {
        await createMutation.mutateAsync({
          fieldKey: values.fieldKey,
          label: values.label,
          fieldType: values.fieldType,
          required: values.required,
          sortOrder: values.sortOrder,
          enabled: values.enabled,
          optionsJson,
          validationJson,
        });
        message.success('字段创建成功');
      } else if (field) {
        await updateMutation.mutateAsync({
          id: field.id,
          input: {
            label: values.label,
            fieldType: values.fieldType,
            required: values.required,
            sortOrder: values.sortOrder,
            enabled: values.enabled,
            optionsJson,
            validationJson,
          },
        });
        message.success('字段更新成功');
      }
      onClose();
    } catch {
      // validation errors
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={mode === 'create' ? '新建字段' : '编辑字段'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isLoading}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="字段键 (fieldKey)"
          name="fieldKey"
          rules={[
            { required: true, message: '请输入字段键' },
            { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '仅允许字母、数字、下划线，需以字母开头' },
          ]}
        >
          <Input
            placeholder="例如 inputVoltageMin"
            disabled={mode === 'edit'}
          />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            label="显示名称"
            name="label"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如 最小输入电压" />
          </Form.Item>
          <Form.Item
            label="字段类型"
            name="fieldType"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select options={FIELD_TYPE_OPTIONS} />
          </Form.Item>
        </div>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="排序" name="sortOrder" initialValue={0}>
            <InputNumber className="!w-full" min={0} />
          </Form.Item>
          <Form.Item
            label="是否必填"
            name="required"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch checkedChildren="必填" unCheckedChildren="可选" />
          </Form.Item>
        </div>
        <Form.Item label="启用" name="enabled" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
        {isSelectType && (
          <Form.Item
            label="选项 (JSON 数组)"
            name="optionsJsonText"
            help='格式: [{"label":"显示名","value":"值"}] 或 ["选项1","选项2"]'
          >
            <TextArea
              rows={4}
              placeholder='[{"label":"电源适配器","value":"ADAPTER"}]'
            />
          </Form.Item>
        )}
        <Form.Item
          label="校验规则 (JSON 对象)"
          name="validationJsonText"
          help='支持 min/max/minLength/maxLength/pattern，例如 {"min":0,"max":100}'
        >
          <TextArea rows={3} placeholder='{"min":0}' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
