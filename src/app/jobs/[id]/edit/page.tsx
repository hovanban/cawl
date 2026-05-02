import { JobForm } from "@/components/JobForm";

type Props = { params: { id: string } };

export default function EditJobPage({ params }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Job</h1>
      <JobForm jobId={params.id} />
    </div>
  );
}
