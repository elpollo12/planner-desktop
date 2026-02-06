import { toast as toastify, ToastOptions } from 'react-toastify';

/**
 * Toast wrapper with consistent configuration
 * Uses react-toastify under the hood
 */

const defaultOptions: ToastOptions = {
  position: 'bottom-right',
  autoClose: 2000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    toastify.success(message, { ...defaultOptions, ...options });
  },

  error: (message: string, options?: ToastOptions) => {
    toastify.error(message, { ...defaultOptions, ...options });
  },

  warning: (message: string, options?: ToastOptions) => {
    toastify.warning(message, { ...defaultOptions, ...options });
  },

  info: (message: string, options?: ToastOptions) => {
    toastify.info(message, { ...defaultOptions, ...options });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => {
    return toastify.promise(
      promise,
      messages,
      { ...defaultOptions, ...options }
    );
  },
};
