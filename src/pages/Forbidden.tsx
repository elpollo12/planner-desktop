import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useAuthStore } from '../store/authStore';

export default function Forbidden() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout, isAuthenticated } = useAuthStore();

  return (
    <div
      className="min-h-screen min-w-full flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(/login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <Card className="text-center relative z-10 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-danger-100 dark:bg-danger-900/40 rounded-full flex items-center justify-center">
            <ShieldAlert size={48} className="text-danger-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t('forbidden.title')}
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
          {t('forbidden.subtitle')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          {t('forbidden.message')}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            icon={<LayoutDashboard size={16} />}
            onClick={() => navigate('/dashboard')}
          >
            {t('forbidden.goToDashboard')}
          </Button>
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            {t('forbidden.goBack')}
          </Button>
          {isAuthenticated && (
            <Button
              variant="danger"
              icon={<LogOut size={16} />}
              onClick={logout}
            >
              {t('auth.logout')}
            </Button>
          )}
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-8">
          {t('forbidden.helpText')}
        </p>
      </Card>
    </div>
  );
}
