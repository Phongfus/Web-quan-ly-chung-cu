import { Badge } from 'antd';

interface Props {
  count?: number;
}

const UnreadBadge = ({ count = 0 }: Props) => {
  if (!count) return null;

  return (
    <Badge
      count={count}
      size="small"
      overflowCount={99}
    />
  );
};

export default UnreadBadge;