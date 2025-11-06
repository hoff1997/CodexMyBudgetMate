import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Envelope {
  id: string;
  name: string;
  current_amount: number;
  budgeted_amount: number;
  icon?: string;
}

interface EnvelopeCardProps {
  envelope: Envelope;
  onClick?: () => void;
}

export default function EnvelopeCard({ envelope, onClick }: EnvelopeCardProps) {
  const budgeted = envelope.budgeted_amount;
  const balance = envelope.current_amount;
  const spent = budgeted - balance;
  const progressPercentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;

  const getStatusBadge = () => {
    if (balance < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Overspent
        </Badge>
      );
    }
    if (balance < budgeted * 0.2) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
        >
          Low Funds
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
      >
        On Track
      </Badge>
    );
  };

  return (
    <div
      className={`bg-muted/50 rounded-lg p-4 border border-border hover:bg-accent/50 hover:shadow-md transition-all ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-lg mr-2">{envelope.icon || "💰"}</span>
          <h3 className="font-medium text-foreground">{envelope.name}</h3>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Balance</span>
          <span
            className={`font-medium ${
              balance < 0
                ? "text-destructive"
                : balance < budgeted * 0.2
                  ? "text-yellow-600"
                  : "text-green-600"
            }`}
          >
            ${balance.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Budgeted</span>
          <span className="text-foreground">${budgeted.toFixed(2)}</span>
        </div>

        <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
      </div>
    </div>
  );
}
