import { JobList } from "@/components/JobList";

export default function JobsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crawl Jobs</h1>
      <JobList />
    </div>
  );
}
