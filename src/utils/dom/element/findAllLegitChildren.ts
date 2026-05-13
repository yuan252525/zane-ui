/**
 * 查找 HTMLElement 的所有有效子节点
 * @param el - 要遍历的父级 HTMLElement
 * @returns 包含所有有效子节点的数组（元素节点、非空文本节点、CDATA节点等）
 *
 * @remarks
 * 有效子节点包括：
 * - 元素节点 (ELEMENT_NODE)
 * - 非空文本节点 (TEXT_NODE)，包含空白字符但非完全空白的文本节点会被保留
 * - CDATA节点 (CDATA_SECTION_NODE)
 * - 文档片段节点 (DOCUMENT_FRAGMENT_NODE)
 *
 * 被过滤的节点包括：
 * - 注释节点 (COMMENT_NODE)
 * - 空文本节点（无内容或仅空白字符）
 * - 文档类型节点 (DOCUMENT_TYPE_NODE)
 * - 处理指令节点 (PROCESSING_INSTRUCTION_NODE)
 */
export function findAllLegitChildren(el: HTMLElement): ChildNode[] {
  return Array.from(el.childNodes).filter((child) => {
    // 保留元素节点
    if (child.nodeType === Node.ELEMENT_NODE) {
      return true;
    }

    // 处理文本节点：保留包含非空白字符的节点
    if (child.nodeType === Node.TEXT_NODE) {
      return (child.textContent?.trim().length ?? 0) > 0;
    }

    // 可选：保留其他需要支持的节点类型
    if (
      child.nodeType === Node.CDATA_SECTION_NODE ||
      child.nodeType === Node.DOCUMENT_FRAGMENT_NODE
    ) {
      return true;
    }

    // 过滤掉注释节点、文档类型节点等
    return false;
  });
}
