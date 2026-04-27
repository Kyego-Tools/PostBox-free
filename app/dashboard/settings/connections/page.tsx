import Integrations from "@/components/dashboard/integrations/integrations";
import { PageHeader } from "@/components/dashboard/shared/page-header/page-header";

export default function ConnectionsPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <PageHeader title="Connections" />
      <div className="p-5 space-y-5 mt-13">
        <Integrations />
      </div>
    </div>
  );
}
