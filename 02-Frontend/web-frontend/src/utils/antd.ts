import { App } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';

let message: MessageInstance = {
  info: () => ({}),
  success: () => ({}),
  error: () => ({}),
  warning: () => ({}),
  loading: () => ({}),
  open: () => ({}),
} as any;

let modal: Omit<ModalStaticFunctions, 'warn'> = {} as any;
let notification: NotificationInstance = {} as any;

export const AntdStaticHelper = () => {
  const app = App.useApp();
  message = app.message;
  modal = app.modal;
  notification = app.notification;
  return null;
};

export { message, modal, notification };
