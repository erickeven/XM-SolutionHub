import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Card, Checkbox, message, Spin } from 'antd';
import type { RoleListItem, PermissionItem } from '../../../api/admin-roles';
import {
  useCreateRole,
  useUpdateRole,
  useRole,
  usePermissionList,
  groupPermissionsByResource,
} from '../../../api/admin-roles';

const { TextArea } = Input;

interface RoleFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  role: RoleListItem | null;
  onClose: () => void;
}

interface FormValues {
  name: string;
  description: string;
}

const RESOURCE_GROUP_LABEL: Record<string, string> = {
  admin: '仪表盘',
  products: '产品',
  solutions: '方案',
  materials: '资料',
  knowledge: '知识库',
  users: '用户',
  audit: '审计',
  leads: '线索',
};

const ACTION_LABEL: Record<string, string> = {
  read: '查看',
  write: '编辑',
  delete: '删除',
  manage: '管理',
};

function describePermission(p: PermissionItem): string {
  const actionLabel = ACTION_LABEL[p.action] ?? p.action;
  const groupLabel = RESOURCE_GROUP_LABEL[p.resourceGroup] ?? p.resourceGroup;
  return `${actionLabel}${groupLabel}`;
}

export function RoleFormModal({ open, mode, role, onClose }: RoleFormModalProps) {
  const [form] = Form.useForm<FormValues>();

  const roleDetail = useRole(mode === 'edit' && role ? role.id : null);
  const permissionList = usePermissionList();

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  // Track checked permissions separately (checkbox groups live outside Form to avoid complexity)
  const [checkedPermissions, setCheckedPermissions] = useState<string[]>([]);

  // Group permissions by resource group
  const permissionGroups = useMemo(() => {
    const items = permissionList.data ?? [];
    return groupPermissionsByResource(items);
  }, [permissionList.data]);

  const groupOrder = useMemo(() => {
    return Object.keys(permissionGroups).sort((a, b) => {
      const order = ['admin', 'products', 'solutions', 'materials', 'knowledge', 'users', 'audit', 'leads'];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [permissionGroups]);

  // Reset/populate form when opening
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      form.resetFields();
      setCheckedPermissions([]);
    } else if (role) {
      form.setFieldsValue({
        name: role.name,
        description: role.description,
      });
      // If we have detail, pre-check permissions; otherwise wait for it
      if (roleDetail.data) {
        setCheckedPermissions(roleDetail.data.permissions.map((p) => p.id));
      }
    }
  }, [open, mode, role, roleDetail.data?.id]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (checkedPermissions.length === 0) {
        message.warning('请至少选择一项权限');
        return;
      }

      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          description: values.description?.trim() ?? '',
          permissionIds: checkedPermissions,
        });
        message.success('角色创建成功');
      } else if (role) {
        // For system roles, don't send name/description (they're immutable)
        const isSystem = role.isSystem || roleDetail.data?.isSystem;
        await updateMutation.mutateAsync({
          id: role.id,
          input: isSystem
            ? { permissionIds: checkedPermissions }
            : {
                name: values.name.trim(),
                description: values.description?.trim() ?? '',
                permissionIds: checkedPermissions,
              },
        });
        message.success('角色更新成功');
      }
      onClose();
    } catch {
      // validation errors
    }
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    (mode === 'edit' && roleDetail.isLoading) ||
    permissionList.isLoading;

  const isSystem = (mode === 'edit' && role?.isSystem) || (roleDetail.data?.isSystem ?? false);
  const modalWidth = 720;

  return (
    <Modal
      title={mode === 'create' ? '新建角色' : (isSystem ? `编辑角色（系统内置）` : '编辑角色')}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isLoading}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
      width={modalWidth}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="角色名称"
          name="name"
          rules={[
            { required: true, message: '请输入角色名称' },
            { max: 50, message: '角色名称不超过 50 个字符' },
          ]}
        >
          <Input placeholder="例如 产品运营" maxLength={50} disabled={isSystem} />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <TextArea
            rows={2}
            placeholder="角色职责说明（选填，最多 200 字）"
            maxLength={200}
            showCount
            disabled={isSystem}
          />
        </Form.Item>
      </Form>

      <div className="mb-2 text-sm font-medium text-slate-700">权限配置</div>

      {permissionList.isLoading ? (
        <div className="flex justify-center py-8">
          <Spin tip="加载权限列表..." />
        </div>
      ) : (
        <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
          {groupOrder.map((group) => {
            const perms = permissionGroups[group] ?? [];
            const groupLabel = RESOURCE_GROUP_LABEL[group] ?? group;
            const options = perms.map((p) => ({
              label: `${describePermission(p)}${p.description ? `（${p.description}）` : ''}`,
              value: p.id,
            }));
            const groupChecked = perms.filter((p) => checkedPermissions.includes(p.id)).map((p) => p.id);
            const allChecked = perms.length > 0 && groupChecked.length === perms.length;
            const indeterminate = groupChecked.length > 0 && groupChecked.length < perms.length;

            return (
              <Card
                key={group}
                size="small"
                title={
                  <span className="text-sm font-medium">
                    {groupLabel}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      （{groupChecked.length}/{perms.length}）
                    </span>
                  </span>
                }
                extra={
                  <Checkbox
                    checked={allChecked}
                    indeterminate={indeterminate}
                    onChange={(e) => {
                      const ids = perms.map((p) => p.id);
                      if (e.target.checked) {
                        setCheckedPermissions(Array.from(new Set([...checkedPermissions, ...ids])));
                      } else {
                        setCheckedPermissions(checkedPermissions.filter((id) => !ids.includes(id)));
                      }
                    }}
                  >
                    全选
                  </Checkbox>
                }
                className="!mb-0"
              >
                <Checkbox.Group
                  value={groupChecked}
                  onChange={(checkedValues) => {
                    const newChecked = checkedValues as string[];
                    const groupIds = perms.map((p) => p.id);
                    const remaining = checkedPermissions.filter((id) => !groupIds.includes(id));
                    setCheckedPermissions([...remaining, ...newChecked]);
                  }}
                  options={options}
                  className="!flex !flex-col !gap-1.5"
                />
              </Card>
            );
          })}
        </div>
      )}

      {isSystem && (
        <div className="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          系统内置角色的名称和描述不可修改，仅可调整权限配置。
        </div>
      )}
    </Modal>
  );
}

