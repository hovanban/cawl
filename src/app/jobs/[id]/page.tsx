import { JobDetail } from "@/components/JobDetail";

type Props = { params: { id: string } };

export default function JobDetailPage({ params }: Props) {
  return (
    <div>
      <JobDetail jobId={params.id} />
    </div>
  );
}
