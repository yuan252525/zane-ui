import { Component, Event, EventEmitter, Host, Prop, h } from '@stencil/core';

@Component({tag: 'zane-todo-list'})
export class TodoList {
  @Prop() open = false;
  @Prop() showText = ""

  @Event() zaneClick!: EventEmitter<void>;

  handleClick = () => {
    console.log('点击成功了------')
    alert('测试')
    this.zaneClick.emit();
  }

  render() {
    return (
      <Host
        hidden={!this.open}
      >
        <div  onClick={this.handleClick}>测试一下这个组件</div>
        {this.showText}
      </Host>
    )
  }
}
