import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Select, Space } from 'antd';
import { CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';

export type FilterFieldType = 'text' | 'number' | 'select';

export type FilterOperator = {
  value: string;
  label: string;
};

export type FilterFieldOption = {
  label: string;
  value: string | number;
};

export type FilterFieldDefinition = {
  key: string;
  label: string;
  type: FilterFieldType;
  operators?: FilterOperator[];
  options?: FilterFieldOption[];
};

export type FilterRowItem = {
  id: string;
  field: string;
  operator: string;
  value?: string | number | string[] | number[];
};

export type AdvancedFilterChange = {
  quickSearch: string;
  filters: FilterRowItem[];
};

export interface AdvancedFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  onApply: (value: AdvancedFilterChange) => void;
  onClear?: () => void;
  fields: FilterFieldDefinition[];
  title?: string;
  quickSearchPlaceholder?: string;
  initialQuickSearch?: string;
  initialFilters?: FilterRowItem[];
}

const defaultTextOperators: FilterOperator[] = [
  { value: 'eq', label: 'Bằng' },
  { value: 'ne', label: 'Không bằng' },
  { value: 'contains', label: 'Chứa' },
  { value: 'notContains', label: 'Không chứa' },
  { value: 'isEmpty', label: 'Rỗng' },
  { value: 'isNotEmpty', label: 'Không rỗng' },
];

const defaultNumberOperators: FilterOperator[] = [
  { value: 'eq', label: 'Bằng' },
  { value: 'ne', label: 'Không bằng' },
  { value: 'gt', label: 'Lớn hơn' },
  { value: 'lt', label: 'Nhỏ hơn' },
  { value: 'gte', label: 'Lớn hơn hoặc bằng' },
  { value: 'lte', label: 'Nhỏ hơn hoặc bằng' },
  { value: 'isEmpty', label: 'Rỗng' },
  { value: 'isNotEmpty', label: 'Không rỗng' },
];

const filterKeyToField = (fields: FilterFieldDefinition[], fieldKey: string) =>
  fields.find((field) => field.key === fieldKey) || fields[0];

const createEmptyRow = (fields: FilterFieldDefinition[]): FilterRowItem => {
  const defaultField = fields[0];
  return {
    id: `${Date.now()}-${Math.random()}`,
    field: defaultField.key,
    operator: defaultField.type === 'number' ? 'eq' : 'contains',
    value: undefined,
  };
};

const operatorNeedsValue = (operator: string) => operator !== 'isEmpty' && operator !== 'isNotEmpty';

const getOperatorsForField = (field: FilterFieldDefinition): FilterOperator[] => {
  if (field.operators) {
    return field.operators;
  }
  return field.type === 'number' ? defaultNumberOperators : defaultTextOperators;
};

export default function AdvancedFilterDrawer({
  visible,
  onClose,
  onApply,
  onClear,
  fields,
  title = 'Bộ lọc nâng cao',
  quickSearchPlaceholder = 'Tìm kiếm nhanh',
  initialQuickSearch = '',
  initialFilters = [],
}: AdvancedFilterDrawerProps) {
  const [quickSearch, setQuickSearch] = useState(initialQuickSearch);
  const [rows, setRows] = useState<FilterRowItem[]>(
    initialFilters.length > 0 ? initialFilters : [createEmptyRow(fields)],
  );

  const fieldMap = useMemo(
    () => new Map(fields.map((field) => [field.key, field])),
    [fields],
  );

  const resetState = () => {
    setQuickSearch(initialQuickSearch);
    setRows(initialFilters.length > 0 ? initialFilters : [createEmptyRow(fields)]);
  };

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible, initialQuickSearch, initialFilters, fields]);

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(fields)]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, patch: Partial<FilterRowItem>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              ...patch,
              ...(patch.field
                ? {
                    operator:
                      fieldMap.get(patch.field as string)?.type === 'number'
                        ? 'eq'
                        : 'contains',
                    value: undefined,
                  }
                : {}),
            }
          : row,
      ),
    );
  };

  const handleApply = () => {
    onApply({ quickSearch, filters: rows.filter((row) => row.field && row.operator) });
    onClose();
  };

  const handleClear = () => {
    setQuickSearch('');
    setRows([createEmptyRow(fields)]);
    onClear?.();
  };

  return (
    <Drawer
      title={title}
      placement="right"
      width={560}
      onClose={onClose}
      open={visible}
      bodyStyle={{ paddingBottom: 24 }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Input
          placeholder={quickSearchPlaceholder}
          value={quickSearch}
          onChange={(event) => setQuickSearch(event.target.value)}
          allowClear
        />

        {rows.map((row) => {
          const field = fieldMap.get(row.field) || fields[0];
          const operators = getOperatorsForField(field);
          const showValue = operatorNeedsValue(row.operator);

          return (
            <Space key={row.id} align="start" style={{ width: '100%' }}>
              <Select
                style={{ width: 140 }}
                value={row.field}
                onChange={(value) => updateRow(row.id, { field: value })}
              >
                {fields.map((fieldOption) => (
                  <Select.Option key={fieldOption.key} value={fieldOption.key}>
                    {fieldOption.label}
                  </Select.Option>
                ))}
              </Select>

              <Select
                style={{ width: 140 }}
                value={row.operator}
                onChange={(value) => updateRow(row.id, { operator: value })}
              >
                {operators.map((operator) => (
                  <Select.Option key={operator.value} value={operator.value}>
                    {operator.label}
                  </Select.Option>
                ))}
              </Select>

              {showValue ? (
                field.type === 'number' ? (
                  <InputNumber
                    style={{ width: 180 }}
                    value={typeof row.value === 'number' ? row.value : undefined}
                    onChange={(value) => updateRow(row.id, { value: value ?? undefined })}
                    placeholder="Giá trị"
                  />
                ) : field.type === 'select' ? (
                  <Select
                    style={{ width: 180 }}
                    allowClear
                    value={row.value as string}
                    onChange={(value) => updateRow(row.id, { value })}
                  >
                    {field.options?.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    style={{ width: 180 }}
                    value={row.value as string}
                    onChange={(event) => updateRow(row.id, { value: event.target.value })}
                    placeholder="Giá trị"
                  />
                )
              ) : (
                <div style={{ width: 180 }} />
              )}

              <Button
                type="text"
                icon={<CloseCircleOutlined />}
                onClick={() => removeRow(row.id)}
              />
            </Space>
          );
        })}

        <Button type="dashed" icon={<PlusOutlined />} onClick={addRow} block>
          Thêm điều kiện lọc
        </Button>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleClear}>Xóa bộ lọc</Button>
          <Button type="primary" onClick={handleApply}>Áp dụng</Button>
        </Space>
      </Space>
    </Drawer>
  );
}
