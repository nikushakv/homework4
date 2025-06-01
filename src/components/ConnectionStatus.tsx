import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, Users, Hourglass } from 'lucide-react'; // Added Hourglass

interface ConnectionStatusProps {
  status: 'connecting' | 'waiting' | 'playing' | 'disconnected';
  error?: string;
  message?: string; // <--- ADD THIS LINE
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, error, message }) => {
  if (status === 'playing' && !error && !message) return null; // Don't show if playing and no specific message/error

  const getStatusInfo = () => {
    // Use the provided message if available
    if (message) {
      let icon = <Hourglass className="h-4 w-4" />; // Default icon for custom message
      if (status === 'waiting') icon = <Users className="h-4 w-4" />;
      if (status === 'connecting') icon = <Loader2 className="h-4 w-4 animate-spin" />;
      return {
        icon: icon,
        message: message,
        variant: 'default' as const,
      };
    }

    // Use error if available and status is disconnected
    if (error && status === 'disconnected') {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        message: error,
        variant: 'destructive' as const,
      };
    }

    // Default messages based on status
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
      case 'disconnected': // General disconnect without a specific error prop
        return {
          icon: <WifiOff className="h-4 w-4" />,
          message: 'Disconnected from server.',
          variant: 'destructive' as const,
        };
      // 'playing' status without a message or error is handled by the return null above
      default: // Fallback, should ideally not be reached if 'playing' is handled
        return {
          icon: <Wifi className="h-4 w-4" />,
          message: 'Status: ' + status,
          variant: 'default' as const,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="my-4"> {/* Added some margin */}
      <Alert variant={statusInfo.variant} className="max-w-md mx-auto shadow-md"> {/* Added shadow */}
        <div className="flex items-center space-x-3 p-2"> {/* Added padding and increased space */}
          {statusInfo.icon}
          <AlertDescription className="font-medium">{statusInfo.message}</AlertDescription> {/* Made text medium weight */}
        </div>
      </Alert>
    </div>
  );
};

export default ConnectionStatus;