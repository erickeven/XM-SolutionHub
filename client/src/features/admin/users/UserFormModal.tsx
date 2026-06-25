import { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, updateUser } from '../../../api/users';
import { listRoles } from '../../../api/admin-roles';
import type {
  UserListItem,
  CreateUserInput,
  UpdateUserInput,
} from '../../../api/users';

interface UserFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  user: UserListItem | null;
  onClose: () => void;
}

export function UserFormModal({ open, mode, user, onClose }: UserFormModalProps) {
  const [form] = Form.useForm<CreateUserInput & { status?: boolean; roleIds?: string[] }>();
  const queryClient = useQueryClient();

  // Fetch roles for multi-select
  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles-options'],
    queryFn: listRoles,
    staleTime: 5 * 60 * 1000,
  });

  const roleOptions = roles.map((r) => ({ label: r.name, value: r.id }));

  useEffect(() => {
    if (open && mode === 'edit' && user) {
      form.setFieldsValue({
        email: user.email,
        role: user.role,
        roleIds: user.roles ? user.roles.map((r) => r.id) : [],
        status: user.status === 'ACTIVE',
      });
    } else if (open && mode === 'create') {
      form.resetFields();
      form.setFieldsValue({ role: 'USER', roleIds: [], status: true });
    }
  }, [open, mode, user, form]);

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      message.success('用户创建成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '创建失败';
      message.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateUserInput) => {
      if (!user) throw new Error('No user selected');
      return updateUser(user.id, input);
    },
    onSuccess: () => {
      message.success('用户更新成功');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '更新失败';
      message.error(msg);
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'create') {
        createMutation.mutate({
          email: values.email,
          password: values.password,
          role: values.role,
          roleIds: values.roleIds,
        });
      } else {
        const updateData: UpdateUserInput = {
          email: values.email,
          role: values.role,
          roleIds: values.roleIds,
          status: values.status ? 'ACTIVE' : 'INACTIVE',
        };
        updateMutation.mutate(updateData);
      }
    } catch {
      // validation error, form will display it
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={mode === 'create' ? '新建用户' : '编辑用户'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isLoading}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效邮箱' },
          ]}
        >
          <Input placeholder="user@example.com" />
        </Form.Item>

        {mode === 'create' && (
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8位' },
            ]}
          >
            <Input.Password placeholder="至少8位" />
          </Form.Item>
        )}

        <Form.Item
          label="系统角色"
          name="role"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select
            options={[
              { label: '普通用户', value: 'USER' },
              { label: '员工', value: 'STAFF' },
              { label: '审核员', value: 'AUDITOR' },
              { label: '管理员', value: 'ADMIN' },
            ]}
          />
        </Form.Item>

        <Form.Item label="RBAC 角色" name="roleIds">
          <Select
            mode="multiple"
            placeholder="选择角色（可多选）"
            options={roleOptions}
            allowClear
          />
        </Form.Item>

        {mode === 'edit' && (
          <Form.Item label="启用状态" name="status" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
