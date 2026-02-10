import { Card, Button } from '../../ui';
import { Save, Send, ChevronLeft } from 'lucide-react';
import { ReportFormSectionsProps } from '../../../types';

export function ReportFormSection({
  onSave,
  onSubmit,
  onCancel,
  isSaving,
  isSubmitting,
  canEdit,
}: ReportFormSectionsProps) {
  return (
    <>
      <div className="flex gap-3 justify-end lg:hidden pb-6">
        <Button
          variant="secondary"
          type="button"
          onClick={onSave}
          loading={isSaving}
          disabled={!canEdit}
          className="flex-1"
        >
          Guardar
        </Button>
        <Button
          variant="primary"
          type="submit"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={!canEdit}
          className="flex-1"
        >
          Enviar
        </Button>
      </div>

      <Card>
        <div className="flex justify-end items-end p-6">
          <Button
            variant="danger"
            size='lg'
            type="button"
            className='flex justify-center items-center'
            onClick={onCancel}
            icon={<ChevronLeft size={20} />}
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </>
  );
}