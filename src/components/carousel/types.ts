export type CarouselContext = {
  items: HTMLZaneCarouselItemElement[];
  rootRef: HTMLElement;
  isCardType: boolean;
  isVertical: boolean;
  loop: boolean;
  cardScale: number;
  setActiveItem: (index: number) => void;
  setContaninerHeight: (height: number) => void;
};
