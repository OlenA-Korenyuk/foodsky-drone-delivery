import ClientOrderHistory from "../components/ClientOrderHistory";

function ClientHistoryPage({ missionHistory, onConfirmDelivery }) {
  return (
    <div className="animate-sys-fade">
      <ClientOrderHistory
        missionHistory={missionHistory}
        onConfirmDelivery={onConfirmDelivery}
      />
    </div>
  );
}

export default ClientHistoryPage;
