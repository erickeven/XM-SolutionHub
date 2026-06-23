import { Modal, Dropdown, Button, message } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadStatus } from '../../../api/leads';
import type { LeadStatus } from '../../../api/leads';

interface StatusTransitionProps {
  currentStatus: string;
  leadId: string;
  userRole: string;
}

const STATUS_LABEL: Record<string, string> = {
  NEW: '新建',
  ASSIGNED: '已分配',
  FOLLOWING: '跟进中',
  CONVERTED: '已转化',
  ABANDONED: '已放弃',
};

const ALLOWED_TRANSITIONS: Record<string, LeadStatus[]> = {
  NEW: [],
  ASSIGNED: ['FOLLOWING'],
  FOLLOWING: ['CONVERTED', 'ABANDONED'],
  CONVERTED: [],
  ABANDONED: [],
};

export function StatusTransition({
  currentStatus,
  leadId,
  userRole,
}: StatusTransitionProps) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '状态更新失败';
      message.error(msg);
    },
  });

  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  // internal+ can update status, but no transitions available = disabled
  if (userRole !== 'STAFF' && userRole !== 'AUDITOR' && userRole !== 'ADMIN') {
    return null;
  }

  if (allowed.length === 0) {
    return (
      <Button size="small" disabled>
        {STATUS_LABEL[currentStatus] ?? currentStatus}
      </Button>
    );
  }

  const menuItems: MenuProps['items'] = allowed.map((s) => ({
    key: s,
    label: STATUS_LABEL[s] ?? s,
    onClick: () => {
      Modal.confirm({
        title: '确认状态变更',
        content: `确认将线索状态变更为「${STATUS_LABEL[s] ?? s}」？`,
        okText: '确认',
        cancelText: '取消',
        onOk: () =>
          statusMutation.mutateAsync({ id: leadId, status: s }),
      });
    },
  }));

  return (
    <Dropdown menu={{ items: menuItems }}>
      <Button size="small" loading={statusMutation.isPending}>
        {STATUS_LABEL[currentStatus] ?? currentStatus} <DownOutlined />
      </Button>
    </Dropdown>
  );
}