# zane-a2ui



<!-- Auto Generated Below -->


## Properties

| Property    | Attribute    | Description                                      | Type                      | Default |
| ----------- | ------------ | ------------------------------------------------ | ------------------------- | ------- |
| `messages`  | --           |                                                  | `ServerToClientMessage[]` | `[]`    |
| `surfaceId` | `surface-id` | Identifier for the surface this instance renders | `string`                  | `null`  |


## Events

| Event     | Description                                                       | Type                           |
| --------- | ----------------------------------------------------------------- | ------------------------------ |
| `zAction` | Emitted when a user interaction event occurs in the rendered tree | `CustomEvent<A2UiActionEvent>` |


## Methods

### `clear() => Promise<void>`

Clear all surfaces and reset state.

#### Returns

Type: `Promise<void>`



### `getData(nodeId: string, path: string) => Promise<any>`

Read data from the data model at the given path relative to a node.

#### Parameters

| Name     | Type     | Description |
| -------- | -------- | ----------- |
| `nodeId` | `string` |             |
| `path`   | `string` |             |

#### Returns

Type: `Promise<any>`



### `getSurfaces() => Promise<ReadonlyMap<string, any>>`

Get all current surfaces (for debugging/inspection).

#### Returns

Type: `Promise<ReadonlyMap<string, any>>`



### `setData(nodeId: string, path: string, value: any) => Promise<void>`

Write data to the data model at the given path relative to a node.

#### Parameters

| Name     | Type     | Description |
| -------- | -------- | ----------- |
| `nodeId` | `string` |             |
| `path`   | `string` |             |
| `value`  | `any`    |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
