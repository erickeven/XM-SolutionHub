import { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignLead } from '../../../api/leads';

interface AssignLeadModalProps {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
}

export function AssignLeadModal({
  open,
  leadId,
  onClose,
}: AssignLeadModalProps) {
  const [staffId, setStaffId] = useState('');
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: ({ id, sid }: { id: string; sid: string }) =>
      assignLead(id, sid),
    onSuccess: () => {
      message.success('分配成功');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setStaffId('');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '分配失败';
      message.error(msg);
    },
  });

  const handleOk = () => {
    if (!leadId || !staffId.trim()) {
      message.warning('请输入用户ID');
      return;
    }
    Modal.confirm({
      title: '确认分配',
      content: '确认将线索分配给该用户？',
      okText: '确认',
      cancelText: '取消',
      onOk: () =>
        assignMutation.mutateAsync({ id: leadId, sid: staffId.trim() }),
    });
  };

  const handleClose = () => {
    setStaffId('');
    onClose();
  };

  return (
    <Modal
      title="分配线索"
      open={open}
      onOk={handleOk}
      onCancel={handleClose}
      confirmLoading={assignMutation.isPending}
      okText="确认分配"
      cancelText="取消"
      destroyOnClose
    >
      <div className="space-y-3 py-2">
        <p className="text-sm text-slate-500">
          输入要分配到的用户ID（staffId）：
        </p>
        <Input
          placeholder="用户ID"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          onPressEnter={handleOk}
        />
      </div>
    </Modal>
  );
}