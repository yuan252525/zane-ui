import {
  Component,
  Element,
  Event,
  EventEmitter,
  Fragment,
  h,
  Host,
  Method,
  Prop,
  State,
} from "@stencil/core";

import { useNamespace } from "../../hooks";
import classNames from "classnames";
import type {
  UploadChangeOptions,
  UploadFile,
  UploadListType,
  UploadProgressEvent,
  UploadRequestOptions,
  UploadStatus,
} from "./types";



const ns = useNamespace("upload");

let uid = 0;

function genUid(): number {
  return ++uid;
}

@Component({
  styleUrl: "zane-upload.scss",
  tag: "zane-upload",
})
export class ZaneUpload {
  @Prop() action: string = "#";

  @Prop() headers: Record<string, string> = {};

  @Prop() method: string = "post";

  @Prop() multiple: boolean = false;

  @Prop() data: Record<string, unknown> = {};

  @Prop() name: string = "file";

  @Prop() withCredentials: boolean = false;

  @Prop() showFileList: boolean = true;

  @Prop() drag: boolean = false;

  @Prop() accept: string = "";

  @Prop() autoUpload: boolean = true;

  @Prop() disabled: boolean = false;

  @Prop() limit: number;

  @Prop() listType: UploadListType = "text";

  @Prop() httpRequest: (options: UploadRequestOptions) => void | Promise<void>;

  @Prop() beforeUpload: (file: File) => boolean | Promise<void>;

  @Prop() beforeRemove: (file: UploadFile, fileList: UploadFile[]) => boolean | Promise<boolean> | Promise<void>;

  @Element() el: HTMLElement;

  @Event({ eventName: "zChange", bubbles: false })
  changeEvent: EventEmitter<UploadChangeOptions>;

  @Event({ eventName: "zSuccess", bubbles: false })
  successEvent: EventEmitter<{ response: any; file: UploadFile }>;

  @Event({ eventName: "zError", bubbles: false })
  errorEvent: EventEmitter<{ error: Error; file: UploadFile }>;

  @Event({ eventName: "zProgress", bubbles: false })
  progressEvent: EventEmitter<{ percent: number; file: UploadFile }>;

  @Event({ eventName: "zRemove", bubbles: false })
  removeEvent: EventEmitter<UploadFile>;

  @Event({ eventName: "zExceed", bubbles: false })
  exceedEvent: EventEmitter<{ files: File[]; fileList: UploadFile[] }>;

  @Event({ eventName: "zPreview", bubbles: false })
  previewEvent: EventEmitter<UploadFile>;

  @State() fileList: UploadFile[] = [];

  @State() isDragOver: boolean = false;

  private inputRef: HTMLInputElement;

  private xhrMap: Map<number, XMLHttpRequest> = new Map();

  componentWillLoad() {
    this.fileList = [];
  }

  @Method()
  async abort(file?: UploadFile): Promise<void> {
    if (file) {
      const xhr = this.xhrMap.get(file.uid);
      if (xhr) {
        xhr.abort();
        this.xhrMap.delete(file.uid);
      }
    } else {
      this.xhrMap.forEach((xhr) => xhr.abort());
      this.xhrMap.clear();
    }
  }

  @Method()
  async submit(): Promise<void> {
    const readyFiles = this.fileList.filter((f) => f.status === "ready");
    readyFiles.forEach((file) => {
      if (file.raw) {
        this.upload(file.raw);
      }
    });
  }

  @Method()
  async clearFiles(): Promise<void> {
    this.fileList = [];
    this.abort();
  }

  private handleClick = () => {
    if (this.disabled) return;
    this.inputRef?.click();
  };

  private handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const rawFiles = Array.from(files);

    if (this.limit && this.fileList.length + rawFiles.length > this.limit) {
      this.exceedEvent.emit({ files: rawFiles, fileList: [...this.fileList] });
      input.value = "";
      return;
    }

    rawFiles.forEach((raw) => {
      this.handleStart(raw);
    });

