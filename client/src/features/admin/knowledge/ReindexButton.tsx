import { useState } from 'react';
import { Button, Modal, Tooltip, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { reindexKnowledge } from '../../../api/knowledge';
import type { ReindexResponse } from '../../../api/knowledge';

interface ReindexButtonProps {
  docId: string;
  docStatus: string;
  onSuccess?: (response: ReindexResponse) => void;
  size?: 'small' | 'middle' | 'large';
}

export function ReindexButton({
  docId,
  docStatus,
  onSuccess,
  size = 'small',
}: ReindexButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => reindexKnowledge(docId),
    onSuccess: (data: ReindexResponse) => {
      const isExisting =
        data.status === 'PENDING' || data.status === 'PROCESSING';
      if (isExisting) {
        message.success(`索引任务已存在 (jobId: ${data.jobId})`);
      } else {
        message.success(`索引任务已创建 (jobId: ${data.jobId})`);
      }
      onSuccess?.(data);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : '重建索引失败，请重试';
      message.error(msg);
    },
  });

  const isProcessing = docStatus === 'PROCESSING';

  const handleClick = () => {
    if (isProcessing) return;
    setModalOpen(true);
  };

  const handleConfirm = () => {
    mutation.mutate(undefined, {
      onSettled: () => setModalOpen(false),
    });
  };

  if (isProcessing) {
    return (
      <Tooltip title="索引进行中">
        <Button
          size={size}
          icon={<ReloadOutlined />}
          disabled
        >
          重建索引
        </Button>
      </Tooltip>
    );
  }

  return (
    <>
      <Button
        size={size}
        icon={<ReloadOutlined />}
        loading={mutation.isPending}
        onClick={handleClick}
      >
        重建索引
      </Button>
      <Modal
        title="确认重建索引"
        open={modalOpen}
        onOk={handleConfirm}
        onCancel={() => setModalOpen(false)}
        confirmLoading={mutation.isPending}
        okText="确认"
        cancelText="取消"
      >
        <p>确认重建索引？重建期间当前版本仍可正常检索。</p>
      </Modal>
    </>
  );
}