import RestaurantList from "../components/RestaurantList";
import FlightChecklist from "../components/FlightChecklist";
import MapComponent from "../components/MapComponent";

function ClientOrderPage({
  restaurants,
  nfzZones,
  onAddToCart,
  cart,
  onRemoveFromCart,
  deliveryCoords,
  setDeliveryCoords,
  onStartMission,
  isWeatherSafe,
  weatherReason,
  hasAvailableDrones,
}) {
  return (
    <div className="flex flex-col gap-6 animate-sys-fade">
      <div className="w-full h-96 border border-border-color relative overflow-hidden isolate z-10">
        <div className="absolute top-4 left-4 z-400 bg-bg-card/95 border border-accent-secondary px-3 py-2 text-[10px] uppercase font-mono tracking-widest text-accent-secondary backdrop-blur-sm pointer-events-none">
          {deliveryCoords
            ? "🎯 Точку доставки зафіксовано"
            : "Оберіть на мапі точку доставки замовлення клієнта"}
        </div>
        <MapComponent
          restaurants={restaurants}
          nfz={nfzZones}
          deliveryLocation={deliveryCoords}
          onMapClick={setDeliveryCoords}
          activeMission={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-20">
        <div className="lg:col-span-2">
          <RestaurantList restaurants={restaurants} onAddToCart={onAddToCart} />
        </div>
        <div className="lg:col-span-1">
          <FlightChecklist
            cart={cart}
            onRemove={onRemoveFromCart}
            deliveryCoords={deliveryCoords}
            onStartMission={onStartMission}
            isWeatherSafe={isWeatherSafe}
            weatherReason={weatherReason}
            hasAvailableDrones={hasAvailableDrones}
          />
        </div>
      </div>
    </div>
  );
}

export default ClientOrderPage;
