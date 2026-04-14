import React from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortIconProps {
  sortDirection: SortDirection;
  onSort?: (direction: SortDirection) => void;
  className?: string;
}

const SortIcon: React.FC<SortIconProps> = ({ sortDirection, onSort, className }) => {
  const handleClick = () => {
    if (!onSort) return;

    let newDirection: SortDirection = 'asc';
    if (sortDirection === 'asc') {
      newDirection = 'desc';
    } else if (sortDirection === 'desc') {
      newDirection = null;
    }

    onSort(newDirection);
  };

  const getIcon = () => {
    if (sortDirection === 'asc') {
      return <ArrowUpOutlined style={{ color: '#1890ff', fontSize: 14 }} />;
    } else if (sortDirection === 'desc') {
      return <ArrowDownOutlined style={{ color: '#1890ff', fontSize: 14 }} />;
    } else {
      return <ArrowUpOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />;
    }
  };

  return (
    <span
      className={className}
      style={{ cursor: onSort ? 'pointer' : 'default', marginLeft: 4 }}
      onClick={handleClick}
    >
      {getIcon()}
    </span>
  );
};

export default SortIcon;