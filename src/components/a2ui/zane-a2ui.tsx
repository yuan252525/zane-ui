import {
  Component,
  Element,
  Event,
  EventEmitter,
  h,
  Host,
  Method,
  Prop,
  State,
  Watch,
} from '@stencil/core';

import { A2uiMessageProcessor } from './utils/A2uiMessageProcessor';
import type {
  AnyComponentNode,
  CustomNode,
  ResolvedMap,
  ResolvedValue,
  ServerToClientMessage,
} from './types';
import { useNamespace } from '../../hooks';

const ns = useNamespace('a2ui');

/**
 * Maps server-driven component type names to their rendered element form.
 * - 'zane:' prefix → zane-* web components
 * - Native HTML tag names (lowercase) → native elements
 * - PascalCase custom types → attempted zane-* mapping
 */
function resolveTagName(type: string): string {
  if (type.startsWith('zane-')) {
    return `zane-${type.slice(5).toLowerCase()}`;
  }

  const nativeTags = new Set([
    'div', 'span', 'p', 'a', 'button', 'input', 'img',
    'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
    'form', 'label', 'select', 'textarea', 'option',
    'hr', 'br', 'pre', 'code', 'blockquote',
  ]);

  const lower = type.toLowerCase();
  if (nativeTags.has(lower)) {
    return lower;
  }

  // Default: treat as potential zane component
  return `zane-${lower}`;
}

/**
 * Filter out internal/reserved keys that should not be passed as DOM attributes.
 */
function isReservedProp(key: string): boolean {
  return (
    key === 'children' ||
    key === 'child' ||
    key === 'slotName' ||
    key.startsWith('dataContext')
  );
}

/**
 * Convert a camelCase or kebab-case property name to its kebab-case attribute form
 * for HTML attributes, and keep camelCase for component properties.
 */
