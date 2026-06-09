import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';

interface IPGuardStatusData {
  current_ips: number;
  threshold: number;
  strike_count: number;
  strike_threshold: number;
  status: 'normal' | 'warning' | 'danger';
  window_minutes: number;
  strike_window_hours: number;
}

export function IPGuardStatusCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<IPGuardStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIPGuardStatus();
  }, []);

  const fetchIPGuardStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/ip-guard-status', {
        headers: {
          'Content-Type': 'application/json',
          'New-Api-User': String(localStorage.getItem('user_id') || ''),
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'normal':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'danger':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'normal':
        return t('Normal');
      case 'warning':
        return t('Warning');
      case 'danger':
        return t('Danger');
      default:
        return t('Status');
    }
  };

  const getProgressPercentage = () => {
    return Math.min((status.current_ips / status.threshold) * 100, 100);
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'normal':
        return '🛡️';
      case 'warning':
        return '⚠️';
      case 'danger':
        return '🚨';
      default:
        return '🛡️';
    }
  };

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>{getStatusIcon()}</span>
            {t('IP Guard Protection')}
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{t('Current Status')}</span>
              <span className="font-medium">
                {t('{{current}} IPs / {{threshold}} threshold', {
                  current: status.current_ips,
                  threshold: status.threshold,
                })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status.status === 'danger'
                    ? 'bg-red-500'
                    : status.status === 'warning'
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{t('Strike History')}</span>
            <span className="font-medium">
              {t('{{count}} strikes in {{hours}} hours', {
                count: status.strike_count,
                hours: status.strike_window_hours,
              })}
            </span>
          </div>

          {status.status === 'warning' && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
              {t('When {{current}} different IPs are detected within {{window}} minutes, your tokens will be automatically disabled.', {
                current: status.threshold,
                window: status.window_minutes,
              })}
            </div>
          )}

          {status.status === 'danger' && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {t('Your tokens are currently disabled. Please delete and recreate them.')}
            </div>
          )}

          {status.strike_count > 0 && status.status !== 'danger' && (
            <div className="text-xs text-gray-500">
              {t('Reaching {{threshold}} strikes will result in account ban.', {
                threshold: status.strike_threshold,
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
