import Header from "./components/Header";
import StatCards from "./components/StatCards";
import AlertBanner from "./components/AlertBanner";
import ProjectTimeline from "./components/ProjectTimeline";
import ResourcePipeline from "./components/ResourcePipeline";
import EmployeeContractTable from "./components/EmployeeContractTable";

export default function GMDashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        {/* Stat Cards */}
        <StatCards />

        {/* Alert Banner */}
        <AlertBanner />

        {/* Project Timeline */}
        <ProjectTimeline />

        {/* Resource Pipeline View */}
        <ResourcePipeline />

        {/* Employee Contract Management */}
        <EmployeeContractTable />
      </div>
    </>
  );
}