function toAttrName(key: string): string {
  // Already kebab-case
  if (key.includes('-')) return key;
  // Convert camelCase to kebab-case for native HTML attributes
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Build an event handler that emits an A2UI action event.
 */
function buildEventHandler(
  emitter: EventEmitter<any>,
  nodeId: string,
  eventName: string,
): (detail: any) => void {
  return (detail: any) => {
    emitter.emit({
      type: 'event',
      nodeId,
      eventName,
      detail,
    } as A2UiActionEvent);
  };
}

export interface A2UiActionEvent {
  type: 'event';
  nodeId: string;
  eventName: string;
  detail: any;
}

export interface A2UiProcessResult {
  processed: number;
}

@Component({
  styleUrl: 'zane-a2ui.scss',
  tag: 'zane-a2ui',
})
export class ZaneA2ui {
  @Element() el!: HTMLElement;

  /** Identifier for the surface this instance renders */
  @Prop() surfaceId: string | null = null;

  @Prop() messages: ServerToClientMessage[] = [];

  /** The current resolved component tree to render */
  @State() _componentTree: AnyComponentNode | null = null;

  /** Current surface styles as CSS string */
  @State() _styles: string = '';

  /** Emitted when a user interaction event occurs in the rendered tree */
  @Event({ eventName: 'zAction' })
  actionEvent!: EventEmitter<A2UiActionEvent>;

  /** Internal message processor instance */
  private processor: A2uiMessageProcessor;

  constructor() {
    this.processor = new A2uiMessageProcessor();
  }

  /**
   * Push server-to-client messages into the processor and trigger re-render.
   *
   * @example
   * ```ts
   * const a2ui = document.querySelector('zane-a2ui');
   * await a2ui.processMessages([
   *   {
   *     beginRendering: { surfaceId: '@default', root: 'root1' }
   *   },
   *   {
   *     surfaceUpdate: {
   *       surfaceId: '@default',
   *       components: [{ id: 'root1', component: { Div: { children: { explicitList: ['text1'] } } } }]
   *     }
   *   }
   * ]);
   * ```
   */
  @Watch('messages', { immediate: true })
  processMessages() {
    this.processor.processMessages(this.messages);
    this.syncFromProcessor();
  }

  /**
   * Read data from the data model at the given path relative to a node.
   */
  @Method()
  async getData(
    nodeId: string,
    path: string,
  ): Promise<any> {
    // Find node by ID in the current tree
    const node = this.findNodeById(this._componentTree, nodeId);
    if (!node) return null;
    return this.processor.getData(node, path, this.activeSurfaceId);
  }

  /**
   * Write data to the data model at the given path relative to a node.
   */
  @Method()
  async setData(
    nodeId: string,
    path: string,
    value: any,
  ): Promise<void> {
    const node = this.findNodeById(this._componentTree, nodeId);
    this.processor.setData(node, path, value, this.activeSurfaceId);
    this.syncFromProcessor();
  }

  /**
   * Get all current surfaces (for debugging/inspection).
   */
  @Method()
  async getSurfaces(): Promise<ReadonlyMap<string, any>> {
    return this.processor.getSurfaces();
  }

  /**
   * Clear all surfaces and reset state.
   */
  @Method()
  async clear(): Promise<void> {
    this.processor.clearSurfaces();
    this._componentTree = null;
    this._styles = '';
  }

  /** The effective surface ID used for this instance */
  private get activeSurfaceId(): string {
    return this.surfaceId ?? A2uiMessageProcessor.DEFAULT_SURFACE_ID;
  }

  /** Sync internal State from the processor after processing messages */
  private syncFromProcessor(): void {
    const surfaces = this.processor.getSurfaces();
    const surface = surfaces.get(this.activeSurfaceId);

    if (surface) {
      this._componentTree = surface.componentTree;
      this._styles = this.buildStyleString(surface.styles);
    } else {
      this._componentTree = null;
      this._styles = '';
    }
  }

  /** Convert styles record to a CSS string */
  private buildStyleString(styles: Record<string, string>): string {
    if (!styles || Object.keys(styles).length === 0) return '';
    return Object.entries(styles)
      .map(([key, value]) => `${key} { ${value} }`)
      .join('\n');
  }

  /** Find a node by ID in the tree (flat search for now) */
  private findNodeById(root: AnyComponentNode | null, id: string): AnyComponentNode | null {
    if (!root) return null;
    if (root.id === id) return root;
    // BFS search through properties
    const queue: ResolvedValue[] = [root];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current && typeof current === 'object' && 'id' in current && (current as AnyComponentNode).id === id) {
        return current as AnyComponentNode;
      }
      if (current && typeof current === 'object') {
        if (Array.isArray(current)) {
          queue.push(...current);
        } else {
          queue.push(...Object.values(current as Record<string, any>));
        }
      }
    }
    return null;
  }

  /** Render the component tree recursively */
  private renderNode(node: AnyComponentNode): any {
    if (!node) return null;

    const typedNode = node as CustomNode;
    const { type, properties, id } = typedNode;

    // Handle Text node as plain text
    if (type === 'Text' && properties) {
      const textVal = (properties as any)?.text;
      if (typeof textVal === 'string') return textVal;
      if (textVal && typeof textVal === 'object') {
        return textVal.literalString ?? textVal.literal ?? '';
      }
      return '';
    }

    const tagName = resolveTagName(type);
    const childNodes = this.extractChildren(properties);
    const attrs = this.buildAttributes(properties, id);

    const renderedChildren = childNodes.map((child) => this.renderNode(child));
    if (renderedChildren.length === 0) {
      return h(tagName, attrs);
    }
    return (h as any)(tagName, attrs, ...renderedChildren);
  }

  /** Extract child nodes from properties */
  private extractChildren(properties: ResolvedMap | undefined | null): AnyComponentNode[] {
    if (!properties) return [];

    const children: AnyComponentNode[] = [];

    // Check for explicit 'children' property (ComponentArrayReference → resolved to array)
    const childrenProp = properties['children'];
    if (childrenProp && Array.isArray(childrenProp)) {
      for (const item of childrenProp) {
        if (item && typeof item === 'object' && 'type' in item) {
          children.push(item as AnyComponentNode);
        }
      }
    }

    // Check for single 'child' property
    const childProp = properties['child'];
    if (childProp && typeof childProp === 'object' && 'type' in childProp) {
      children.push(childProp as AnyComponentNode);
    }

    return children;
  }

  /** Build VDom attributes/properties from resolved properties, filtering reserved ones */
  private buildAttributes(
    properties: ResolvedMap | undefined | null,
    nodeId: string,
  ): Record<string, any> {
    if (!properties) return {};

    const attrs: Record<string, any> = {};
    attrs['data-a2ui-id'] = nodeId;

    for (const [key, value] of Object.entries(properties)) {
      if (isReservedProp(key)) continue;

      // Skip null/undefined values
      if (value == null) continue;

      // Convert event-like properties (onXxx) into event listeners
      if (key.startsWith('on') && /^[A-Z]/.test(key[2])) {
        const eventName = `${key[2].toLowerCase()}${key.slice(3)}`;
        attrs[key.toLowerCase()] = buildEventHandler(this.actionEvent, nodeId, eventName);
        continue;
      }

      // Convert ResolvedMap objects to JSON strings for attributes, or keep as-is for component props
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Check if it's a StringValue (text primitive)
        if ('literalString' in (value as any) || 'literal' in (value as any)) {
          attrs[toAttrName(key)] = (value as any).literalString ?? (value as any).literal ?? '';
          continue;
        }
        // It's a nested object — pass as a JSON string for data-attributes, skip for now
        continue;
      }

      // Arrays: convert to space-separated string for class-like props, or JSON
      if (Array.isArray(value)) {
        if (key === 'class' || key === 'className') {
          attrs[key] = value.join(' ');
        } else {
          attrs[toAttrName(key)] = JSON.stringify(value);
        }
        continue;
      }

      // Primitive values: pass through
      attrs[toAttrName(key)] = value;
    }

    return attrs;
  }

  render() {
    const content = this._componentTree ? this.renderNode(this._componentTree) : null;

    return (
      <Host class={ns.b()}>
        {this._styles && <style>{this._styles}</style>}
        <div class={ns.e('content')}>
          {content}
        </div>
      </Host>
    );
  }
}
