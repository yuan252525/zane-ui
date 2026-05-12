export type MenuMode = 'vertical' | 'horizontal';

export type MenuTrigger = 'hover' | 'click';

export type MenuContext = {
  mode: MenuMode;
  collapse: boolean;
  backgroundColor: string;
  textColor: string;
  activeTextColor: string;
  defaultActive: string;
  defaultOpeneds: string[];
  uniqueOpened: boolean;
  menuTrigger: MenuTrigger;
  activeIndex: string;
  openedMenus: string[];
  registerMenuItem: (item: HTMLZaneMenuItemElement) => void;
  unregisterMenuItem: (item: HTMLZaneMenuItemElement) => void;
  registerSubMenu: (subMenu: HTMLZaneSubMenuElement) => void;
  unregisterSubMenu: (subMenu: HTMLZaneSubMenuElement) => void;
  handleMenuItemClick: (index: string, indexPath: string[]) => void;
  handleSubMenuClick: (index: string, indexPath: string[]) => void;
  handleSubMenuOpen: (index: string, indexPath: string[]) => void;
  handleSubMenuClose: (index: string, indexPath: string[]) => void;
};

export type SubMenuContext = {
  level: number;
  parentIndex: string;
  isOpened: boolean;
};
