import { DashboardShell } from "@/components/dashboard-shell";
import { NewInterviewForm } from "@/components/new-interview-form";

export default function NewInterviewPage() {
  return (
    <DashboardShell>
      <div className="space-y-8 w-full">
        <NewInterviewForm />
      </div>
    </DashboardShell>
  );
} 