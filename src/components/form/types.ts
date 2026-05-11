import type { RuleItem, ValidateError, ValidateFieldsError } from 'async-validator';

import type { Arrayable, ComponentSize, FieldPath } from '../../types';
import type { formItemValidateStates } from './constants';
import type { EventEmitter } from '@stencil/core';
import type { ReactiveObject } from '../../utils/reactive/ReactiveObject';

export type FormValidationResult = Promise<boolean>;

export type FormValidateCallback = (
  isValid: boolean,
  invalidFields?: ValidateFieldsError,
) => Promise<void> | void;

export type FormItemValidateState = (typeof formItemValidateStates)[number];

export interface FormValidateFailure {
  errors: ValidateError[] | null
  fields: ValidateFieldsError
}

export type FormItemProp = Arrayable<string>

export interface FormItemRule extends RuleItem {
  trigger?: Arrayable<string>;
}

export type FormRules<T extends Record<string, any> | string = string> =
  Partial<Record<T extends string ? T : FieldPath<T>, Arrayable<FormItemRule>>>;

export type FormContext = {
  disabled: boolean | undefined;
  model: Record<string, any> | undefined;
  size: ComponentSize;
  rules: FormRules | undefined;
  labelPosition: 'left' | 'right' | 'top';
  requireAsteriskPosition: 'left' | 'right';
  labelWidth: string | number;
  labelSuffix: string;
  inline: boolean;
  inlineMessage: boolean;
  statusIcon: boolean;
  showMessage: boolean;
  validateOnRuleChange: boolean;
  hideRequiredAsterisk: boolean;
  scrollToError: boolean;
  scrollIntoViewOptions: ScrollIntoViewOptions | boolean;
  validateEvent: EventEmitter<{prop: FormItemProp, isValid: boolean, message: string}> | undefined;
  autoLabelWidth: string;
  registerLabelWidth: (val: number, oldVal: number) => void;
  deregisterLabelWidth: (val: number) => void;
  getField: (prop: FormItemProp) => ReactiveObject<FormItemContext> | undefined
  addField: (field: ReactiveObject<FormItemContext>) => void
  removeField: (field: ReactiveObject<FormItemContext>) => void
  resetFields: (props?: Arrayable<FormItemProp>) => void
  clearValidate: (props?: Arrayable<FormItemProp>) => void
  validateField: (
    props?: Arrayable<FormItemProp>,
    callback?: FormValidateCallback
  ) => FormValidationResult
}
  
export type FormItemContext = {
  formItemRef?: HTMLDivElement | undefined;
  label: string | undefined;
  labelWidth: string | number | undefined;
  labelPosition: 'left' | 'right' | 'top' | '';
  prop: FormItemProp | undefined;
  required: boolean | undefined;
  rules: Arrayable<FormItemRule> | undefined;
  error: string | undefined;
  validateStatus: FormItemValidateState;
  for: string | undefined;
  inlineMessage?: boolean;
  showMessage: boolean;
  size: ComponentSize;
  validateMessage: string;
  validateState: FormItemValidateState;
  isGroup: boolean;
  labelId: string;
  inputIds: string[];
  hasLabel: boolean;
  fieldValue: any;
  propString: string;
  addInputId: (id: string) => void;
  removeInputId: (id: string) => void;
  validate: (
    trigger: string,
    callback?: FormValidateCallback,
  ) => FormValidationResult;
  resetField(): void
  clearValidate(): void
}
