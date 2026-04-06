import { Dropdown } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import { createStyles } from 'antd-style';
import { clsx } from 'clsx';
import React from 'react';

const useStyles = createStyles(({ token }) => {
  return {
    dropdown: {
      [`@media screen and (max-width: ${token.screenXS}px)`]: {
        width: '100%',
      },
    },
  };
});

export type HeaderDropdownProps = {
  overlayClassName?: string;
} & DropDownProps;

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  overlayClassName,
  ...restProps
}) => {
  const { styles } = useStyles();

  return (
    <Dropdown
      overlayClassName={clsx(styles.dropdown, overlayClassName)} // ✅ FIX
      {...restProps}
    />
  );
};

export default HeaderDropdown;