    input.value = "";
  };

  private handleStart = (raw: File): void => {
    const uploadFile: UploadFile = {
      name: raw.name,
      size: raw.size,
      status: "ready",
      uid: genUid(),
      raw,
      percentage: 0,
    };

    this.fileList = [...this.fileList, uploadFile];

    if (this.autoUpload) {
      this.upload(raw, uploadFile);
    }
  };

  private upload = async (raw: File, file?: UploadFile): Promise<void> => {
    if (!file) {
      file = this.fileList.find((f) => f.raw === raw);
    }
    if (!file) return;

    if (this.beforeUpload) {
      try {
        const result = this.beforeUpload(raw);
        if (result === false) {
          this.removeFile(file);
          return;
        }
        if (result instanceof Promise) {
          await result;
        }
      } catch {
        this.removeFile(file);
        return;
      }
    }

    this.updateFileStatus(file, "uploading", 0);

    const options: UploadRequestOptions = {
      action: this.action,
      method: this.method,
      data: { ...this.data },
      filename: this.name,
      file: raw,
      headers: this.headers,
      withCredentials: this.withCredentials,
      onError: (evt: Error) => this.handleError(evt, file),
      onProgress: (evt: UploadProgressEvent) => this.handleProgress(evt, file),
      onSuccess: (response: any) => this.handleSuccess(response, file),
    };

    if (this.httpRequest) {
      try {
        await this.httpRequest(options);
      } catch (err) {
        this.handleError(err as Error, file);
      }
    } else {
      this.ajaxUpload(options, file);
    }
  };

  private ajaxUpload = (options: UploadRequestOptions, file: UploadFile): void => {
    const xhr = new XMLHttpRequest();

    this.xhrMap.set(file.uid, xhr);

    if (options.withCredentials && "withCredentials" in xhr) {
      xhr.withCredentials = true;
    }

    xhr.open(options.method, options.action, true);

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.onerror = () => {
      options.onError(new Error("Upload failed"));
    };

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        options.onProgress({ ...e, percent });
      }
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        options.onError(new Error(`Upload failed with status ${xhr.status}`));
      } else {
        let response: any;
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          response = xhr.responseText;
        }
        options.onSuccess(response);
      }
    };

    const formData = new FormData();
    formData.append(options.filename, options.file);

    if (options.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        formData.append(key, value as string | Blob);
      });
    }

    xhr.send(formData);
  };

  private handleSuccess = (response: any, file: UploadFile): void => {
    this.updateFileStatus(file, "success", 100);
    this.successEvent.emit({ response, file });
    this.emitChange(file);
  };

  private handleError = (error: Error, file: UploadFile): void => {
    this.updateFileStatus(file, "fail", file.percentage || 0);
    this.errorEvent.emit({ error, file });
    this.emitChange(file);
  };

  private handleProgress = (evt: UploadProgressEvent, file: UploadFile): void => {
    this.updateFileStatus(file, "uploading", evt.percent);
    this.progressEvent.emit({ percent: evt.percent, file });
  };

  private handleRemove = async (file: UploadFile): Promise<void> => {
    if (this.beforeRemove) {
      try {
        const result = await Promise.resolve(this.beforeRemove(file, [...this.fileList]));
        if (result === false) return;
      } catch {
        return;
      }
    }
    this.removeFile(file);
  };

  private removeFile = (file: UploadFile): void => {
    const xhr = this.xhrMap.get(file.uid);
    if (xhr) {
      xhr.abort();
      this.xhrMap.delete(file.uid);
    }

    this.fileList = this.fileList.filter((f) => f.uid !== file.uid);
    this.removeEvent.emit(file);
    this.emitChange(file);
  };

  private updateFileStatus = (
    file: UploadFile,
    status: UploadStatus,
    percentage: number,
  ): void => {
    this.fileList = this.fileList.map((f) =>
      f.uid === file.uid ? { ...f, status, percentage } : f,
    );
  };

  private emitChange = (file: UploadFile): void => {
    this.changeEvent.emit({ file, fileList: [...this.fileList] });
  };

  private handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (this.disabled) return;
    this.isDragOver = true;
  };

  private handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    this.isDragOver = false;
  };

  private handleDrop = (e: DragEvent) => {
    e.preventDefault();
    this.isDragOver = false;
    if (this.disabled) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const rawFiles = Array.from(files);

    if (this.limit && this.fileList.length + rawFiles.length > this.limit) {
      this.exceedEvent.emit({ files: rawFiles, fileList: [...this.fileList] });
      return;
    }

    rawFiles.forEach((raw) => this.handleStart(raw));
  };

  private handlePreview = (file: UploadFile) => {
    this.previewEvent.emit(file);
  };

  private getStatusIcon = (status: UploadStatus): string => {
    switch (status) {
      case "success":
        return "checkbox-circle-line";
      case "fail":
        return "close-circle-line";
      default:
        return "";
    }
  };

  render() {
    const uploadClasses = classNames(ns.b());

    return (
      <Host class={uploadClasses}>
        <input
          ref={(el) => (this.inputRef = el)}
          type="file"
          class={ns.e("input")}
          accept={this.accept}
          multiple={this.multiple}
          onChange={this.handleFileChange}
        />

        {this.drag ? this.renderDragger() : this.renderTrigger()}

        {this.showFileList && this.listType !== "picture-card" && (
          this.renderFileList()
        )}

        <slot name="tip" />
      </Host>
    );
  }

  private renderTrigger = () => {
    return (
      <div
        class={classNames(ns.e("trigger"))}
        onClick={this.handleClick}
      >
        <slot />
      </div>
    );
  };

  private renderDragger = () => {
    const draggerClasses = classNames(
      ns.e("dragger"),
      ns.is("active", this.isDragOver),
    );

    return (
      <div
        class={draggerClasses}
        onDragOver={this.handleDragOver}
        onDragLeave={this.handleDragLeave}
        onDrop={this.handleDrop}
        onClick={this.handleClick}
      >
        <slot />
      </div>
    );
  };

  private renderFileList = () => {
    if (this.fileList.length === 0) return null;

    const listClasses = classNames(
      ns.b("list"),
      ns.bm("list", this.listType),
      ns.is("picture-card", this.listType === "picture-card"),
    );

    return (
      <div class={listClasses}>
        {this.fileList.map((file) => (
          <div
            key={file.uid}
            class={classNames(
              ns.be("list", "item"),
              ns.is(file.status, !!file.status),
            )}
          >
            <slot name="file" />

            {this.renderFileItemContent(file)}
          </div>
        ))}
      </div>
    );
  };

  private renderFileItemContent = (file: UploadFile) => {
    if (this.listType === "picture" || this.listType === "picture-card") {
      return this.renderPictureItem(file);
    }
    return this.renderTextItem(file);
  };

  private renderTextItem = (file: UploadFile) => {
    const statusIcon = this.getStatusIcon(file.status);

    return (
      <Fragment>
        <a
          class={ns.be("list", "item-name")}
          onClick={() => this.handlePreview(file)}
        >
          <zane-icon name="file-line" class={ns.be("list", "item-icon")} />
          <span class={ns.be("list", "item-text")}>{file.name}</span>
        </a>

        <label class={ns.be("list", "item-status-label")}>
          {statusIcon && <zane-icon name={statusIcon} />}
          {file.status === "uploading" && (
            <zane-icon name="loader-2-line" class={ns.is("loading")} />
          )}
        </label>

        {!this.disabled && (
          <span
            class={ns.be("list", "item-delete")}
            onClick={() => this.handleRemove(file)}
          >
            <zane-icon name="close-line" />
          </span>
        )}
      </Fragment>
    );
  };

  private renderPictureItem = (file: UploadFile) => {
    return (
      <Fragment>
        <div class={ns.be("list", "item-thumbnail")}>
          {file.url ? (
            <img src={file.url} alt={file.name} />
          ) : file.status === "uploading" ? (
            <zane-icon name="loader-2-line" class={ns.is("loading")} />
          ) : (
            <zane-icon name="image-line" />
          )}
        </div>

        <span
          class={ns.be("list", "item-name")}
          onClick={() => this.handlePreview(file)}
        >
          {file.name}
        </span>

        {file.status === "uploading" && (
          <div class={ns.be("list", "item-progress")}>
            <div
              class={ns.be("list", "item-progress-bar")}
              style={{ width: `${file.percentage || 0}%` }}
            />
          </div>
        )}

        <label class={ns.be("list", "item-status-label")}>
          <zane-icon name={this.getStatusIcon(file.status)} />
        </label>

        {!this.disabled && (
          <span
            class={ns.be("list", "item-delete")}
            onClick={() => this.handleRemove(file)}
          >
            <zane-icon name="close-line" />
          </span>
        )}
      </Fragment>
    );
  };
}
