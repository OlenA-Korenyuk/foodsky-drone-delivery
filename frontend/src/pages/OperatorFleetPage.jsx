import OperatorDroneMonitor from "../components/OperatorDroneMonitor";

function OperatorFleetPage({ token }) {
  return (
    <div className="animate-sys-fade">
      <OperatorDroneMonitor token={token} />
    </div>
  );
}

export default OperatorFleetPage;
