import React from "react";
import { create } from "zustand";

export type ModalContent = React.ReactNode | null;

export interface ModalOptions {
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    closeOnOutsideClick?: boolean;
    closeOnEsc?: boolean;
    onClose?: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showConfirmButton?: boolean;
    showCancelButton?: boolean;
    disableConfirm?: boolean;
    disableCancel?: boolean;
    className?: string;
    disableBodyScroll?: boolean;
}

interface ModalState {
    isOpen: boolean;
    content: ModalContent;
    options: ModalOptions;
    openModal: (content: ModalContent, options?: ModalOptions) => void;
    closeModal: () => void;
    updateOptions: (newOptions: Partial<ModalOptions>) => void;
}

const defaultOptions: ModalOptions = {
    title: '',
    size: 'md',
    showCloseButton: true,
    closeOnOutsideClick: true,
    closeOnEsc: true,
    showConfirmButton: false,
    showCancelButton: false,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    disableConfirm: false,
    disableCancel: false,
    disableBodyScroll: true,
};

export const useModalStore = create<ModalState>((set, get) => ({
    isOpen: false,
    content: null,
    options: defaultOptions,

    openModal: (content: ModalContent, options?: ModalOptions) => {
        set({
            isOpen: true,
            content,
            options: { ...defaultOptions, ...options },
        });
    },

    closeModal: () => {
        const { options } = get();
        options.onClose?.();

        set({
            isOpen: false,
            content: null,
            options: defaultOptions,
        });
    },

    updateOptions: (newOptions: Partial<ModalOptions>) => {
        set((state) => ({
            options: { ...state.options, ...newOptions },
        }));
    },
}));

export const useModal = () => {
    const { openModal, closeModal, updateOptions } = useModalStore();
    return { openModal, closeModal, updateOptions };
};
