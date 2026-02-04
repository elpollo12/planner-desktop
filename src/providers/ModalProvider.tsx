import { Modal } from "../components/ui";

interface ModalProviderProps {
  children: React.ReactNode;
}

const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    return (
        <>
            {children}
            <Modal />
        </>
    )
}

export default ModalProvider;