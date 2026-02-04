import { MainLayout } from '../components/layout';
import { ToastContainer, toast } from 'react-toastify';
import { useModal } from '../store/modalStore';
import TestModal from '../components/Modal/TestModal';
import { Button } from '../components/ui';


export default function TestArea() {
  const notify = () => toast.error("Wow so easy!", 
    {
      position: "bottom-right",
      autoClose: 1000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      theme: "colored",
    });

    const { openModal } = useModal();

    const openTestModal = () => {
      openModal(<TestModal />, {
        title: 'Test Modal',
        size: 'full',
        showConfirmButton: true,
        showCancelButton: true,
        disableConfirm: false,
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        onConfirm: () => {
          console.log('Confirmed!');
          notify();
        },
        onClose: () => {
          console.log('Modal closed');
        },
      });
    };

  return (
    <MainLayout title="Área de Pruebas" subtitle="Testing de componentes">
      <div className="space-y-6 m-2">
        <Button 
          variant='danger'
          className='m-2'
          onClick={notify}
        >
          Show Toast
        </Button>
        <ToastContainer />
      </div>
            <div className="space-y-6 m-2">
              <Button
          onClick={openTestModal}
          variant='primary'
        >
          Show Modal
        </Button>
      </div>

    </MainLayout>
  );
}
