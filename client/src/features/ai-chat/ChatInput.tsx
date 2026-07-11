import { useState, useEffect, useRef } from 'react';
import { Input, Button, Space } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { SendOutlined, StopOutlined, RedoOutlined } from '@ant-design/icons';
import { useUiContent } from '../../api/ui-content';

interface ChatInputProps {
  onSend: (query: string) => void;
  onStop?: () => void;
  onRetry?: () => void;
  disabled?: boolean;
  isStreaming: boolean;
  pendingQuery?: string;
}

export function ChatInput({
  onSend,
  onStop,
  onRetry,
  disabled = false,
  isStreaming,
  pendingQuery,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextAreaRef>(null);
  const { text } = useUiContent();

  useEffect(() => {
    if (pendingQuery !== undefined) {
      setValue(pendingQuery);
      const textArea = inputRef.current?.resizableTextArea?.textArea;
      if (textArea) {
        textArea.focus();
        textArea.setSelectionRange(pendingQuery.length, pendingQuery.length);
      }
    }
  }, [pendingQuery]);

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled && !isStreaming;

  const handleSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        <Input.TextArea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={text('ai.input.placeholder', '输入您的问题，Enter 发送，Shift+Enter 换行')}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={disabled}
          className="!resize-none"
        />
        <Space direction="vertical" size="small" className="shrink-0">
          {isStreaming ? (
            <Button
              icon={<StopOutlined />}
              onClick={onStop}
              danger
              className="!h-10 !w-10"
              title={text('ai.input.stop', '停止生成')}
            />
          ) : pendingQuery ? (
            <Button
              icon={<RedoOutlined />}
              onClick={onRetry}
              type="primary"
              disabled={!canSend}
              className="!h-10 !w-10"
              title={text('common.retry', '重试')}
            />
          ) : (
            <Button
              icon={<SendOutlined />}
              onClick={handleSend}
              type="primary"
              disabled={!canSend}
              className="!h-10 !w-10"
              title={text('ai.input.send', '发送')}
            />
          )}
        </Space>
      </div>
      <div className="mx-auto max-w-4xl pt-1 text-right text-xs text-slate-400">
        {text('ai.input.hint', 'Enter 发送 · Shift+Enter 换行')}
      </div>
    </div>
  );
}
