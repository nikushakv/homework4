
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, Users } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connecting' | 'waiting' | 'playing' | 'disconnected';
  error?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, error }) => {
  if (status === 'playing') return null;

  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          message: 'Connecting to game server...',
          variant: 'default' as const,
        };
      case 'waiting':
        return {
          icon: <Users className="h-4 w-4" />,
          message: 'Waiting for another player to join...',
          variant: 'default' as const,
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          message: error || 'Disconnected from server',
          variant: 'destructive' as const,
        };
      default:
        return {
          icon: <Wifi className="h-4 w-4" />,
          message: 'Connected',
          variant: 'default' as const,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="mb-6">
      <Alert variant={statusInfo.variant} className="max-w-md mx-auto">
        <div className="flex items-center space-x-2">
          {statusInfo.icon}
          <AlertDescription>{statusInfo.message}</AlertDescription>
        </div>
      </Alert>
    </div>
  );
};

export default ConnectionStatus;
