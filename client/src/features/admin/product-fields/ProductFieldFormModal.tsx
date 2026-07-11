import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FieldConfigItem, FieldType, FieldOption, FieldValidation } from '../../../api/admin-product-fields';
import { useCreateFieldConfig, useUpdateFieldConfig } from '../../../api/admin-product-fields';

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
  options: FieldOption[];
  validationMin?: number;
  validationMax?: number;
  validationMinLength?: number;
  validationMaxLength?: number;
  validationPattern?: string;
}

function buildValidation(values: FormValues): FieldValidation | null {
  const v: FieldValidation = {};
  if (values.validationMin != null) v.min = values.validationMin;
  if (values.validationMax != null) v.max = values.validationMax;
  if (values.validationMinLength != null) v.minLength = values.validationMinLength;
  if (values.validationMaxLength != null) v.maxLength = values.validationMaxLength;
  if (values.validationPattern && values.validationPattern.trim()) v.pattern = values.validationPattern.trim();
  return Object.keys(v).length > 0 ? v : null;
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
          options: field.optionsJson ?? [],
          validationMin: field.validationJson?.min,
          validationMax: field.validationJson?.max,
          validationMinLength: field.validationJson?.minLength,
          validationMaxLength: field.validationJson?.maxLength,
          validationPattern: field.validationJson?.pattern ?? '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          fieldType: 'text',
          required: false,
          sortOrder: 0,
          enabled: true,
          options: [],
        });
      }
    }
  }, [open, mode, field, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const options = values.options ?? [];
      const optionsJson: FieldOption[] | null =
        isSelectType && options.length > 0 ? options : null;
      const validationJson = buildValidation(values);

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
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
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
          <div className="mb-4 rounded border border-gray-200 p-3">
            <div className="mb-2 text-sm font-medium text-gray-700">选项列表</div>
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <div key={key} className="mb-2 flex items-start gap-2">
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        className="!mb-0 flex-1"
                        rules={[{ required: true, message: '请输入标签' }]}
                      >
                        <Input placeholder="标签" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        className="!mb-0 flex-1"
                        rules={[{ required: true, message: '请输入值' }]}
                      >
                        <Input placeholder="值" />
                      </Form.Item>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(index)}
                        className="mt-1 shrink-0 text-gray-400 hover:text-red-500"
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ label: '', value: '' })}
                    icon={<PlusOutlined />}
                    block
                  >
                    添加选项
                  </Button>
                </>
              )}
            </Form.List>
          </div>
        )}

        <div className="mb-4 rounded border border-gray-200 p-3">
          <div className="mb-2 text-sm font-medium text-gray-700">校验规则</div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item label="最小值" name="validationMin" className="!mb-0">
              <InputNumber className="!w-full" placeholder="min" />
            </Form.Item>
            <Form.Item label="最大值" name="validationMax" className="!mb-0">
              <InputNumber className="!w-full" placeholder="max" />
            </Form.Item>
            <Form.Item label="最小长度" name="validationMinLength" className="!mb-0">
              <InputNumber className="!w-full" min={0} placeholder="minLength" />
            </Form.Item>
            <Form.Item label="最大长度" name="validationMaxLength" className="!mb-0">
              <InputNumber className="!w-full" min={0} placeholder="maxLength" />
            </Form.Item>
          </div>
          <Form.Item label="正则表达式" name="validationPattern" className="!mb-0 mt-3">
            <Input placeholder="例如 ^\d+$" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
