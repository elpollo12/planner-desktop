import { Card, Button } from '../../ui';
import { ChevronRight } from 'lucide-react';
import { HeaderSection } from './forms/HeaderSection';
import { ReportFormHeaderProps } from '../../../types';

export function ReportFormHeader({ onContinue, isValid, errors }: ReportFormHeaderProps) {
  return (
    <>
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">
              1
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Información del Encabezado
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completa los datos básicos del reporte
              </p>
            </div>
          </div>

          <HeaderSection />
        </div>
      </Card>

      {/* Continue Button */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isValid
                  ? '✅ Encabezado completado. Puedes continuar.'
                  : '⚠️ Completa los campos obligatorios para continuar'
                }
              </p>
              {errors.header && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Hay errores en el encabezado
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={onContinue}
              disabled={!isValid}
              className='flex justify-center items-center'
              icon={<ChevronRight size={20} />}
              iconPosition='right'
            >
              Continuar
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}