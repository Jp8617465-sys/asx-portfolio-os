import PageTransition from "../../components/PageTransition";
import JobsClient from "../../components/JobsClient";

export default function JobsPage() {
  return (
    <PageTransition>
      <JobsClient />
    </PageTransition>
  );
}
