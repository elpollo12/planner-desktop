import { Modal } from "../components/ui";
import { useModalStore } from "../store";

interface ModalProviderProps {
  children: React.ReactNode;
}

const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    const isOpen = useModalStore((state) => state.isOpen);

    return (
        <>
            <div inert={isOpen || undefined}>
                {children}
            </div>
            <Modal />
        </>
    )
}

export default ModalProvider;