export type SegmentedOptionValue = string | number | boolean;

export type SegmentedOption =
  | SegmentedOptionValue
  | {
      label?: string;
      value: SegmentedOptionValue;
      disabled?: boolean;
      [key: string]: any;
    };

export type SegmentedOptionProps = {
  label?: string;
  value?: string;
  disabled?: string;
};

export type SegmentedDirection = 'horizontal' | 'vertical';

export type SegmentedThumbState = {
  isInit: boolean;
  width: number;
  height: number;
  translateX: number;
  translateY: number;
  focusVisible: boolean;
};

/**
 * Custom render function for segmented item.
 *
 * ⚠️ The returned HTMLElement content is not sanitized.
 * Only use with trusted data. Do not pass user input directly.
 */
export type RenderItemFunction = (
  item: SegmentedOption,
  index: number,
) => HTMLElement;
