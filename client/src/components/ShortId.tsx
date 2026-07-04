import React from 'react';
import { Tooltip, Typography } from 'antd';

interface ShortIdProps {
  id: string;
  showCopy?: boolean;
}

export const ShortId: React.FC<ShortIdProps> = ({ id, showCopy = true }) => {
  if (id.length < 10) {
    return <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{id}</span>;
  }

  const short = `${id.slice(0, 6)}…${id.slice(-4)}`;

  return (
    <Tooltip title={id}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.85em', color: '#64748b' }}>
          {short}
        </span>
        {showCopy && (
          <Typography.Text
            copyable={{ text: id, tooltips: false }}
            style={{ fontSize: 12 }}
          />
        )}
      </span>
    </Tooltip>
  );
};
