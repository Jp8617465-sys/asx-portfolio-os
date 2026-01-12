import DashboardClient from "../components/DashboardClient";
import PageTransition from "../components/PageTransition";

export default function HomePage() {
  return (
    <PageTransition>
      <DashboardClient />
    </PageTransition>
  );
}
